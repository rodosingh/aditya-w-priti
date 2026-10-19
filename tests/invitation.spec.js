const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const fs = require("node:fs/promises");

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

async function configure(page, changes) {
  await page.route("**/wedding-config.js", async (route) => {
    const original = await route.fetch();
    await route.fulfill({
      response: original,
      body: `${await original.text()}\nObject.assign(window.WEDDING, ${JSON.stringify(changes)});`,
    });
  });
}

async function fillReply(page, attendance = "yes") {
  await page.getByLabel("Your full name").fill("Taylor Guest");
  await page.getByLabel("Email address").fill("taylor@example.com");
  await page.locator(`input[name="attendance"][value="${attendance}"]`).check();
}

test("invitation loads local assets without script or HTTP errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/");
  await expect(page).toHaveTitle(
    "Aditya & Priti — An Odia wedding celebration",
  );
  await expect(page.locator("h1")).toContainText("Priti");
  await expect(page.locator(".mantra-script")).toHaveText(
    "॥ ॐ गं गणपतये नमः ॥",
  );
  await expect(page.locator(".mantra-reading")).toHaveText(
    "Om Gan Ganapathaye Namah",
  );
  await expect(page.locator(".event-card")).toHaveCount(3);
  await expect(page.locator(".gallery-item")).toHaveCount(3);
  await expect(page.locator("#days")).toHaveText(/^\d+$/);
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((node) => node.complete && node.naturalWidth > 0),
      )
      .toBe(true);
  }
  expect(errors).toEqual([]);
});

test("fits phone, tablet, laptop, and large desktop widths", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [320, 375, 390, 768, 820, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.content,
      `Horizontal overflow at ${width}px`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
    const gallery = await page.locator("#gallery-grid").evaluate((grid) => ({
      width: grid.clientWidth,
      content: grid.scrollWidth,
      items: [...grid.children].map((item) => ({
        top: item.offsetTop,
        left: item.offsetLeft,
      })),
    }));
    expect(new Set(gallery.items.map((item) => item.top)).size).toBe(1);
    expect(gallery.items[1].left).toBeGreaterThan(gallery.items[0].left);
    expect(gallery.items[2].left).toBeGreaterThan(gallery.items[1].left);
    if (width <= 700) expect(gallery.content).toBeGreaterThan(gallery.width);
    else expect(gallery.content).toBeLessThanOrEqual(gallery.width + 1);
  }
});

test("navigation and FAQ work with keyboard and touch", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: /navigation$/ });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page
      .locator("#mobile-nav")
      .getByRole("link", { name: "The venues" })
      .click();
    await expect(page.locator("#mobile-nav")).toBeHidden();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await expect(page.locator("#mobile-nav")).toBeHidden();
  } else {
    await page
      .locator(".desktop-nav")
      .getByRole("link", { name: "The venues" })
      .click();
  }
  await expect(page).toHaveURL(/#details$/);
  const question = page.getByText("Which dates should I keep free?", {
    exact: true,
  });
  await question.click();
  await expect(
    page.getByText(/The Thread Ceremony is on 1 December/),
  ).toBeVisible();
  await question.press("Enter");
  await expect(
    page.getByText(/The Thread Ceremony is on 1 December/),
  ).toBeHidden();
});

