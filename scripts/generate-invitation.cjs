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
  const hours = (event) =>
    event.end
      ? `${time(event.start)} – ${time(event.end)}${date(event.start) !== date(event.end) ? ` (${date(event.end, { month: "short", year: undefined })})` : ""}`
      : `${time(event.start)} onwards`;
  const full = (name, nickname) => `${name}${nickname ? ` (${nickname})` : ""}`;
  const venue = c.venues.find((item) => item.id === c.primaryVenue);
  const names = `${c.couple.first} & ${c.couple.second}`;
  const contact = c.rsvp.phone
    ? `<a href="tel:${escape(c.rsvp.phone)}">${escape(c.rsvp.phoneDisplay || c.rsvp.phone)}</a>`
    : "<p>Contact details are shared privately.</p>";
  const entries = c.schedule
    .map((event) => {
      const place = c.venues.find((item) => item.id === event.venueId);
      return `<article class="program-entry"><p class="event-date">${escape(date(event.start, { weekday: "long" }))}</p><h2>${escape(event.title)}</h2><p class="hours">${escape(hours(event))}</p><a class="venue" href="${escape(place.mapsUrl)}">${escape(place.name)} ↗</a><p class="meals">${escape(event.meals)}</p></article>`;
    })
    .join("");
  let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="${pathToFileURL(root + path.sep).href}"><title>${escape(names)} — Wedding Invitation</title><style>
    @font-face{font-family:InvitationSerif;src:url('assets/fonts/display-regular.woff2')}@font-face{font-family:InvitationSerif;src:url('assets/fonts/display-italic.woff2');font-style:italic}@font-face{font-family:InvitationSans;src:url('assets/fonts/body-regular.woff2')}@font-face{font-family:InvitationOdia;src:url('assets/fonts/odia.woff2')}
    @page{size:A5 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#f4f0e3;color:#7b6952;font-family:InvitationSans,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}p,h1,h2{margin:0}a{color:inherit;text-decoration:none}img{display:block;object-fit:cover}.sheet{width:148mm;height:209.5mm;padding:12mm 13mm;position:relative;break-after:page;text-align:center;overflow:hidden}.sheet:last-child{break-after:auto}.sheet:before,.sheet:after{content:'';position:absolute;inset:6mm;border:1px solid #bba47c;pointer-events:none}.sheet:after{inset:7.3mm;border-color:#ddcfb5}.odia{font-family:InvitationOdia,serif;font-size:20px;line-height:1.65}.eyebrow{font-size:9px;letter-spacing:2px;line-height:1.6}.sacred-row{height:124px;display:flex;align-items:center;justify-content:center;gap:27px;margin:8px 0 12px}.couple-photo{width:104px;height:124px;border-radius:70px 70px 2px 2px;border:3px solid #f4f0e3;outline:1px solid #c2ab80;object-position:center 35%}.ganesha{width:76px;height:76px;border-radius:50%;mix-blend-mode:multiply}.jagannath{width:61px;height:108px;border-radius:40px 40px 2px 2px}h1{font:52px/1.1 InvitationSerif,serif;letter-spacing:-1.5px;margin:6px 0 10px}h1 em{font-size:40px}.families{display:grid;grid-template-columns:1fr 1fr;margin:0 0 12px;gap:20px}.families>div+div{border-left:1px solid #d7c7a9;padding-left:16px}.families h2{font:24px/1.15 InvitationSerif,serif;margin-bottom:5px}.families p{font-size:11.5px;line-height:1.7}.invitation-text{font-size:11.5px;line-height:1.8;max-width:390px;margin:auto}.wedding-date{font:italic 26px/1.3 InvitationSerif,serif;margin-top:15px}.wedding-time{font-size:12px;line-height:1.7;margin-top:4px}.wedding-venue{display:block;font:25px/1.2 InvitationSerif,serif;margin-top:13px}.address{font-size:11px;line-height:1.7;margin-top:5px}.closing{font:italic 16px/1.4 InvitationSerif,serif;margin-top:11px}.footer{position:absolute;bottom:11mm;left:13mm;right:13mm;font-size:9px;letter-spacing:.5px}.program-page{padding-top:13mm}.program-page .wheel{position:absolute;width:260px;height:260px;right:-105px;top:90px;opacity:.055;z-index:0}.program-page h1{font-size:40px;line-height:1.04;margin:8px 0 7px}.program-page .dates{font-size:11px;margin-bottom:10px}.program{position:relative}.program-entry{padding:8px 0 10px;border-bottom:1px solid #d7c7a9}.program-entry:first-child{border-top:1px solid #d7c7a9}.event-date{font-size:10px;letter-spacing:.8px}.program-entry h2{font:27px/1.1 InvitationSerif,serif;margin:5px 0 6px}.hours{font-size:12px}.venue{display:inline-block;font-size:12px;margin-top:5px;text-decoration:underline;text-underline-offset:3px}.meals{font-size:10.5px;line-height:1.5;margin:6px auto 0;max-width:360px}.rsvp{margin-top:13px}.rsvp p{font-size:12px;line-height:1.6}.rsvp a{font:26px/1.3 InvitationSerif,serif;display:inline-block;margin:6px 0}.rsvp small{display:block;font-size:10px;line-height:1.6}.program-page .footer{font-size:9px}
  </style></head><body>
  <section class="sheet" aria-label="Wedding invitation">
    <p class="odia" lang="or">ଜୟ ଜଗନ୍ନାଥ · ଶୁଭ ବିବାହ</p>
    <div class="sacred-row"><img class="ganesha" src="assets/images/ganesha.webp" alt="Lord Ganesha"><img class="couple-photo" src="${escape(c.photos.hero.src)}" alt="${escape(c.photos.hero.alt)}"><img class="jagannath" src="assets/images/jagannath.webp" alt="Lord Jagannath"></div>
    <p class="eyebrow">WITH DIVINE BLESSINGS, WE INVITE YOU TO THE WEDDING OF</p>
    <h1>${escape(c.couple.first)} <em>&</em> ${escape(c.couple.second)}</h1>
    <div class="families"><div><h2>${escape(full(c.couple.first, c.couple.groomNickname))}</h2><p>S/o ${escape(c.couple.groomParents)}</p></div><div><h2>${escape(full(c.couple.second, c.couple.brideNickname))}</h2><p>D/o ${escape(c.couple.brideParents)}</p></div></div>
    <p class="invitation-text">${escape(c.invitation)}</p>
    <p class="wedding-date">${escape(date(c.start, { weekday: "long" }))}</p><p class="wedding-time">${escape(hours(c))}</p>
    <a class="wedding-venue" href="${escape(venue.mapsUrl)}">${escape(venue.name)}</a><p class="address">${escape(venue.address)}</p>
    <p class="closing">Your presence is our joy. Your blessings, our greatest gift.</p>
    <p class="footer">WITH WARM REGARDS · THE SINGH & MOHAPATRA FAMILIES</p>
  </section>
  <section class="sheet program-page" aria-label="Wedding program and RSVP">
    <img class="wheel" src="assets/ashoka-chakra.svg" alt=""><p class="eyebrow">${escape(names.toUpperCase())} · OUR WEDDING PROGRAM</p><h1>Traditions, togetherness<br>& a lifetime of love.</h1><p class="dates">${escape(c.celebrationDates)} · ${escape(c.city)}</p>
    <div class="program">${entries}</div>
    <div class="rsvp"><p>Kindly RSVP by <strong>${escape(c.rsvpDeadline)}</strong></p>${contact}<small>For RSVPs, directions, and help with your plans.<br>Tap a venue name above to open its exact Google Maps location.</small></div>
    <p class="footer">WE LOOK FORWARD TO WELCOMING YOU WITH OUR FAMILIES.</p>
  </section></body></html>`;

  // Embed only the three print photographs. This gives the canvas a local
  // data source without relaxing the browser's file-access restrictions.
  for (const source of [
    c.photos.hero.src,
    "assets/images/ganesha.webp",
    "assets/images/jagannath.webp",
  ]) {
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
    await page.goto(pathToFileURL(preview).href);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() =>
      Promise.all([...document.images].map((image) => image.decode())),
    );
    // Photographs need only print-sized JPEGs in the PDF. Keep the website's
    // original optimized images intact, and keep the SVG wheel as vector art.
    await page.evaluate(async () => {
      for (const image of document.images) {
        if (!image.src.startsWith("data:image/")) continue;
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(image.naturalWidth, Math.ceil(image.width * 3));
        canvas.height = Math.round(
          (canvas.width * image.naturalHeight) / image.naturalWidth,
        );
        const drawing = canvas.getContext("2d");
        drawing.fillStyle = "#f4f0e3";
        drawing.fillRect(0, 0, canvas.width, canvas.height);
        drawing.drawImage(image, 0, 0, canvas.width, canvas.height);
        image.src = canvas.toDataURL("image/jpeg", 0.9);
        await image.decode();
      }
    });
    const overflow = await page
      .locator(".sheet")
      .evaluateAll((sheets) =>
        sheets.some((sheet) => sheet.scrollHeight > sheet.clientHeight + 1),
      );
    if (overflow) {
      const sizes = await page.locator(".sheet").evaluateAll((sheets) =>
        sheets.map((sheet) => ({
          height: sheet.clientHeight,
          content: sheet.scrollHeight,
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
