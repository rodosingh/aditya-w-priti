/** Generate the shareable, two-page A5 invitation from wedding-config.js. */
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

async function main() {
  const root = path.resolve(__dirname, "..");
  const context = { window: {} };
  vm.runInNewContext(
    await fs.readFile(path.join(root, "wedding-config.js"), "utf8"),
    context,
  );
  const c = context.window.WEDDING;
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  const date = (value, options = {}) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: c.timeZone,
      ...options,
    }).format(new Date(value));
  const time = (value) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: c.timeZone,
    }).format(new Date(value));
  const hours = (event) => {
    const start = time(event.start);
    if (!event.end) return `${start} onwards`;
    const end = time(event.end);
    if (end === "12:00 AM") return `${start} – midnight`;
    const overnight = date(event.start) !== date(event.end);
    const ending = overnight
      ? end.endsWith("AM")
        ? " next morning"
        : " next day"
      : "";
    return `${start} – ${end}${ending}`;
  };
  const full = (name, nickname) => `${name}${nickname ? ` (${nickname})` : ""}`;
  const venue = c.venues.find((item) => item.id === c.primaryVenue);
  const names = `${c.couple.first} & ${c.couple.second}`;
  const contact = c.rsvp.phone
    ? `<a href="tel:${escape(c.rsvp.phone)}">${escape(c.rsvp.phoneDisplay || c.rsvp.phone)}</a>`
    : "<p>Contact details are shared privately.</p>";
  const entries = c.schedule
    .map((event, index) => {
      const place = c.venues.find((item) => item.id === event.venueId);
      return `<article class="program-entry"><span class="event-number">0${index + 1}</span><div><p class="event-date">${escape(date(event.start, { weekday: "long" }))}</p><h2>${escape(event.title)}</h2><p class="hours">${escape(hours(event))}</p><a class="venue" href="${escape(place.mapsUrl)}">${escape(place.name)} ↗</a><p class="meals">${escape(event.meals)}</p></div></article>`;
    })
    .join("");
  // Use the webpage's fonts, palette, and actual botanical drawing so the two
  // invitations stay visually consistent when the site's theme changes.
  const siteCSS = await fs.readFile(path.join(root, "styles.css"), "utf8");
  const fonts = [...siteCSS.matchAll(/@font-face\s*\{[^}]+\}/g)]
    .map((match) => match[0])
    .join("\n");
  const palette = siteCSS.match(/:root\s*\{[^}]+\}/)?.[0];
  const pageSource = await fs.readFile(path.join(root, "index.html"), "utf8");
  const botanical = pageSource.match(
    /<symbol id="botanical"[\s\S]*?<\/symbol>/,
  )?.[0];
  if (!fonts || !palette || !botanical)
    throw new Error("The webpage's invitation theme is incomplete.");
  const printCSS = await fs.readFile(
    path.join(__dirname, "invitation.css"),
    "utf8",
  );
  const sprig = (className) =>
    `<svg class="sprig ${className}" viewBox="0 0 180 260" aria-hidden="true"><use href="#botanical" /></svg>`;
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="${pathToFileURL(root + path.sep).href}"><title>${escape(names)} — Wedding Invitation</title><style>${fonts}\n${palette}\n${printCSS}</style></head><body>
  <svg class="svg-defs" aria-hidden="true"><defs>${botanical}</defs></svg>
  <section class="sheet invitation-page" aria-label="Wedding invitation">
    <img class="wheel invitation-wheel" src="assets/ashoka-chakra.svg" alt="">
    <div class="page-content">
      <div class="mantra-frame"><p class="mantra-script" lang="sa">॥ ॐ गं गणपतये नमः ॥</p><p class="mantra-reading">Om Gan Ganapathaye Namah</p></div>
      <div class="invitation-hero">
        <div class="hero-copy">
          <p class="odia invocation" lang="or">ଜୟ ଜଗନ୍ନାଥ</p>
          <p class="eyebrow">AN ODIA WEDDING CELEBRATION</p>
          <h1>${escape(c.couple.first)}<span><em>&</em> ${escape(c.couple.second)}</span></h1>
          <p class="nicknames">${escape(c.couple.groomNickname)} & ${escape(c.couple.brideNickname)}</p>
          <p class="tagline">${escape(c.intro)}</p>
          <p class="wedding-date">${escape(date(c.start, { weekday: "long" }))}</p>
          <p class="hours">${escape(hours(c))} · IST</p>
          <a class="wedding-venue" href="${escape(venue.mapsUrl)}">${escape(venue.name)}</a><p class="address">${escape(venue.address)}</p>
        </div>
        <div class="hero-art">
          <img class="ganesha" src="assets/images/ganesha-sketch.webp" alt="Brown pencil sketch of Lord Ganesha">
          <div class="portrait-frame">${sprig("portrait-sprig-right")}${sprig("portrait-sprig-left")}<img class="couple-photo" data-photo src="${escape(c.photos.hero.src)}" alt="${escape(c.photos.hero.alt)}" style="object-position:${escape(c.photos.hero.position || "center")}"></div>
          <p class="photo-caption">and so, our forever begins</p>
        </div>
      </div>
      <p class="invitation-text">${escape(c.invitation)}</p>
      <div class="family-section">
        <p class="eyebrow">WITH THE BLESSINGS OF OUR FAMILIES</p>
        <div class="families">
          <div><h2>${escape(full(c.couple.first, c.couple.groomNickname))}</h2><p>S/o ${escape(c.couple.groomParents)}</p></div>
          <div class="hand-tie"><p class="odia" lang="or">ଶୁଭ ବିବାହ</p><img src="assets/images/hand-tie-odia.webp" alt="Wedding hand-tie sketch"></div>
          <div><h2>${escape(full(c.couple.second, c.couple.brideNickname))}</h2><p>D/o ${escape(c.couple.brideParents)}</p></div>
        </div>
      </div>
    </div>
    <p class="footer">WITH LOVE, FROM THE SINGH & MOHAPATRA FAMILIES <span>1 / 2</span></p>
  </section>
  <section class="sheet program-page" aria-label="Wedding program and RSVP">
    <img class="wheel program-wheel" src="assets/ashoka-chakra.svg" alt="">${sprig("program-sprig")}
    <div class="page-content">
      <img class="ceremony-knot" src="assets/images/ceremony-knot-cream.webp" alt="Red and cream wedding cloth tied in a knot">
      <p class="eyebrow">${escape(names.toUpperCase())} · OUR WEDDING PROGRAM</p>
      <h1>Traditions, togetherness<br><em>& a lifetime of love.</em></h1>
      <p class="dates">${escape(c.celebrationDates)} · ${escape(c.city)}</p>
      <div class="program">${entries}</div>
      <div class="rsvp"><p class="eyebrow">YOUR PRESENCE IS OUR JOY</p><p>Kindly RSVP by <strong>${escape(c.rsvpDeadline)}</strong></p>${contact}<small>Tap a venue name for directions. All times are in India Standard Time.</small></div>
      <p class="closing">Your presence is our joy. Your blessings, our greatest gift.</p>
    </div>
    <p class="footer">WE LOOK FORWARD TO WELCOMING YOU WITH OUR FAMILIES <span>2 / 2</span></p>
  </section></body></html>`;

  // Embed local raster assets for canvas resizing without relaxing file access.
  for (const source of new Set([
    c.photos.hero.src,
    "assets/images/ganesha-sketch.webp",
    "assets/images/hand-tie-odia.webp",
    "assets/images/ceremony-knot-cream.webp",
  ])) {
    const mime = /\.jpe?g$/i.test(source)
      ? "image/jpeg"
      : /\.png$/i.test(source)
        ? "image/png"
        : "image/webp";
    const bytes = await fs.readFile(path.resolve(root, source));
    html = html.replaceAll(
      `src="${escape(source)}"`,
      `src="data:${mime};base64,${bytes.toString("base64")}"`,
    );
  }
  const temporary = await fs.mkdtemp(
    path.join(os.tmpdir(), "aditya-priti-invitation-"),
  );
  let browser;
  try {
    const preview = path.join(temporary, "invitation.html");
    await fs.writeFile(preview, html);
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });
    await page.goto(pathToFileURL(preview).href);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() =>
      Promise.all([...document.images].map((image) => image.decode())),
    );
    // Keep the portrait compact and retain transparent sketch backgrounds.
    // The botanical drawing and chakra remain vector art in the PDF.
    await page.evaluate(async () => {
      for (const image of document.images) {
        if (!image.src.startsWith("data:image/")) continue;
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(image.naturalWidth, Math.ceil(image.width * 3));
        canvas.height = Math.round(
          (canvas.width * image.naturalHeight) / image.naturalWidth,
        );
        const drawing = canvas.getContext("2d");
        drawing.drawImage(image, 0, 0, canvas.width, canvas.height);
        image.src = canvas.toDataURL(
          image.hasAttribute("data-photo") ? "image/jpeg" : "image/png",
          0.91,
        );
        await image.decode();
      }
    });
    if (process.argv.includes("--preview")) {
      const previews = path.join(root, "test-results/invitation-preview");
      await fs.mkdir(previews, { recursive: true });
      for (const [index, sheet] of (
        await page.locator(".sheet").all()
      ).entries()) {
        await sheet.screenshot({
          path: path.join(previews, `page-${index + 1}.png`),
        });
      }
    }
    const overflow = await page
      .locator(".sheet")
      .evaluateAll((sheets) =>
        sheets.some(
          (sheet) =>
            sheet.scrollHeight > sheet.clientHeight + 1 ||
            sheet.querySelector(".page-content").getBoundingClientRect()
              .bottom >
              sheet.querySelector(".footer").getBoundingClientRect().top - 8,
        ),
      );
    if (overflow) {
      const sizes = await page.locator(".sheet").evaluateAll((sheets) =>
        sheets.map((sheet) => ({
          height: sheet.clientHeight,
          content: sheet.scrollHeight,
          contentBottom:
            sheet.querySelector(".page-content").getBoundingClientRect()
              .bottom - sheet.getBoundingClientRect().top,
          footerTop:
            sheet.querySelector(".footer").getBoundingClientRect().top -
            sheet.getBoundingClientRect().top,
        })),
      );
      throw new Error(
        `Invitation content overflows an A5 page: ${JSON.stringify(sizes)}. Adjust the print layout before publishing.`,
      );
    }
    const output = path.resolve(root, c.invitationPdf);
    await page.pdf({
      path: output,
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
    });
    console.log(
      `Created ${path.relative(root, output)} from wedding-config.js.`,
    );
  } finally {
    await browser?.close();
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