test("only the three selected gallery images load and the family section uses the hand-tie sketch", async ({
  page,
}) => {
  const requested = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.goto("/");
  await page.locator("#gallery").scrollIntoViewIfNeeded();
  const expected = [
    "assets/images/couple-3-bottom-right.webp",
    "assets/images/couple-7-bottom-right.webp",
    "assets/images/couple-8-bottom-left.webp",
  ];
  await expect(page.locator(".gallery-item img")).toHaveCount(3);
  expect(
    await page
      .locator(".gallery-item img")
      .evaluateAll((images) =>
        images.map((image) => image.getAttribute("src")),
      ),
  ).toEqual(expected);
  await expect(page.locator("#story img")).toHaveCount(1);
  await expect(page.locator("#story img")).toHaveAttribute(
    "src",
    "assets/images/hand-tie-odia.webp",
  );
  await expect(page.locator(".family-details")).toBeVisible();
  expect(
    requested.filter((url) =>
      /couple-[2-8]\.webp|couple-[26]-bottom-right|couple-4-(top-right|bottom-right)|couple-8-top-right|couple-7-(top-right|bottom-left)|our-story|our-moment|puri-temple|jagannath-1/.test(
        url,
      ),
    ),
  ).toEqual([]);
  for (const image of await page.locator(".gallery-item img").all()) {
    await expect(image).toHaveCSS("object-fit", "contain");
    const frame = await image.evaluate((img) => {
      const picture = img.getBoundingClientRect();
      const button = img.closest("button").getBoundingClientRect();
      return {
        top: picture.top - button.top,
        bottom: button.bottom - picture.bottom,
        width: picture.width,
        height: picture.height,
      };
    });
    expect(frame.bottom).toBeGreaterThanOrEqual(8);
    expect(Math.abs(frame.top - frame.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(frame.width - frame.height)).toBeLessThanOrEqual(1);
  }
  await expect(page.locator(".family-wedding-label")).toHaveText("ଶୁଭ ବିବାହ");
  const lastPhoto = page.locator(".gallery-item button").last();
  await lastPhoto.scrollIntoViewIfNeeded();
  await expect(lastPhoto).toBeInViewport({ ratio: 0.9 });
  await lastPhoto.click();
  await expect(page.locator("#lightbox-image")).toHaveAttribute(
    "src",
    expected[2],
  );
  await page.locator(".lightbox-close").click();
  await expect(lastPhoto).toBeFocused();
});

test("selected photos enlarge, navigate, translate, and restore focus", async ({
  page,
}) => {
  await page.goto("/");
  const firstPhoto = page.locator(".gallery-item button").first();
  await firstPhoto.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#lightbox-image")).toHaveAttribute(
    "src",
    "assets/images/couple-3-bottom-right.webp",
  );
  await expect(page.locator(".lightbox-close")).toBeFocused();
  await expect(page.locator("#lightbox-counter")).toHaveText("1 / 3");
  await page.locator(".lightbox-next").click();
  await expect(page.locator("#lightbox-image")).toHaveAttribute(
    "src",
    "assets/images/couple-7-bottom-right.webp",
  );
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#lightbox-image")).toHaveAttribute(
    "src",
    "assets/images/couple-8-bottom-left.webp",
  );
  await expect(page.locator("#lightbox-counter")).toHaveText("3 / 3");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(firstPhoto).toBeFocused();
  await page.locator("#language-toggle").click();
  await expect(page.locator("#gallery-title")).toContainText("ପ୍ରେମର କାହାଣୀ");
  await firstPhoto.click();
  await expect(page.locator("#lightbox-caption")).toHaveText("ଏକା ଆକାଶ ତଳେ");
  await page.getByRole("button", { name: "ପରବର୍ତ୍ତୀ ଫଟୋ" }).click();
  await expect(page.locator("#lightbox-caption")).toHaveText("ପାଖେ ପାଖେ");
  await page.getByRole("button", { name: "ଫଟୋ ବନ୍ଦ କରନ୍ତୁ" }).click();
  await expect(firstPhoto).toBeFocused();
});

test("calendar download contains the venue and correct UTC event time", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download all celebrations (.ics)" })
    .click();
  const download = await downloadPromise;
  const content = (await fs.readFile(await download.path(), "utf8")).replace(
    /\r\n /g,
    "",
  );
  expect(download.suggestedFilename()).toBe("Aditya-Priti-celebrations.ics");
  expect(content).toContain("DTSTART:20261202T123000Z");
  expect(content).toContain("DTEND:20261202T233000Z");
  expect(content).toContain("SUMMARY:Aditya & Priti — Wedding");
  expect(content).toContain("LOCATION:Sunita Aangan\\, Jagatpur");
  expect(content).toContain("END:VCALENDAR\r\n");
  expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  expect(content).toContain("DTSTART:20261201T003000Z");
  expect(content).toContain("DTSTART:20261204T123000Z");
  const dinner = content
    .split("BEGIN:VEVENT")
    .find((event) => event.includes("Grand Dinner"));
  expect(dinner).not.toContain("DTEND:");
});

