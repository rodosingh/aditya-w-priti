/** Reversible Base64 storage for original photos. This is not encryption. */
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const marker = Buffer.from("WEDDING-PHOTO-BASE64-V1\n");

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

async function setup(root = path.resolve(__dirname, "..")) {
  const git = (args, input) => execFileSync("git", args, { cwd: root, input });
  git([
    "config",
    "--local",
    "filter.wedding-base64.clean",
    "node scripts/photo-storage.cjs encode",
  ]);
  git([
    "config",
    "--local",
    "filter.wedding-base64.smudge",
    "node scripts/photo-storage.cjs decode",
  ]);
  git(["config", "--local", "filter.wedding-base64.required", "true"]);

  const filenames = git(["ls-files", "-z", "--", "couple-images/"])
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
    const indexHash = git(["rev-parse", `:${filename}`]);
    const restoredHash = git(
      ["hash-object", `--path=${filename}`, "--stdin"],
      original,
    );
    if (indexHash.equals(restoredHash)) unchanged.push(filename);
  }
  for (const [filename, bytes] of pending) await fs.writeFile(filename, bytes);
  // A checkout made before filter setup cached the encoded file sizes. Refresh
  // that cache only for content identical to the index; never stage local edits.
  if (unchanged.length) git(["add", "--", ...unchanged]);
  return pending.length;
}

async function main() {
  const command = process.argv[2];
  if (command === "setup") {
    const restored = await setup();
    console.log(
      `Photo storage configured. Restored ${restored} local originals.`,
    );
    return;
  }
  if (!["encode", "decode"].includes(command)) {
    throw new Error("Use photo-storage.cjs with setup, encode, or decode.");
  }
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  process.stdout.write(command === "encode" ? encode(bytes) : decode(bytes));
}

module.exports = { encode, decode, setup, isEncoded };

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
