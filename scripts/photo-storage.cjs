/** Reversible Base64 storage for original photos. This is not encryption. */
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const marker = Buffer.from("WEDDING-PHOTO-BASE64-V1\n");
const hookSignature = "wedding-base64 pre-commit guard";

// Commits without photo changes do not need Node. Photo changes use the same
// validator as the filter, with NUL-delimited paths so any filename is safe.
const preCommitHook = `#!/bin/sh
# ${hookSignature} (installed by scripts/photo-storage.cjs setup)
git diff --cached --quiet --diff-filter=ACMR -- couple-images/
status=$?
case "$status" in
  0) exit 0 ;;
  1) exec node scripts/photo-storage.cjs check-staged ;;
  *) exit "$status" ;;
esac
`;

function git(root, args, input) {
  // Allow large blobs (the originals include a video) when reading objects.
  return execFileSync("git", args, {
    cwd: root,
    input,
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 1024,
  });
}

async function isProjectCheckout(root) {
  try {
    const top = git(root, ["rev-parse", "--show-toplevel"])
      .toString("utf8")
      .trim();
    return (await fs.realpath(top)) === (await fs.realpath(root));
  } catch {
    return false;
  }
}

function isEncoded(bytes) {
  return bytes.subarray(0, marker.length).equals(marker);
}

function decode(bytes) {
  if (!isEncoded(bytes)) return bytes;
  const text = bytes
    .subarray(marker.length)
    .toString("utf8")
    .replace(/\s/g, "");
  const original = Buffer.from(text, "base64");
  if (original.toString("base64") !== text) {
    throw new Error(
      "Invalid Base64 photo data; the file has not been changed.",
    );
  }
  return original;
}

function encode(bytes) {
  // Git may clean an encoded checkout before the local filter is installed.
  const original = decode(bytes);
  const lines = original.toString("base64").match(/.{1,76}/g) || [];
  return Buffer.concat([marker, Buffer.from(lines.join("\n") + "\n")]);
}

function checkStaged(root) {
  const filenames = git(root, [
    "diff",
    "--cached",
    "--name-only",
    "--diff-filter=ACMR",
    "-z",
    "--",
    "couple-images/",
  ])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const invalid = [];
  for (const filename of filenames) {
    const bytes = git(root, ["cat-file", "blob", `:${filename}`]);
    if (!isEncoded(bytes)) {
      invalid.push(
        `${JSON.stringify(filename)}: missing Base64 storage marker`,
      );
      continue;
    }
    try {
      decode(bytes);
    } catch {
      invalid.push(`${JSON.stringify(filename)}: Invalid Base64 photo data`);
    }
  }
  if (invalid.length) {
    throw new Error(
      "Refusing to commit originals with missing or invalid Base64 storage:\n" +
        invalid.map((message) => `  - ${message}`).join("\n") +
        "\nRun 'npm run photos:setup', restore any damaged originals from a valid copy, " +
        "then 'git add couple-images/' and commit again.",
    );
  }
}

async function installHook(root) {
  let hookPath;
  try {
    hookPath = git(root, ["rev-parse", "--git-path", "hooks/pre-commit"])
      .toString("utf8")
      .trim();
  } catch {
    return false;
  }
  const absolute = path.isAbsolute(hookPath)
    ? hookPath
    : path.join(root, hookPath);
  let existing = "";
  try {
    existing = await fs.readFile(absolute, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // Never clobber a pre-commit hook the developer wrote themselves.
  if (existing && !existing.includes(hookSignature)) {
    console.warn(
      "Left the existing pre-commit hook unchanged. To guard couple-images/, " +
        "add 'node scripts/photo-storage.cjs check-staged || exit $?' to that hook.",
    );
    return false;
  }
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, preCommitHook);
  await fs.chmod(absolute, 0o755);
  return true;
}

async function setup(root = path.resolve(__dirname, "..")) {
  git(root, [
    "config",
    "--local",
    "filter.wedding-base64.clean",
    "node scripts/photo-storage.cjs encode",
  ]);
  git(root, [
    "config",
    "--local",
    "filter.wedding-base64.smudge",
    "node scripts/photo-storage.cjs decode",
  ]);
  git(root, ["config", "--local", "filter.wedding-base64.required", "true"]);
  // Guard against committing raw originals if the filter is ever bypassed.
  await installHook(root);

  const filenames = git(root, ["ls-files", "-z", "--", "couple-images/"])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  // Validate every encoded file before restoring any of them. Leave local edits
  // and deleted files alone; only our encoded format needs conversion.
  const pending = [];
  const unchanged = [];
  for (const filename of filenames) {
    const absolute = path.join(root, filename);
    let bytes;
    try {
      bytes = await fs.readFile(absolute);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const original = decode(bytes);
    if (isEncoded(bytes)) pending.push([absolute, original]);
    const indexHash = git(root, ["rev-parse", `:${filename}`]);
    const restoredHash = git(
      root,
      ["hash-object", `--path=${filename}`, "--stdin"],
      original,
    );
    if (indexHash.equals(restoredHash)) unchanged.push(filename);
  }
  for (const [filename, bytes] of pending) await fs.writeFile(filename, bytes);
  // A fresh clone cached the encoded sizes. Refresh only identical blobs, with
  // literal paths and file-mode changes disabled, preserving all staged content
  // and any local photo or permission edits.
  if (unchanged.length) {
    git(root, [
      "--literal-pathspecs",
      "-c",
      "core.fileMode=false",
      "add",
      "--",
      ...unchanged,
    ]);
  }
  return pending.length;
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const command = process.argv[2];
  if (command === "setup") {
    // Archive downloads have no checkout to configure. Do not configure a
    // parent repository when someone unpacks this project inside another repo.
    const auto = process.argv.includes("--auto");
    if (!(await isProjectCheckout(root))) {
      if (!auto)
        throw new Error(
          "Photo setup requires this project's own Git checkout.",
        );
      console.log(
        "No project Git checkout found; skipped wedding-base64 photo-filter setup.",
      );
      return;
    }
    const restored = await setup(root);
    console.log(
      `Photo storage configured. Restored ${restored} local originals.`,
    );
    return;
  }
  if (command === "check-staged") {
    checkStaged(root);
    return;
  }
  if (!["encode", "decode"].includes(command)) {
    throw new Error(
      "Use photo-storage.cjs with setup, encode, decode, or check-staged.",
    );
  }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  process.stdout.write(command === "encode" ? encode(bytes) : decode(bytes));
}

module.exports = { encode, decode, setup, isEncoded, installHook };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