test("calendar choices open Google and Outlook drafts and download an Apple event", async ({
  page,
  context,
}) => {
  await context.route("https://calendar.google.com/**", (route) =>
    route.fulfill({ body: "Google Calendar draft" }),
  );
  await context.route("https://outlook.live.com/**", (route) =>
    route.fulfill({ body: "Outlook draft" }),
  );
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Add to calendar" });
  await trigger.click();
  const dialog = page.locator("#calendar-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".calendar-event")).toHaveCount(3);
  await expect(dialog.locator(".calendar-close")).toBeFocused();
  const wedding = dialog.locator('[data-calendar-event="wedding"]');
  const google = new URL(
    await wedding.locator('[data-provider="google"]').getAttribute("href"),
  );
  expect(google.searchParams.get("dates")).toBe(
    "20261202T123000Z/20261202T233000Z",
  );
  expect(google.searchParams.get("ctz")).toBe("Asia/Kolkata");
  expect(google.searchParams.get("text")).toBe("Aditya & Priti — Wedding");
  expect(google.searchParams.get("location")).toContain("Sunita Aangan");
  expect(google.searchParams.get("details")).toContain(
    "https://maps.app.goo.gl/kuVFzMVT9Q6yqLRt9",
  );
  const outlook = new URL(
    await wedding.locator('[data-provider="outlook"]').getAttribute("href"),
  );
  expect(outlook.searchParams.get("startdt")).toBe("2026-12-02T12:30:00.000Z");
  expect(outlook.searchParams.get("enddt")).toBe("2026-12-02T23:30:00.000Z");
  expect(outlook.searchParams.get("subject")).toBe("Aditya & Priti — Wedding");
  for (const provider of ["google", "outlook"]) {
    const popupPromise = context.waitForEvent("page");
    await wedding.locator(`[data-provider="${provider}"]`).click();
    const popup = await popupPromise;
    await popup.waitForURL(
      provider === "google"
        ? "https://calendar.google.com/**"
        : "https://outlook.live.com/**",
    );
    await popup.close();
  }
  const threadGoogle = new URL(
    await dialog
      .locator(
        '[data-calendar-event="thread-ceremony"] [data-provider="google"]',
      )
      .getAttribute("href"),
  );
  expect(threadGoogle.searchParams.get("dates")).toBe(
    "20261201T003000Z/20261201T113000Z",
  );
  const dinnerGoogle = new URL(
    await dialog
      .locator('[data-calendar-event="grand-dinner"] [data-provider="google"]')
      .getAttribute("href"),
  );
  expect(dinnerGoogle.searchParams.get("dates")).toBe(
    "20261204T123000Z/20261204T123000Z",
  );
  expect(dinnerGoogle.searchParams.get("details")).toContain(
    "End time to be confirmed",
  );
  const dinnerOutlook = new URL(
    await dialog
      .locator('[data-calendar-event="grand-dinner"] [data-provider="outlook"]')
      .getAttribute("href"),
  );
  expect(dinnerOutlook.searchParams.get("startdt")).toBe(
    "2026-12-04T12:30:00.000Z",
  );
  expect(dinnerOutlook.searchParams.has("enddt")).toBe(false);
  const downloadPromise = page.waitForEvent("download");
  await wedding.locator(".calendar-apple").click();
  const download = await downloadPromise;
  const content = await fs.readFile(await download.path(), "utf8");
  expect(download.suggestedFilename()).toBe("Aditya-Priti-wedding.ics");
  expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  expect(content).toContain("DTSTART:20261202T123000Z");
  expect(content).toContain("DTEND:20261202T233000Z");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.locator("#language-toggle").click();
  await page.locator(".calendar-button").click();
  await expect(page.locator("#calendar-title")).toHaveText(
    "ଆମ ଉତ୍ସବର ତାରିଖ ରଖନ୍ତୁ",
  );
  const bounds = await dialog.evaluate((node) => ({
    width: node.clientWidth,
    content: node.scrollWidth,
    viewport: innerWidth,
  }));
  expect(bounds.content).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.width).toBeLessThan(bounds.viewport);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await dialog.locator(".calendar-close").click();
  await expect(dialog).toBeHidden();
});

