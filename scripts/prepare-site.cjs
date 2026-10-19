/** Prepare only the files used by the published invitation. */
const fs = require("node:fs/promises");
const path = require("node:path");
const vm = require("node:vm");

async function main() {
  const root = path.resolve(__dirname, "..");
  const destination = path.join(root, "site");
  const context = { window: {} };
  vm.runInNewContext(
    await fs.readFile(path.join(root, "wedding-config.js"), "utf8"),
    context,
  );
  const config = context.window.WEDDING;
  if (
    config.rsvp.mode === "google-sheets" &&
    !/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(
      config.rsvp.endpoint || "",
    )
  ) {
    throw new Error(
      "Connect the Google Sheets RSVP deployment URL before publishing.",
    );
  }
  if (
    config.rsvp.phone ||
    config.rsvp.phoneDisplay ||
    config.contacts.some((contact) => contact.phone)
  ) {
    throw new Error("Keep the private phone fields empty before publishing.");
  }

  const files = new Set([
    "index.html",
    "styles.css",
    "script.js",
    "translations.js",
    "wedding-config.js",
    ".nojekyll",
  ]);
  function addAsset(source) {
    if (
      !/^assets\/[\w./-]+$/.test(source) ||
      source.split("/").includes("..")
    ) {
      throw new Error("Published assets must use local paths inside assets/.");
    }
    files.add(source);
  }

  for (const filename of ["index.html", "styles.css"]) {
    const source = (await fs.readFile(path.join(root, filename), "utf8"))
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of source.matchAll(/assets\/[\w./-]+/g))
      addAsset(match[0]);
  }
  addAsset(config.photos.hero.src);
  for (const photo of config.photos.gallery) addAsset(photo.src);
  addAsset(config.invitationPdf);
  for (const filename of await fs.readdir(path.join(root, "assets/fonts"))) {
    if (filename.startsWith("LICENSE-")) addAsset(`assets/fonts/${filename}`);
  }

  // Validate the sources before replacing the generated output directory.
  for (const filename of files) await fs.access(path.join(root, filename));
  await fs.rm(destination, { recursive: true, force: true });
  for (const filename of files) {
    const target = path.join(destination, filename);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(root, filename), target);
  }
  console.log(`Prepared ${files.size} public files in site/.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
