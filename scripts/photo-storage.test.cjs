const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const { encode, decode, setup } = require("./photo-storage.cjs");

test("image and video bytes survive Base64 storage without changes", () => {
  const bytes = Buffer.from(
    Array.from({ length: 16384 }, (_, index) => index % 256),
  );
  const stored = encode(bytes);
  assert.deepEqual(decode(stored), bytes);
  assert.deepEqual(encode(stored), stored);
  assert.deepEqual(decode(bytes), bytes);
  assert.deepEqual(decode(encode(Buffer.alloc(0))), Buffer.alloc(0));
});

test("invalid encoded content is rejected instead of silently losing data", () => {
  assert.throws(
    () => decode(Buffer.from("WEDDING-PHOTO-BASE64-V1\ninvalid!data\n")),
    /Invalid Base64 photo data/,
  );
});

test("setup restores encoded Git files and preserves existing local edits", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "wedding-photo-storage-"),
  );
  try {
    const git = (...args) => execFileSync("git", args, { cwd: root });
    git("init", "-q");
    await fs.mkdir(path.join(root, "couple-images"));
    await fs.mkdir(path.join(root, "scripts"));
    await fs.copyFile(
      __dirname + "/photo-storage.cjs",
      path.join(root, "scripts/photo-storage.cjs"),
    );
    await fs.writeFile(
      path.join(root, ".gitattributes"),
      "couple-images/** filter=wedding-base64 -diff -text\n",
    );
    const original = Buffer.from([255, 216, 255, 0, 1, 2, 3]);
    const edited = Buffer.from([255, 216, 255, 4, 5, 6]);
    const image = path.join(root, "couple-images", "original.jpeg");
    const local = path.join(root, "couple-images", "edited.jpeg");
    await fs.writeFile(image, encode(original));
    await fs.writeFile(local, original);
    git("add", "couple-images");
    const storedOriginal = git("rev-parse", ":couple-images/original.jpeg");
    const storedLocal = git("rev-parse", ":couple-images/edited.jpeg");
    await fs.writeFile(local, edited);
    assert.equal(await setup(root), 1);
    assert.deepEqual(await fs.readFile(image), original);
    assert.deepEqual(await fs.readFile(local), edited);
    assert.deepEqual(
      git("rev-parse", ":couple-images/original.jpeg"),
      storedOriginal,
    );
    assert.deepEqual(
      git("rev-parse", ":couple-images/edited.jpeg"),
      storedLocal,
    );
    assert.equal(
      git("diff", "--name-only").toString().trim(),
      "couple-images/edited.jpeg",
    );
    assert.equal(await setup(root), 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("setup installs a pre-commit guard that blocks un-encoded originals", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wedding-photo-hook-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: root });
    git("init", "-q");
    await fs.mkdir(path.join(root, "couple-images"));
    await fs.mkdir(path.join(root, "scripts"));
    await fs.copyFile(
      __dirname + "/photo-storage.cjs",
      path.join(root, "scripts/photo-storage.cjs"),
    );
    await fs.writeFile(
      path.join(root, ".gitattributes"),
      "couple-images/** filter=wedding-base64 -diff -text\n",
    );
    await setup(root);

    const hookPath = path.join(root, ".git", "hooks", "pre-commit");
    const hook = await fs.readFile(hookPath, "utf8");
    assert.match(hook, /wedding-base64 pre-commit guard/);

    // Simulate a clone where the filter was never installed: disable the clean
    // filter so `git add` stores the raw bytes, exactly as it would pre-setup.
    git("config", "--local", "--unset", "filter.wedding-base64.required");
    git("config", "--local", "--unset", "filter.wedding-base64.clean");
    const raw = Buffer.from([255, 216, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8]);
    await fs.writeFile(path.join(root, "couple-images", "raw.jpeg"), raw);
    git("add", "couple-images/raw.jpeg");
    assert.throws(() => execFileSync(hookPath, [], { cwd: root }));

    // An already-encoded staged original passes the guard.
    git("rm", "--cached", "-q", "couple-images/raw.jpeg");
    await fs.rm(path.join(root, "couple-images", "raw.jpeg"));
    await fs.writeFile(
      path.join(root, "couple-images", "ok.jpeg"),
      encode(Buffer.from([255, 216, 255, 9, 9, 9])),
    );
    git("add", "couple-images/ok.jpeg");
    assert.doesNotThrow(() => execFileSync(hookPath, [], { cwd: root }));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("a fresh clone stays clean after setup without staging photo or mode edits", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "wedding-photo-clone-"),
  );
  try {
    const source = path.join(directory, "source");
    const clone = path.join(directory, "clone");
    await fs.mkdir(source);
    const git = (root, ...args) => execFileSync("git", args, { cwd: root });
    git(source, "init", "-q");
    await fs.mkdir(path.join(source, "scripts"));
    await fs.mkdir(path.join(source, "couple-images"));
    await fs.copyFile(
      __dirname + "/photo-storage.cjs",
      path.join(source, "scripts/photo-storage.cjs"),
    );
    await fs.writeFile(
      path.join(source, ".gitattributes"),
      "couple-images/** filter=wedding-base64 -diff -text\n",
    );
    const original = Buffer.from([255, 216, 255, 0, 1, 2, 3]);
    for (const name of ["original.jpeg", "edited.jpeg", "mode.jpeg"]) {
      await fs.writeFile(
        path.join(source, "couple-images", name),
        encode(original),
      );
    }
    git(source, "add", ".");
    git(
      source,
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.test",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "-qm",
      "Photo fixture",
    );
    git(directory, "clone", "-q", source, clone);
    git(clone, "config", "core.fileMode", "true");
    const indexBefore = git(clone, "ls-files", "--stage", "-z");
    assert.equal(await setup(clone), 3);
    assert.equal(git(clone, "status", "--porcelain").toString(), "");
    assert.deepEqual(
      await fs.readFile(path.join(clone, "couple-images/original.jpeg")),
      original,
    );
    const edited = Buffer.from([255, 216, 255, 5, 6, 7]);
    await fs.writeFile(path.join(clone, "couple-images/edited.jpeg"), edited);
    await fs.chmod(path.join(clone, "couple-images/mode.jpeg"), 0o755);
    assert.equal(await setup(clone), 0);
    assert.deepEqual(git(clone, "ls-files", "--stage", "-z"), indexBefore);
    assert.deepEqual(
      await fs.readFile(path.join(clone, "couple-images/edited.jpeg")),
      edited,
    );
    assert.deepEqual(
      git(clone, "diff", "--name-only").toString().trim().split("\n"),
      ["couple-images/edited.jpeg", "couple-images/mode.jpeg"],
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("the commit guard handles Odia and unusual filenames and rejects damaged Base64", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wedding-photo-names-"));
  try {
    const git = (...args) => execFileSync("git", args, { cwd: root });
    git("init", "-q");
    await fs.mkdir(path.join(root, "scripts"));
    await fs.mkdir(path.join(root, "couple-images"));
    await fs.copyFile(
      __dirname + "/photo-storage.cjs",
      path.join(root, "scripts/photo-storage.cjs"),
    );
    await fs.writeFile(
      path.join(root, ".gitattributes"),
      "couple-images/** filter=wedding-base64 -diff -text\n",
    );
    await setup(root);
    const hook = path.join(root, ".git/hooks/pre-commit");
    for (const name of [
      "ଫଟୋ.jpeg",
      "a photo.jpeg",
      'quote".jpeg',
      "star*.jpeg",
      "line\nbreak.jpeg",
    ]) {
      await fs.writeFile(
        path.join(root, "couple-images", name),
        Buffer.from([255, 216, 255, 1, 2, 3]),
      );
    }
    git("add", "couple-images");
    const valid = spawnSync(hook, [], { cwd: root, encoding: "utf8" });
    assert.equal(valid.status, 0, valid.stderr);
    git("config", "--unset", "filter.wedding-base64.required");
    git("config", "--unset", "filter.wedding-base64.clean");
    await fs.writeFile(
      path.join(root, "couple-images/ଫଟୋ.jpeg"),
      "WEDDING-PHOTO-BASE64-V1\ninvalid!data\n",
    );
    git("add", "couple-images/ଫଟୋ.jpeg");
    const invalid = spawnSync(hook, [], { cwd: root, encoding: "utf8" });
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /Invalid Base64/);
    assert.match(invalid.stderr, /ଫଟୋ/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("automatic setup skips archive copies without changing a parent repository", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "wedding-photo-archive-"),
  );
  try {
    execFileSync("git", ["init", "-q"], { cwd: root });
    const project = path.join(root, "archive");
    const script = path.join(project, "scripts/photo-storage.cjs");
    await fs.mkdir(path.dirname(script), { recursive: true });
    await fs.copyFile(__dirname + "/photo-storage.cjs", script);
    const before = await fs.readFile(path.join(root, ".git/config"));
    const result = spawnSync(process.execPath, [script, "setup", "--auto"], {
      cwd: project,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No project Git checkout/);
    assert.deepEqual(await fs.readFile(path.join(root, ".git/config")), before);
    await assert.rejects(fs.access(path.join(root, ".git/hooks/pre-commit")), {
      code: "ENOENT",
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("automatic setup reports damaged photos without partially restoring the checkout", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "wedding-photo-damaged-"),
  );
  try {
    const git = (...args) => execFileSync("git", args, { cwd: root });
    git("init", "-q");
    await fs.mkdir(path.join(root, "scripts"));
    await fs.mkdir(path.join(root, "couple-images"));
    const script = path.join(root, "scripts/photo-storage.cjs");
    await fs.copyFile(__dirname + "/photo-storage.cjs", script);
    await fs.writeFile(
      path.join(root, ".gitattributes"),
      "couple-images/** filter=wedding-base64 -diff -text\n",
    );
    const valid = encode(Buffer.from([255, 216, 255, 1, 2, 3]));
    const damaged = Buffer.from("WEDDING-PHOTO-BASE64-V1\ninvalid!data\n");
    await fs.writeFile(path.join(root, "couple-images/a-valid.jpeg"), valid);
    await fs.writeFile(
      path.join(root, "couple-images/z-damaged.jpeg"),
      damaged,
    );
    git("add", "couple-images");
    const result = spawnSync(process.execPath, [script, "setup", "--auto"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid Base64/);
    assert.deepEqual(
      await fs.readFile(path.join(root, "couple-images/a-valid.jpeg")),
      valid,
    );
    assert.deepEqual(
      await fs.readFile(path.join(root, "couple-images/z-damaged.jpeg")),
      damaged,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("setup preserves an existing custom pre-commit hook", async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "wedding-photo-existing-hook-"),
  );
  try {
    const git = (...args) => execFileSync("git", args, { cwd: root });
    git("init", "-q");
    git("config", "core.hooksPath", "custom-hooks");
    await fs.mkdir(path.join(root, "custom-hooks"));
    const hook = path.join(root, "custom-hooks/pre-commit");
    const original = "#!/bin/sh\nexit 0\n";
    await fs.writeFile(hook, original, { mode: 0o755 });
    await setup(root);
    assert.equal(await fs.readFile(hook, "utf8"), original);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