test("download invitation returns a real PDF from both download links", async ({
  page,
}) => {
  await page.goto("/");
  const links = page.getByRole("link", {
    name: "Download Invitation",
    exact: true,
  });
  await expect(links).toHaveCount(2);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute(
      "href",
      "assets/invitation-aditya-priti.pdf",
    );
    const downloadPromise = page.waitForEvent("download");
    await link.click();
    const download = await downloadPromise;
    expect(await download.failure()).toBeNull();
    const data = await fs.readFile(await download.path());
    expect(data.subarray(0, 5).toString()).toBe("%PDF-");
    expect(data.length).toBeGreaterThan(10000);
    expect(download.suggestedFilename()).toBe(
      "Aditya-and-Priti-Invitation.pdf",
    );
  }
  const previews = page.getByRole("link", {
    name: "Open invitation PDF",
    exact: true,
  });
  await expect(previews).toHaveCount(2);
  for (const preview of await previews.all()) {
    await expect(preview).toHaveAttribute(
      "href",
      "assets/invitation-aditya-priti.pdf",
    );
    await expect(preview).toHaveAttribute("target", "_blank");
    await expect(preview).not.toHaveAttribute("download");
    const response = await page.request.get(await preview.getAttribute("href"));
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/pdf");
  }
});

test("failed invitation downloads show a translated fallback and can be retried", async ({
  page,
}) => {
  await page.goto("/");
  let downloads = 0;
  page.on("download", () => downloads++);
  const button = page.locator("[data-invitation-download]").first();
  const status = page.locator("[data-invitation-status]").first();
  for (const code of [404, 200]) {
    await page.route("**/invitation-aditya-priti.pdf", (route) =>
      route.fulfill({
        status: code,
        contentType: "text/html",
        body: "<html>Invitation unavailable</html>",
      }),
    );
    await button.click();
    await expect(status).toHaveText(
      "The download couldn’t start. Open the invitation PDF or try again.",
    );
    await expect(button).not.toHaveAttribute("aria-busy");
    expect(downloads).toBe(0);
    await page.unroute("**/invitation-aditya-priti.pdf");
  }
  await page.locator("#language-toggle").click();
  await expect(status).toContainText("ଡାଉନଲୋଡ୍ ଆରମ୍ଭ ହୋଇପାରିଲା ନାହିଁ");
  await expect(
    page
      .getByRole("link", { name: "ନିମନ୍ତ୍ରଣ PDF ଖୋଲନ୍ତୁ", exact: true })
      .first(),
  ).toBeVisible();
  const downloaded = page.waitForEvent("download");
  await button.click();
  expect(await (await downloaded).failure()).toBeNull();
  await expect(status).toContainText("ଏକ କପି ସଞ୍ଚୟ କରନ୍ତୁ");
});

test("family details, three venues, and the revised Grand Dinner are visible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Aditya (Shiba)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Priti (Rekha)" }),
  ).toBeVisible();
  await expect(page.locator("[data-groom-parents]")).toHaveText(
    "S/o Mrs Dipali & Mr Dileswar Singh",
  );
  await expect(page.locator("[data-bride-parents]")).toHaveText(
    "D/o Mrs Kalpana & Mr Harishchandra Mohapatra",
  );
  await expect(
    page.locator('[data-event="grand-dinner"] .event-time'),
  ).toHaveText("06:00 PM onwards");
  await expect(page.locator('[data-event="wedding"] .event-time')).toHaveText(
    "06:00 PM – 05:00 AM (3 Dec)",
  );
  const locations = [
    ["Groom’s Residence", "https://maps.app.goo.gl/yYMJiG3vR6FQppgM9"],
    ["Sunita Aangan", "https://maps.app.goo.gl/kuVFzMVT9Q6yqLRt9"],
    ["Crescent Convention Centre", "https://maps.app.goo.gl/VFryEtyFjndNprsv8"],
  ];
  for (const [name, url] of locations)
    await expect(
      page.getByRole("link", { name: `Get directions to ${name}` }),
    ).toHaveAttribute("href", url);
  await expect(page.locator("[data-rsvp-deadline]")).toHaveText(
    "30 October 2026",
  );
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
});

