const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
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
