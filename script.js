(() => {
  "use strict";

  const config = window.WEDDING;
  if (!config) return;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [
    ...parent.querySelectorAll(selector),
  ];
  const names = `${config.couple.first} & ${config.couple.second}`;
  const weddingDate = new Date(config.start);
  const weddingEnd = new Date(config.end);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const weddingVenue = config.venues.find(
    (venue) => venue.id === config.primaryVenue,
  );
  const venueFor = (event) =>
    config.venues.find((venue) => venue.id === event.venueId);
  const fullName = (name, nickname) =>
    nickname ? `${name} (${nickname})` : name;
  const formatDate = (value, options = {}) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: config.timeZone,
      ...options,
    }).format(new Date(value));
  const formatTime = (value) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: config.timeZone,
    }).format(new Date(value));
  function eventTime(event) {
    if (!event.end) return `${formatTime(event.start)} onwards`;
    const nextDay =
      formatDate(event.start) !== formatDate(event.end)
        ? ` (${formatDate(event.end, { month: "short", year: undefined })})`
        : "";
    return `${formatTime(event.start)} – ${formatTime(event.end)}${nextDay}`;
  }

  function text(selector, value) {
    $$(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#icon-${name}`);
    svg.append(use);
    return svg;
  }

  function httpsUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  const dateLong = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: config.timeZone,
  }).format(weddingDate);
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: config.timeZone,
  }).formatToParts(weddingDate);
  const part = (type) => dateParts.find((item) => item.type === type).value;
  const dateShort = `${part("day")} . ${part("month")} . ${part("year")}`;

  text("[data-first]", config.couple.first);
  text("[data-second]", config.couple.second);
  text("[data-couple]", names);
  text("[data-intro]", config.intro);
  text("[data-invitation]", config.invitation);
  text("[data-city]", config.city);
  text("[data-date-long]", dateLong);
  text("[data-date-short]", dateShort);
  text(
    "[data-nicknames]",
    [config.couple.groomNickname, config.couple.brideNickname]
      .filter(Boolean)
      .join(" & "),
  );
  text(
    "[data-groom-full]",
    fullName(config.couple.first, config.couple.groomNickname),
  );
  text(
    "[data-bride-full]",
    fullName(config.couple.second, config.couple.brideNickname),
  );
  text("[data-groom-parents]", `S/o ${config.couple.groomParents}`);
  text("[data-bride-parents]", `D/o ${config.couple.brideParents}`);
  text("[data-celebration-dates]", config.celebrationDates);
  text("[data-contact-phone]", config.rsvp.phoneDisplay);
  const contactNumber =
    config.rsvp.phone ||
    config.contacts.find((contact) => contact.phone)?.phone;
  const callLink = $("[data-rsvp-call]");
  if (contactNumber) {
    callLink.hidden = false;
    callLink.href = `tel:${contactNumber.replace(/[^+\d]/g, "")}`;
    callLink.textContent = `Prefer to call? ${config.rsvp.phoneDisplay || contactNumber}`;
  } else {
    callLink.hidden = true;
    callLink.removeAttribute("href");
  }
  text("[data-story-text]", config.story.text);
  text("[data-story-closing]", config.story.closing);
  text("[data-rsvp-deadline]", config.rsvpDeadline);
  text("[data-hashtag]", config.hashtag);
  $("time[data-date-long]").dateTime = config.start;
  const monogram = $("[data-monogram]");
  monogram.replaceChildren(
    document.createTextNode([...config.couple.first][0]),
    element("span", "", "&"),
    document.createTextNode([...config.couple.second][0]),
  );
  document.title = `${names} — An Odia wedding celebration`;
  const description = `Celebrate the wedding of ${names}. ${dateLong} at ${weddingVenue.name}, ${weddingVenue.address}.`;
  $('meta[name="description"]').content = description;
  $('meta[property="og:title"]').content = document.title;
  $('meta[property="og:description"]').content = description;

  [["hero", "hero-image"]].forEach(([key, id]) => {
    const photo = config.photos[key];
    const image = document.getElementById(id);
    if (!image || !photo) return;
    image.src = photo.src;
    image.alt = photo.alt;
    if (photo.position) image.style.objectPosition = photo.position;
  });

  config.schedule.forEach((event, index) => {
    const card = element("article", "event-card reveal");
    card.dataset.event = event.id;
    card.style.transitionDelay = `${index * 80}ms`;
    const venue = venueFor(event);
    const location = element("a", "event-location");
    location.href = venue.mapsUrl;
    location.target = "_blank";
    location.rel = "noopener noreferrer";
    location.append(icon("pin"), element("span", "", venue.name));
    card.append(
      icon(event.icon),
      element("p", "event-date", formatDate(event.start)),
      element("h3", "", event.title),
      element("p", "event-time", eventTime(event)),
      element("p", "", event.text),
      element("p", "event-meals", event.meals),
      location,
    );
    $("#schedule").append(card);
  });

  config.details.forEach((detail) => {
    const card = element("article", "guest-detail reveal");
    const body = element("div");
    body.append(element("h3", "", detail.title), element("p", "", detail.text));
    card.append(icon(detail.icon), body);
    $("#guest-details").append(card);
  });

  $("#venue-grid").replaceChildren();
  config.venues.forEach((venue, index) => {
    const card = element("article", "venue-card reveal");
    card.dataset.venue = venue.id;
    const link = element("a", "button button-outline", "Get directions");
    link.href = httpsUrl(venue.mapsUrl);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Get directions to ${venue.name}`);
    link.append(icon("arrow"));
    const panel = element("div", "map-panel");
    const marker = element("div", "map-marker");
    marker.append(icon("pin"), element("p", "", venue.name));
    const button = element("button", "map-load-button", "View interactive map");
    button.type = "button";
    button.setAttribute("aria-label", `View interactive map for ${venue.name}`);
    button.addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.title = `Map to ${venue.name}`;
      frame.src = `https://maps.google.com/maps?q=${encodeURIComponent(venue.mapQuery)}&z=15&output=embed`;
      frame.referrerPolicy = "no-referrer-when-downgrade";
      frame.allowFullscreen = true;
      panel.replaceChildren(frame);
      frame.addEventListener("load", () => frame.focus(), { once: true });
    });
    panel.append(marker, button);
    card.append(
      element("p", "eyebrow", `VENUE 0${index + 1}`),
      element("h3", "", venue.name),
      element("p", "venue-setting", venue.purpose),
      element("p", "venue-address", venue.address),
      link,
      panel,
    );
    $("#venue-grid").append(card);
  });

  $$("[data-invitation-download]").forEach((link) => {
    link.href = config.invitationPdf;
  });

  // The pencil derivative preserves the original artwork's palm position.
  // Recompute the petal fan toward the portrait after responsive layout changes.
  const scene = $(".hero-scene");
  const petalLayer = $(".petal-shower");
  const petals = Array.from({ length: 18 }, (_, index) => {
    const petal = element("span", "flower-petal");
    petal.style.setProperty("--duration", "var(--blessing-cycle)");
    petal.style.setProperty("--delay", `${-index * 0.71}s`);
    petalLayer.append(petal);
    return petal;
  });
  /* Jagannath's chakra light is temporarily disabled; preserve for reuse.
  const svgNS = "http://www.w3.org/2000/svg";
  const rays = Array.from({ length: 9 }, (_, index) => {
    const ray = document.createElementNS(svgNS, "path");
    ray.setAttribute("class", "light-ray");
    ray.style.setProperty("--delay", `${-index * 0.47}s`);
    $(".light-rays").append(ray);
    return ray;
  });
  */
  function positionBlessings() {
    const bounds = scene.getBoundingClientRect();
    const photo = $(".hero-photo").getBoundingClientRect();
    const source = (selector, x, y) => {
      const rect = $(selector).getBoundingClientRect();
      return {
        x: rect.left - bounds.left + rect.width * x,
        y: rect.top - bounds.top + rect.height * y,
      };
    };
    const palm = source(".ganesha-art > img", 0.27, 0.6);
    // const chakra = source(".jagannath-art > img", 0.09, 0.4);
    const target = (fraction, height) => ({
      x: photo.left - bounds.left + photo.width * fraction,
      y: photo.top - bounds.top + photo.height * height,
    });
    petals.forEach((petal, index) => {
      const spread = ((index * 7) % petals.length) / (petals.length - 1);
      const end = target(0.28 + spread * 0.44, 0.48 + spread * 0.18);
      petal.style.left = `${palm.x}px`;
      petal.style.top = `${palm.y}px`;
      petal.style.setProperty("--end-x", `${end.x - palm.x}px`);
      petal.style.setProperty("--end-y", `${end.y - palm.y}px`);
    });
    /* Jagannath's chakra light geometry is temporarily disabled.
    $(".blessing-light").setAttribute(
      "viewBox",
      `0 0 ${bounds.width} ${bounds.height}`,
    );
    rays.forEach((ray, index) => {
      const end = target(0.26 + index * 0.058, 0.57 + index * 0.009);
      ray.setAttribute("d", `M ${chakra.x} ${chakra.y} L ${end.x} ${end.y}`);
    });
    const left = target(0.24, 0.57);
    const right = target(0.75, 0.65);
    $(".light-cone").setAttribute(
      "d",
      `M ${chakra.x} ${chakra.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z`,
    );
    $(".chakra-source").setAttribute("cx", chakra.x);
    $(".chakra-source").setAttribute("cy", chakra.y);
    */
  }
  positionBlessings();
  if ("ResizeObserver" in window)
    new ResizeObserver(positionBlessings).observe(scene);
  else window.addEventListener("resize", positionBlessings);

  const motionToggle = $("#motion-toggle");
  function updateMotionPreference() {
    document.body.classList.toggle(
      "decorative-motion-paused",
      reducedMotion.matches,
    );
    motionToggle.disabled = reducedMotion.matches;
    motionToggle.setAttribute("aria-pressed", String(reducedMotion.matches));
    motionToggle.textContent = reducedMotion.matches
      ? "Reduced motion enabled"
      : "Pause decorative animation";
  }
  motionToggle.addEventListener("click", () => {
    const paused = document.body.classList.toggle("decorative-motion-paused");
    motionToggle.setAttribute("aria-pressed", String(paused));
    motionToggle.textContent = paused
      ? "Resume decorative animation"
      : "Pause decorative animation";
  });
  updateMotionPreference();
  reducedMotion.addEventListener("change", updateMotionPreference);

  config.faqs.forEach((faq) => {
    const item = element("details", "faq");
    item.append(
      element("summary", "", faq.question),
      element("p", "", faq.answer),
    );
    $("#faq-list").append(item);
  });

  config.contacts.forEach((contact) => {
    const card = element("div", "contact");
    card.append(
      element("h3", "", contact.name),
      element("p", "", contact.role),
    );
    const links = element("div", "contact-links");
    if (contact.email) {
      const link = element("a");
      link.href = `mailto:${contact.email}`;
      link.append(icon("mail"), document.createTextNode(contact.email));
      links.append(link);
    }
    if (contact.phone) {
      const link = element("a");
      link.href = `tel:${contact.phone.replace(/[^+\d]/g, "")}`;
      link.append(icon("phone"), document.createTextNode(contact.phone));
      links.append(link);
    }
    if (!links.children.length) {
      card.append(
        element(
          "p",
          "contact-pending",
          "Please use the contact details shared with you privately.",
        ),
      );
    } else card.append(links);
    $("#contacts").append(card);
  });

  // Tick only while the page is visible, and never announce every second to a
  // screen reader. The separate heading describes the wedding-day state.
  let countdownInterval;
  function updateCountdown() {
    const remaining = Math.max(0, weddingDate.getTime() - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const units = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor(totalSeconds / 3600) % 24,
      minutes: Math.floor(totalSeconds / 60) % 60,
      seconds: totalSeconds % 60,
    };
    Object.entries(units).forEach(([id, value]) => {
      document.getElementById(id).textContent = String(value).padStart(2, "0");
    });
    if (remaining === 0) {
      $("#countdown-title").textContent =
        Date.now() < weddingEnd.getTime()
          ? "Today, we say I do."
          : "Forever has begun.";
    }
  }
  function startCountdown() {
    clearInterval(countdownInterval);
    updateCountdown();
    if (!document.hidden)
      countdownInterval = setInterval(updateCountdown, 1000);
  }
  startCountdown();
  document.addEventListener("visibilitychange", startCountdown);

  // Provider links open editable event drafts; .ics files support Apple and other apps.
  const escapeCalendar = (value) =>
    String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  const calendarDate = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  function foldCalendarLine(line) {
    const encoder = new TextEncoder();
    let result = "";
    let bytes = 0;
    for (const character of line) {
      const length = encoder.encode(character).length;
      if (bytes + length > 75) {
        result += "\r\n ";
        bytes = 1;
      }
      result += character;
      bytes += length;
    }
    return result;
  }
  function downloadCalendar(events, suffix) {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Wedding Invitation//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events.flatMap((event) => [
        "BEGIN:VEVENT",
        `UID:${event.id}-${new Date(event.start).getTime()}@aditya-priti-invitation`,
        `DTSTAMP:${calendarDate(new Date())}`,
        `DTSTART:${calendarDate(new Date(event.start))}`,
        ...(event.end ? [`DTEND:${calendarDate(new Date(event.end))}`] : []),
        `SUMMARY:${escapeCalendar(`${names} — ${event.title}`)}`,
        `LOCATION:${escapeCalendar(`${venueFor(event).name}, ${venueFor(event).address}`)}`,
        `DESCRIPTION:${escapeCalendar(`${event.text}\n${event.meals}\n${venueFor(event).mapsUrl}`)}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
      "",
    ];
    const blob = new Blob([lines.map(foldCalendarLine).join("\r\n")], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = element("a");
    link.href = url;
    link.download = `${config.couple.first}-${config.couple.second}-${suffix}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const calendarDialog = $("#calendar-dialog");
  const calendarButton = $(".calendar-button");
  function providerUrl(provider, event) {
    const venue = venueFor(event);
    const title = `${names} — ${event.title}`;
    const location = `${venue.name}, ${venue.address}`;
    const details = [
      event.text,
      event.meals,
      "All times are in India Standard Time (IST).",
      ...(!event.end
        ? ["End time to be confirmed. Please adjust the duration when saving."]
        : []),
      venue.mapsUrl,
    ].join("\n");
    const start = new Date(event.start);
    if (provider === "google") {
      const url = new URL("https://calendar.google.com/calendar/render");
      // Google requires both endpoints. Use a zero-duration draft for an
      // unspecified ending, with the pending duration explained above.
      url.search = new URLSearchParams({
        action: "TEMPLATE",
        text: title,
        dates: `${calendarDate(start)}/${calendarDate(event.end ? new Date(event.end) : start)}`,
        ctz: config.timeZone,
        location,
        details,
      }).toString();
      return url.href;
    }
    const url = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
    url.search = new URLSearchParams({
      path: "/calendar/action/compose",
      rru: "addevent",
      subject: title,
      startdt: start.toISOString(),
      ...(event.end ? { enddt: new Date(event.end).toISOString() } : {}),
      location,
      body: details,
    }).toString();
    return url.href;
  }
  config.schedule.forEach((event) => {
    const card = element("article", "calendar-event");
    card.dataset.calendarEvent = event.id;
    const heading = element("h3", "", event.title);
    heading.id = `calendar-${event.id}-title`;
    card.setAttribute("aria-labelledby", heading.id);
    const when = element("p", "calendar-event-time");
    when.append(
      element("span", "", formatDate(event.start)),
      element("span", "", eventTime(event)),
    );
    card.append(
      heading,
      when,
      element("p", "calendar-event-venue", venueFor(event).name),
    );
    if (!event.end)
      card.append(
        element(
          "p",
          "calendar-end-note",
          "End time to be confirmed. Adjust the duration in your calendar.",
        ),
      );
    const links = element("div", "calendar-event-links");
    for (const [provider, label] of [
      ["google", "Google Calendar"],
      ["outlook", "Outlook"],
    ]) {
      const link = element("a", "button button-outline", label);
      link.href = providerUrl(provider, event);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.dataset.provider = provider;
      link.setAttribute("aria-label", `Add ${event.title} to ${label}`);
      links.append(link);
    }
    const apple = element(
      "button",
      "button button-outline calendar-apple",
      "Apple / iPhone",
    );
    apple.type = "button";
    apple.setAttribute(
      "aria-label",
      `Download ${event.title} for Apple Calendar or other apps`,
    );
    apple.addEventListener("click", () => downloadCalendar([event], event.id));
    links.append(apple);
    card.append(links);
    $("#calendar-events").append(card);
  });
  calendarButton.addEventListener("click", () => {
    calendarDialog.showModal();
    document.body.classList.add("modal-open");
    $(".calendar-close").focus();
  });
  $(".calendar-close").addEventListener("click", () => calendarDialog.close());
  calendarDialog.addEventListener("click", (event) => {
    const bounds = calendarDialog.getBoundingClientRect();
    if (
      event.target === calendarDialog &&
      (event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom)
    )
      calendarDialog.close();
  });
  calendarDialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    calendarButton.focus({ preventScroll: true });
  });
  $(".calendar-download-all").addEventListener("click", () =>
    downloadCalendar(config.schedule, "celebrations"),
  );

  if ($("#gallery-grid") && $("#lightbox")) {
    // Native <dialog> keeps keyboard focus inside the photo viewer.
    const lightbox = $("#lightbox");
    const photos = config.photos.gallery;
    let photoIndex = 0;
    let lastPhotoButton;
    function showPhoto(index) {
      photoIndex = (index + photos.length) % photos.length;
      const photo = photos[photoIndex];
      $("#lightbox-image").src = photo.src;
      $("#lightbox-image").alt = photo.alt;
      $("#lightbox-caption").textContent = photo.caption;
      $("#lightbox-counter").textContent =
        `${photoIndex + 1} / ${photos.length}`;
    }
    photos.forEach((photo, index) => {
      const item = element("figure", "gallery-item reveal");
      if (photo.featured) item.classList.add("gallery-featured");
      item.style.transitionDelay = `${index * 60}ms`;
      const button = element("button");
      button.type = "button";
      button.setAttribute("aria-label", `Open photo: ${photo.caption}`);
      const image = element("img");
      image.src = photo.src;
      image.alt = photo.alt;
      image.loading = "lazy";
      image.decoding = "async";
      image.width = photo.width || 700;
      image.height = photo.height || 940;
      if (photo.position) image.style.objectPosition = photo.position;
      if (photo.fit) image.style.objectFit = photo.fit;
      const openIcon = element("span", "gallery-open", "+");
      openIcon.setAttribute("aria-hidden", "true");
      button.append(image, openIcon);
      button.addEventListener("click", () => {
        lastPhotoButton = button;
        showPhoto(index);
        lightbox.showModal();
        document.body.classList.add("modal-open");
        $(".lightbox-close").focus();
      });
      item.append(button, element("figcaption", "", photo.caption));
      $("#gallery-grid").append(item);
    });
    $(".lightbox-close").addEventListener("click", () => lightbox.close());
    $(".lightbox-prev").addEventListener("click", () =>
      showPhoto(photoIndex - 1),
    );
    $(".lightbox-next").addEventListener("click", () =>
      showPhoto(photoIndex + 1),
    );
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) lightbox.close();
    });
    lightbox.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      lastPhotoButton?.focus({ preventScroll: true });
    });
    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showPhoto(photoIndex + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPhoto(photoIndex - 1);
      }
    });
    let touchStart;
    lightbox.addEventListener(
      "touchstart",
      (event) => {
        touchStart = event.changedTouches[0].clientX;
      },
      { passive: true },
    );
    lightbox.addEventListener(
      "touchend",
      (event) => {
        if (touchStart === undefined) return;
        const distance = event.changedTouches[0].clientX - touchStart;
        if (Math.abs(distance) > 65)
          showPhoto(photoIndex + (distance < 0 ? 1 : -1));
        touchStart = undefined;
      },
      { passive: true },
    );
  }

  const menuToggle = $(".menu-toggle");
  const mobileNav = $("#mobile-nav");
  function closeMenu(restoreFocus = false) {
    mobileNav.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    if (restoreFocus) menuToggle.focus();
  }
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    mobileNav.hidden = isOpen;
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Open navigation" : "Close navigation",
    );
  });
  $$("a", mobileNav).forEach((link) =>
    link.addEventListener("click", () => closeMenu()),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobileNav.hidden) closeMenu(true);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  document.addEventListener("focusin", (event) => {
    if (!event.target.closest(".site-header")) closeMenu();
  });
  window
    .matchMedia("(min-width: 701px)")
    .addEventListener("change", (event) => {
      if (event.matches) closeMenu();
    });
  window.addEventListener(
    "scroll",
    () => $(".site-header").classList.toggle("scrolled", window.scrollY > 20),
    { passive: true },
  );

  // Guest details stay in memory until the configured service confirms receipt.
  const form = $("#rsvp-form");
  const submitButton = $("#rsvp-submit");
  const status = $("#rsvp-status");
  const maxGuests = Math.max(
    1,
    Math.min(20, Number(config.rsvp.maxGuests) || 1),
  );
  $("#guest-count").replaceChildren(
    ...Array.from({ length: maxGuests }, (_, index) => {
      const option = element(
        "option",
        "",
        `${index + 1} ${index ? "guests" : "guest"}`,
      );
      option.value = String(index + 1);
      return option;
    }),
  );
  let mode = config.rsvp.mode;
  const endpoint = httpsUrl(config.rsvp.endpoint);
  const externalUrl = httpsUrl(config.rsvp.externalUrl);
  const email = (config.rsvp.email || "").trim();
  const phone = (config.rsvp.phone || "").replace(/[^\d+]/g, "");
  if (
    !new Set([
      "demo",
      "phone",
      "whatsapp",
      "email",
      "formspree",
      "google-sheets",
      "external",
    ]).has(mode)
  )
    mode = "unavailable";
  if (
    (mode === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (mode === "formspree" &&
      !/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint)) ||
    (mode === "google-sheets" &&
      !/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(
        endpoint,
      )) ||
    (mode === "external" && !externalUrl) ||
    (mode === "phone" && !/^\+?\d{8,15}$/.test(phone)) ||
    (mode === "whatsapp" && phone && !/^\+?\d{8,15}$/.test(phone))
  )
    mode = "unavailable";

  const buttonLabels = {
    demo: "Preview RSVP",
    email: "Prepare email RSVP",
    whatsapp: "Continue to WhatsApp",
    formspree: "Send with love",
    "google-sheets": "Submit",
    unavailable:
      config.rsvp.mode === "google-sheets" ? "Submit" : "RSVP opening soon",
  };
  function setSubmitLabel(label) {
    submitButton.replaceChildren(document.createTextNode(label), icon("arrow"));
  }
  if (mode === "phone") {
    form.hidden = true;
    $("#phone-rsvp").hidden = false;
    $("#phone-rsvp-link").href = `tel:${phone}`;
  } else if (mode === "external") {
    form.hidden = true;
    $("#external-rsvp").hidden = false;
    $("#external-rsvp-link").href = externalUrl;
  } else {
    setSubmitLabel(buttonLabels[mode]);
    const notes = {
      demo: "Sample invitation · Responses are not being collected yet.",
      email:
        "Opens your email app. Please press Send there to complete your RSVP.",
      whatsapp: phone
        ? "Your message opens in WhatsApp. Review it and press Send to complete your RSVP."
        : "Choose the couple or a family member from your WhatsApp contacts, then send your RSVP.",
      formspree: "Your response is shared with the couple through Formspree.",
      "google-sheets": "Your response is saved privately for the couple.",
      unavailable:
        "RSVP details are coming soon. Please contact the couple for help.",
    };
    $("#rsvp-note").textContent = notes[mode];
    submitButton.disabled = mode === "unavailable";
  }

  function updateAttendance() {
    const other = form.elements.attendance.value === "other";
    $("#attendance-details").hidden = !other;
    const detail = $("input[name=attendanceDetail]");
    detail.disabled = !other;
    detail.required = other;
    if (!other) detail.checked = false;
    status.hidden = true;
  }
  $$("input[name=attendance]").forEach((input) =>
    input.addEventListener("change", updateAttendance),
  );
  for (const field of [form.elements.email, form.elements.phone]) {
    field.addEventListener("input", () => {
      form.elements.email.setCustomValidity("");
      form.elements.phone.setCustomValidity("");
    });
  }
  $("#guest-name").addEventListener("input", (event) =>
    event.target.setCustomValidity(""),
  );

  function showStatus(message, state = "success") {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
    status.focus({ preventScroll: true });
    status.scrollIntoView({
      behavior: reducedMotion.matches ? "instant" : "smooth",
      block: "nearest",
    });
  }

  let pendingSubmission = null;
  function submissionId() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (
      ["unavailable", "external", "phone"].includes(mode) ||
      submitButton.disabled
    )
      return;
    if (!form.elements.name.value.trim()) {
      form.elements.name.setCustomValidity(
        window.InvitationLanguage.translate("Please enter your name."),
      );
      form.elements.name.reportValidity();
      return;
    }
    const guestEmail = form.elements.email.value.trim();
    const guestPhone = form.elements.phone.value.trim();
    if (!guestEmail && !guestPhone) {
      form.elements.email.setCustomValidity(
        window.InvitationLanguage.translate(
          "Please provide an email address or phone number.",
        ),
      );
    }
    if (
      guestPhone &&
      (!/^\+?[\d\s().-]+$/.test(guestPhone) ||
        !/^\d{8,15}$/.test(guestPhone.replace(/\D/g, "")))
    ) {
      form.elements.phone.setCustomValidity(
        window.InvitationLanguage.translate(
          "Please enter a valid phone number with 8–15 digits.",
        ),
      );
    }
    if (!form.reportValidity() || form.elements._gotcha.value) return;
    const entireEvent = form.elements.attendance.value === "other";
    const response = {
      name: form.elements.name.value.trim(),
      email: guestEmail,
      phone: guestPhone,
      attendance: entireEvent
        ? "Attending the entire celebration"
        : "Joyfully accepts",
      guests: form.elements.guests.value,
      dietary: form.elements.dietary.value.trim(),
      message: form.elements.message.value.trim(),
      _subject: `Wedding RSVP — ${names}`,
      _gotcha: "",
    };
    if (mode === "demo") {
      showStatus(
        `Thank you, ${response.name}. This is a preview, so your RSVP has not been sent or saved. The couple will share an active RSVP option with the final invitation.`,
      );
      return;
    }
    if (mode === "whatsapp") {
      const t = window.InvitationLanguage.translate;
      const body = [
        `${t("Wedding RSVP")} — ${t(names)}`,
        `${t("Name")}: ${response.name}`,
        `${t("Attendance")}: ${t(response.attendance)}`,
        `${t("Guests")}: ${response.guests}`,
        ...(response.email ? [`${t("Email")}: ${response.email}`] : []),
        ...(response.phone ? [`${t("Phone number")}: ${response.phone}`] : []),
        ...(response.dietary
          ? [`${t("Dietary preferences")}: ${response.dietary}`]
          : []),
        ...(response.message ? ["", response.message] : []),
      ].join("\n");
      const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(body)}`;
      const link = element("a", "text-link", "Open WhatsApp");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      showStatus(
        phone
          ? "Your RSVP message is ready. Please review it and press Send in WhatsApp to complete your RSVP. If WhatsApp didn’t open, use the link below."
          : "Your RSVP message is ready. Choose the couple or a family member from your contacts, then press Send in WhatsApp. If WhatsApp didn’t open, use the link below.",
      );
      status.append(element("br"), link);
      link.click();
      return;
    }
    if (mode === "email") {
      const body = [
        `Name: ${response.name}`,
        `Email: ${response.email}`,
        `Phone: ${response.phone}`,
        `Attendance: ${response.attendance}`,
        `Guests: ${response.guests}`,
        `Dietary preferences: ${response.dietary || "None noted"}`,
        "",
        response.message,
      ].join("\n");
      const mailto = `mailto:${email}?subject=${encodeURIComponent(response._subject)}&body=${encodeURIComponent(body)}`;
      const draft = element("a");
      draft.href = mailto;
      document.body.append(draft);
      draft.click();
      draft.remove();
      showStatus(
        "Your RSVP is ready for your email app. Please press Send in your email app to complete it. If no app opened, you can copy your response below and email the couple.",
      );
      const recipient = element("a", "text-link", email);
      recipient.href = `mailto:${email}`;
      const copy = element("textarea");
      copy.value = body;
      copy.readOnly = true;
      copy.setAttribute("aria-label", "Your RSVP text to copy into an email");
      copy.rows = 5;
      status.append(element("br"), recipient, copy);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    if (mode === "google-sheets") {
      const fingerprint = JSON.stringify(response);
      if (pendingSubmission?.fingerprint !== fingerprint) {
        pendingSubmission = { fingerprint, id: submissionId() };
      }
      response.submissionId = pendingSubmission.id;
    }
    status.hidden = true;
    submitButton.disabled = true;
    setSubmitLabel("Sending your RSVP…");
    form.setAttribute("aria-busy", "true");
    try {
      const result = await fetch(endpoint, {
        method: "POST",
        // Apps Script accepts a simple text POST without an unsupported CORS preflight.
        headers:
          mode === "google-sheets"
            ? { "Content-Type": "text/plain;charset=utf-8" }
            : {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
        redirect: "follow",
        body: JSON.stringify(response),
        signal: controller.signal,
      });
      if (!result.ok) throw new Error("The response could not be delivered.");
      if (mode === "google-sheets") {
        const saved = await result.json();
        if (saved.ok !== true || saved.submissionId !== response.submissionId)
          throw new Error("The response was not acknowledged.");
      }
      pendingSubmission = null;
      form.reset();
      updateAttendance();
      showStatus(
        `You’re on the list, ${response.name}! Your RSVP has been sent. We can’t wait to celebrate with you.`,
      );
    } catch {
      showStatus(
        "We couldn’t confirm delivery of your RSVP. Your details are still in the form. Please try again or contact the couple directly.",
        "error",
      );
    } finally {
      clearTimeout(timeout);
      submitButton.disabled = false;
      setSubmitLabel(buttonLabels[mode]);
      form.removeAttribute("aria-busy");
    }
  });

  window.InvitationLanguage.init(config);

  // Content is visible by default; animation is added only when supported.
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    $$(".reveal").forEach((item) => {
      if (!reducedMotion.matches) item.classList.add("will-reveal");
      revealObserver.observe(item);
    });
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          $$(".desktop-nav a").forEach((link) => {
            if (link.hash === `#${entry.target.id}`)
              link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-15% 0px -60% 0px" },
    );
    $$("main section[id]").forEach((section) => navObserver.observe(section));
  }
})();