test("public source and both languages keep mobile contact details private", async ({
  page,
  request,
}) => {
  // Scan public source too: hiding text cannot protect a number in markup or JS.
  const mobileNumber = /(?<!\d)(?:\+91[ -]?)?[6-9]\d{4}[ -]?\d{5}(?!\d)/;
  for (const source of [
    "index.html",
    "wedding-config.js",
    "script.js",
    "translations.js",
  ]) {
    const response = await request.get(`/${source}`);
    expect(response.ok()).toBe(true);
    expect(mobileNumber.test(await response.text()), source).toBe(false);
  }
  await page.goto("/");
  const phoneFields = await page.evaluate(() => [
    window.WEDDING.rsvp.phone,
    window.WEDDING.rsvp.phoneDisplay,
    ...window.WEDDING.contacts.map((contact) => contact.phone),
  ]);
  expect(phoneFields.every((phone) => phone === "")).toBe(true);
  for (const language of ["en", "or"]) {
    if (language === "or") await page.locator("#language-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator("[data-rsvp-call]")).toBeHidden();
    await expect(page.locator("#phone-rsvp-link")).not.toHaveAttribute("href");
    expect(mobileNumber.test(await page.content())).toBe(false);
  }
});

test("WhatsApp lets guests choose a family contact without publishing a recipient", async ({
  page,
  context,
}) => {
  // Intercept WhatsApp navigation: no message is sent by this test.
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>WhatsApp preview</p>",
    }),
  );
  await page.goto("/");
  await expect(page.locator("#rsvp-note")).toContainText(
    "Choose the couple or a family member from your WhatsApp contacts",
  );
  await page.getByLabel("Your full name").fill("Taylor Guest");
  await page.getByLabel("Joyfully accepts").check();
  await page.getByLabel("Number of guests").selectOption("2");
  await page
    .getByLabel("A little note for us")
    .fill("Looking forward to it & sending our blessings!");
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "Continue to WhatsApp" }).click();
  const popup = await popupPromise;
  await popup.waitForURL("https://wa.me/**");
  const url = new URL(popup.url());
  expect(url.pathname).toBe("/");
  expect([...url.searchParams.keys()]).toEqual(["text"]);
  expect(url.searchParams.get("text")).toContain("Guests: 2");
  expect(url.searchParams.get("text")).toContain(
    "Looking forward to it & sending our blessings!",
  );
  await expect(page.getByRole("status")).toContainText(
    "Choose the couple or a family member from your contacts, then press Send in WhatsApp",
  );
  await expect(page.getByRole("status")).not.toContainText("has been sent");
  await popup.close();
});

test("petals and leafy decorations accompany still Ganesha and can be paused", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".background-chakra")).toHaveCSS(
    "animation-name",
    "chakra-turn",
  );
  await expect(
    page.locator(".light-ray, .blessing-light, .jagannath-art"),
  ).toHaveCount(0);
  await expect(page.locator(".hero-sprig")).toHaveCount(2);
  for (const sprig of await page.locator(".hero-sprig").all())
    await expect(sprig).toBeVisible();
  await expect(page.locator(".flower-petal")).toHaveCount(18);
  await expect(page.locator(".flower-petal").first()).toHaveCSS(
    "animation-name",
    "petal-blessing",
  );
  await expect(page.locator(".ganesha-art > img")).toHaveAttribute(
    "src",
    "assets/images/ganesha-sketch.webp",
  );
  await expect(page.locator(".ganesha-art > img")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("button", { name: "Pause decorative animation" })
    .click();
  for (const selector of [".background-chakra", ".hero-sprig", ".flower-petal"])
    await expect(page.locator(selector).first()).toHaveCSS(
      "animation-play-state",
      "paused",
    );
  await page
    .getByRole("button", { name: "Resume decorative animation" })
    .click();
  await expect(page.locator(".background-chakra")).toHaveCSS(
    "animation-play-state",
    "running",
  );
});

test("preview validates inputs and explicitly does not send a reply", async ({
  page,
}) => {
  await configure(page, { rsvp: { mode: "demo", maxGuests: 4 } });
  const outgoing = [];
  page.on("request", (request) => {
    if (request.method() === "POST") outgoing.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Preview RSVP" }).click();
  await expect(page.locator("#rsvp-status")).toBeHidden();
  await fillReply(page);
  await page.getByLabel("Number of guests").selectOption("2");
  await page.getByRole("button", { name: "Preview RSVP" }).click();
  await expect(page.getByRole("status")).toContainText(
    "has not been sent or saved",
  );
  await expect(page.getByRole("status")).toContainText("Taylor Guest");
  expect(outgoing).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByLabel("Regretfully declines").check();
  await expect(page.locator("#attending-fields")).toBeHidden();
});

test("Formspree confirms accepted replies and preserves failed replies for retry", async ({
  page,
}) => {
  await configure(page, {
    rsvp: {
      mode: "formspree",
      endpoint: "https://formspree.io/f/testform",
      maxGuests: 3,
    },
  });
  let accept = false;
  let payload;
  await page.route("https://formspree.io/f/testform", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: accept ? 200 : 422,
      contentType: "application/json",
      body: JSON.stringify(
        accept ? { ok: true } : { errors: [{ message: "Please retry" }] },
      ),
    });
  });
  await page.goto("/");
  await fillReply(page);
  await page.getByLabel("Number of guests").selectOption("3");
  await page.getByLabel("Dietary preferences").fill("Vegetarian");
  await page.getByRole("button", { name: "Send with love" }).click();
  await expect(page.getByRole("status")).toContainText(
    "couldn’t confirm delivery",
  );
  await expect(page.getByLabel("Your full name")).toHaveValue("Taylor Guest");
  await expect(page.getByLabel("Dietary preferences")).toHaveValue(
    "Vegetarian",
  );
  accept = true;
  await page.getByRole("button", { name: "Send with love" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your RSVP has been sent",
  );
  expect(payload).toMatchObject({
    name: "Taylor Guest",
    guests: "3",
    dietary: "Vegetarian",
    attendance: "Joyfully accepts",
  });
  await expect(page.getByLabel("Your full name")).toHaveValue("");
});

test("declining RSVP sends zero guests and omits stale dietary information", async ({
  page,
}) => {
  await configure(page, {
    rsvp: {
      mode: "formspree",
      endpoint: "https://formspree.io/f/testform",
      maxGuests: 4,
    },
  });
  let payload;
  await page.route("https://formspree.io/f/testform", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"ok":true}',
    });
  });
  await page.goto("/");
  await fillReply(page);
  await page.getByLabel("Number of guests").selectOption("4");
  await page.getByLabel("Dietary preferences").fill("Vegetarian");
  await page.getByLabel("Regretfully declines").check();
  await page.getByRole("button", { name: "Send with love" }).click();
  await expect(page.getByRole("status")).toContainText("We’ll miss you");
  expect(payload).toMatchObject({
    guests: "0",
    dietary: "",
    attendance: "Regretfully declines",
  });
});

test("external RSVP, contact links, and the wedding map use configured values", async ({
  page,
}) => {
  await configure(page, {
    couple: { first: "Priya", second: "Dev" },
    rsvp: { mode: "external", externalUrl: "https://forms.gle/example" },
    contacts: [
      {
        name: "Priya",
        role: "Travel questions",
        email: "priya@example.com",
        phone: "+1 202 555 0123",
      },
    ],
  });
  await page.goto("/");
  await expect(page).toHaveTitle("Priya & Dev — An Odia wedding celebration");
  await expect(page.locator("#rsvp-form")).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Send your RSVP" }),
  ).toHaveAttribute("href", "https://forms.gle/example");
  await expect(
    page.getByRole("link", { name: "priya@example.com" }),
  ).toHaveAttribute("href", "mailto:priya@example.com");
  await expect(
    page.getByRole("link", { name: "+1 202 555 0123", exact: true }),
  ).toHaveAttribute("href", "tel:+12025550123");
  await expect(
    page.getByRole("link", { name: "Get directions to Sunita Aangan" }),
  ).toHaveAttribute("href", "https://maps.app.goo.gl/kuVFzMVT9Q6yqLRt9");
  await expect(page.locator(".map-panel iframe")).toHaveCount(0);
  await page.route("https://maps.google.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<html><body>Map test</body></html>",
    }),
  );
  await page
    .getByRole("button", {
      name: "View interactive map for Sunita Aangan",
      exact: true,
    })
    .click();
  await expect(page.locator('[data-venue="marriage"] iframe')).toHaveAttribute(
    "src",
    /q=20.4966751%2C85.9274134/,
  );
});

test("incomplete live RSVP configuration cannot report a successful send", async ({
  page,
}) => {
  await configure(page, {
    rsvp: { mode: "formspree", endpoint: "", maxGuests: 2 },
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "RSVP opening soon" }),
  ).toBeDisabled();
  await expect(page.locator("#rsvp-note")).toContainText("coming soon");
});

test("email RSVP prepares a draft and makes the guest's remaining action clear", async ({
  page,
}) => {
  await configure(page, {
    rsvp: { mode: "email", email: "couple@example.com", maxGuests: 2 },
  });
  await page.goto("/");
  // Inspect the draft without opening an email client or sending a message.
  await page.evaluate(() => {
    document.addEventListener(
      "click",
      (event) => {
        const link = event.target.closest('a[href^="mailto:"]');
        if (link) {
          event.preventDefault();
          window.capturedDraft = link.href;
        }
      },
      true,
    );
  });
  await fillReply(page);
  await page
    .getByLabel("A little note for us")
    .fill("A song & a dance, please!");
  await page.getByRole("button", { name: "Prepare email RSVP" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Please press Send in your email app",
  );
  const draft = new URL(await page.evaluate(() => window.capturedDraft));
  expect(draft.pathname).toBe("couple@example.com");
  expect(draft.searchParams.get("body")).toContain("A song & a dance, please!");
  await expect(
    page.getByRole("textbox", { name: "Your RSVP text to copy into an email" }),
  ).toHaveValue(/Taylor Guest/);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("keeps essential details and private contact guidance available", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Aditya");
    await expect(
      page.getByRole("link", { name: "Get directions", exact: true }),
    ).toHaveCount(3);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator(".noscript-message")).toContainText(
      "contact details shared with you privately",
    );
    await expect(page.locator("#rsvp-form")).toBeHidden();
    await expect(page.locator(".noscript-message")).toContainText(
      "Please enable JavaScript",
    );
  });
});

test("countdown shows the wedding-day and completed states without negative numbers", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-12-02T18:00:00Z") });
  await page.goto("/");
  await expect(page.locator("#countdown-title")).toHaveText(
    "Today, we say I do.",
  );
  await expect(page.locator("#days")).toHaveText("00");
  await page.clock.setSystemTime(new Date("2026-12-03T12:00:00Z"));
  await page.clock.runFor(1100);
  await expect(page.locator("#countdown-title")).toHaveText(
    "Forever has begun.",
  );
});

test("respects reduced motion and passes automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  const duration = await page
    .locator(".hero-copy")
    .evaluate((node) => parseFloat(getComputedStyle(node).animationDuration));
  expect(duration).toBeLessThan(0.001);
  await expect(page.locator(".story-copy")).toHaveCSS("opacity", "1");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      elements: violation.nodes.map((node) => ({
        target: node.target,
        reason: node.failureSummary,
      })),
    })),
  ).toEqual([]);
});

test("English and Odia fit every viewport with the date text inside its circle", async ({
  page,
}) => {
  await page.goto("/");
  for (const language of ["en", "or"]) {
    if (language === "or") await page.locator("#language-toggle").click();
    for (const width of [320, 375, 390, 700, 768, 820, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => {
        const badge = document.querySelector(".save-date-seal");
        const radius = badge.clientWidth / 2;
        const corners = [...badge.querySelectorAll("span")].flatMap((child) => {
          const xs = [child.offsetLeft, child.offsetLeft + child.offsetWidth];
          const ys = [child.offsetTop, child.offsetTop + child.offsetHeight];
          return xs.flatMap((x) =>
            ys.map((y) => Math.hypot(x - radius, y - radius)),
          );
        });
        const toggle = document
          .querySelector("#language-toggle")
          .getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          badgeOverflow: Math.max(...corners) - radius,
          toggleFits: toggle.left >= 0 && toggle.right <= innerWidth,
        };
      });
      expect(layout.overflow, `${language} at ${width}px`).toBeLessThanOrEqual(
        1,
      );
      expect(
        layout.badgeOverflow,
        `Date circle: ${language} at ${width}px`,
      ).toBeLessThanOrEqual(-2);
      expect(layout.toggleFits).toBe(true);
    }
  }
});

test("Odia switch preserves entries, translates new RSVP feedback, and remembers the language", async ({
  page,
  context,
}) => {
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ body: "WhatsApp preview" }),
  );
  await page.goto("/");
  await fillReply(page);
  await page.locator("#guest-message").fill("My original message — ଶୁଭେଚ୍ଛା");
  await page.locator("#language-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "or");
  await expect(page.locator("h1")).toContainText("ଆଦିତ୍ୟ");
  await expect(page.locator("#hero-title em")).toHaveText("ଓ");
  await expect(page.locator(".monogram span")).toHaveText("ଓ");
  await expect(page.locator("[data-nicknames]")).toHaveText("ଶିବା ଓ ରେଖା");
  await expect(page.locator("[data-groom-full]")).toHaveText("ଆଦିତ୍ୟ (ଶିବା)");
  await expect(page.locator(".family-wedding-label")).toHaveText("ଶୁଭ ବିବାହ");
  await expect(page.locator(".mantra-script")).toHaveText(
    "॥ ଓଁ ଗଂ ଗଣପତୟେ ନମଃ ॥",
  );
  await expect(page.locator("[data-date-long]").first()).toHaveText(
    "ବୁଧବାର, ୨ ଡିସେମ୍ବର ୨୦୨୬",
  );
  await expect(
    page.locator('[data-event="wedding"] .event-time'),
  ).toContainText("୩ ଡିସେମ୍ବର");
  await expect(
    page.locator('[data-event="grand-dinner"] .event-time'),
  ).toHaveText("୦୬:୦୦ ଅପରାହ୍ନ ଠାରୁ");
  await expect(page.locator("#guest-name")).toHaveValue("Taylor Guest");
  await expect(page.locator("#guest-message")).toHaveValue(
    "My original message — ଶୁଭେଚ୍ଛା",
  );
  const popupPromise = context.waitForEvent("page");
  await page.locator("#rsvp-submit").click();
  const popup = await popupPromise;
  await popup.waitForURL("https://wa.me/**");
  expect(new URL(popup.url()).pathname).toBe("/");
  const message = new URL(popup.url()).searchParams.get("text");
  expect(message).toContain("ନାମ: Taylor Guest");
  expect(message).toContain("My original message — ଶୁଭେଚ୍ଛା");
  await expect(page.locator("#rsvp-status")).toContainText(
    "ଆପଣଙ୍କ ସନ୍ଦେଶ ପ୍ରସ୍ତୁତ",
  );
  await expect(page.locator("#rsvp-status a")).toHaveText("WhatsApp ଖୋଲନ୍ତୁ");
  await popup.close();
  await page.locator("#language-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("#hero-title em")).toHaveText("&");
  await expect(page.locator("#rsvp-status")).toContainText(
    "Your RSVP message is ready",
  );
  await expect(page.locator("#guest-message")).toHaveValue(
    "My original message — ଶୁଭେଚ୍ଛା",
  );
  await expect(page.locator("[data-date-long]").first()).toHaveText(
    "Wednesday, 2 December 2026",
  );
  await page.locator("#language-toggle").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "or");
  await expect(page.locator("#language-toggle")).toHaveText("Read in English");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("Ganesha stays centered above the portrait and petals fan from the palm into the photo after resizing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.waitForTimeout(1600);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const scene = document
            .querySelector(".hero-scene")
            .getBoundingClientRect();
          const photo = document
            .querySelector(".hero-photo")
            .getBoundingClientRect();
          const ganesha = document
            .querySelector(".ganesha-art img")
            .getBoundingClientRect();
          const petal = document.querySelector(".flower-petal");
          const origin = {
            x: parseFloat(petal.style.left) + scene.left,
            y: parseFloat(petal.style.top) + scene.top,
          };
          const ends = [...document.querySelectorAll(".flower-petal")].map(
            (node) => ({
              x: origin.x + parseFloat(node.style.getPropertyValue("--end-x")),
              y: origin.y + parseFloat(node.style.getPropertyValue("--end-y")),
            }),
          );
          return (
            ganesha.bottom < photo.top &&
            Math.abs(
              ganesha.left + ganesha.width / 2 - photo.left - photo.width / 2,
            ) < 1 &&
            Math.abs(origin.x - (ganesha.left + ganesha.width * 0.27)) < 1 &&
            Math.abs(origin.y - (ganesha.top + ganesha.height * 0.6)) < 1 &&
            ends.every(
              (end) =>
                end.x > photo.left &&
                end.x < photo.right &&
                end.y > photo.top &&
                end.y < photo.bottom,
            ) &&
            Math.max(...ends.map((end) => end.x)) -
              Math.min(...ends.map((end) => end.x)) >
              photo.width * 0.4
          );
        }),
      )
      .toBe(true);
  }
});

test("language switch still works when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
  });
  await page.goto("/");
  await page.locator("#language-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "or");
  await page.locator("#language-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
