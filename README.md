# Aditya & Priti — an Odia wedding invitation

A responsive invitation for **Aditya (Shiba)** and **Priti (Rekha)**, with a cream background (`#f4f0e3`), brown typography (`#7b6952`), and larger, more readable text. It works directly on GitHub Pages with no runtime dependencies or build step.

The welcome portrait has the original Ganesha artwork converted to a transparent brown pencil sketch, centered above the couple at 80% of the portrait’s width. On desktop and tablet, the crown aligns with the mantra frame’s lower edge; phones keep the stacked invitation layout. Leafy line drawings frame the portrait, and petals fan out from Ganesha’s raised palm toward the couple. The source point follows the artwork when the screen size changes. Jagannath’s image and chakra-light animation are commented out in `index.html`, `script.js`, and the corresponding CSS; the source assets and code remain available. A framed “॥ ॐ गं गणपतये नमः ॥” invocation, with “Om Gan Ganapathaye Namah” beneath it, sits at the center-top of the page. Odia mode displays “॥ ଓଁ ଗଂ ଗଣପତୟେ ନମଃ ॥” using the local Odia font and hides the English transliteration. The Odia welcome blessing remains large and bold, and the background Ashoka Chakra rotates slowly. Guests can pause decorative animation, and the page respects their device’s reduced-motion preference.

Other features include the three-day program, individual directions and maps for all three venues, a live countdown, Google Calendar, Outlook, and Apple/iPhone calendar options, an English/Odia language switch, WhatsApp RSVP with a guest-selected recipient, and a **Download Invitation** button for a matching two-page A5 PDF.

## Preview locally

Open `index.html` in your browser, or run:

```bash
npm start
```

Visit <http://localhost:4173>. This runs Python’s local web server; you can also run `python3 -m http.server 4173 --bind 127.0.0.1` directly. No npm installation is needed just to view the site. Stop the server with `Ctrl+C`.

## Current wedding details

| Celebration     | Date and time, India Standard Time           | Venue                            |
| --------------- | -------------------------------------------- | -------------------------------- |
| Thread Ceremony | 1 December 2026, 6:00 AM–5:00 PM             | Groom’s Residence                |
| Wedding         | 2 December 2026, 6:00 PM–3 December, 5:00 AM | Sunita Aangan, Jagatpur, Cuttack |
| Grand Dinner    | 4 December 2026, 6:00 PM onwards             | Crescent Convention Centre       |

**The Grand Dinner’s end time has not been specified.** The page and PDF show “6:00 PM onwards.” Its .ics entry includes the start only, and the calendar chooser marks the ending as unconfirmed. Google uses a zero-duration draft and Outlook leaves the ending unspecified; guests can adjust the duration before saving. Set that event’s `end` when the family confirms it.

The Thread Ceremony includes breakfast, lunch, and dinner. On the wedding day, breakfast and lunch are at Groom’s Residence and dinner is at Sunita Aangan. The Grand Dinner card retains the supplied note that breakfast, lunch, and dinner accompany the day’s celebrations; individual daytime meal times are not specified.

RSVP is requested by **30 October 2026**, using WhatsApp or the contact details shared privately. The deadline is displayed as a request; the form does not automatically close on that date.

## Edit your details

Most changes belong in **`wedding-config.js`**. Save it, then refresh the browser. Keep quotation marks and commas intact.

| Change                                 | Configuration                  |
| -------------------------------------- | ------------------------------ |
| Names, nicknames, and parents          | `couple`                       |
| Invitation text                        | `intro`, `invitation`, `story` |
| Main wedding countdown                 | `start`, `end`, `timeZone`     |
| Program and meal information           | `schedule`                     |
| Venue names, addresses, and directions | `venues`                       |
| Main marriage hall                     | `primaryVenue`                 |
| Photographs and captions               | `photos`                       |
| RSVP method, number, and deadline      | `rsvp`, `rsvpDeadline`         |
| Contact links                          | `contacts`                     |
| Guest questions                        | `faqs`                         |
| Downloaded PDF path                    | `invitationPdf`                |

`start` and `end` use ISO timestamps, for example `2026-12-02T18:00:00+05:30`. The `+05:30` offset is India Standard Time. Each program event has its own dates. The wedding’s `end` is on **3 December** because it continues overnight. Use `null` for an event whose end is unknown.

The main countdown uses the top-level `start` and `end`. The calendar uses `schedule`. If the wedding hours change, update both together. `celebrationDates` is the short date label used on the page and in the PDF.

Changing the names updates the monogram, main invitation, family section, footer, and page title. The `<head>` metadata and visible no-JavaScript fallback in `index.html` should also be updated if the details change, because messaging apps often read only the original HTML.

### Venues and maps

There are three independent records in `venues`. Each has an `id` referenced by a program event’s `venueId`:

- `residence`: [Groom’s Residence](https://maps.app.goo.gl/yYMJiG3vR6FQppgM9)
- `marriage`: [Sunita Aangan](https://maps.app.goo.gl/kuVFzMVT9Q6yqLRt9)
- `reception`: [Crescent Convention Centre](https://maps.app.goo.gl/VFryEtyFjndNprsv8)

`mapsUrl` is the exact Google Maps link supplied by the family. `mapQuery` uses coordinates resolved from that link, so the embedded map uses the same location. Set `address` if you want to add a full street address; the residence and reception currently direct guests to the exact pin rather than showing an invented address.

The interactive map loads only after **View interactive map** is selected. **Get directions** works independently if Google’s embed is blocked. No Maps API key is needed.

### RSVP and contact details

**The active mode is WhatsApp with no recipient number published.** Guests complete the RSVP form, choose **Continue to WhatsApp**, select the couple or a family member from their own contacts, and press **Send in WhatsApp**. Contact details are shared privately; the page, configuration, links, and PDF do not contain the private mobile number. The page does not claim delivery and does not store guest information in browser storage. The email field is optional in this mode.

```js
rsvp: {
  mode: "whatsapp",
  phone: "",
  phoneDisplay: "",
  email: "",
  endpoint: "",
  externalUrl: "",
  maxGuests: 4,
},
```

Other supported modes remain available:

| Mode        | Behavior                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `phone`     | Displays a call-to-RSVP card; guests can telephone the family.                                      |
| `email`     | Uses `rsvp.email` to prepare a draft. Guests must send it in their email app.                       |
| `external`  | Links to the public Google Forms, Tally, or other HTTPS form URL in `externalUrl`.                  |
| `formspree` | Sends to your own `https://formspree.io/f/FORM_ID` endpoint and confirms only an accepted response. |
| `demo`      | Previews the form and explicitly states that nothing was sent or saved.                             |

GitHub Pages cannot store submissions by itself. WhatsApp and email rely on the guest completing the send action in that app. Formspree and external forms require your own configured account or form. Never put passwords or secret API keys into the repository or published files.

For Formspree, verify your recipient email and test a real response after setting up the service. Failed delivery keeps the form entries intact for another attempt. The included tests intercept external destinations and do not contact the couple or send guest messages.

`maxGuests` is a general per-response limit (1–20), not a private guest-list system. The form reminds guests to include only those named on their invitation. Add further people to `contacts` if needed; nonempty email and telephone values create clickable links.

### English and Odia

The top-right **Translate to ଓଡ଼ିଆ** button switches the page to Odia; **Read in English** switches it back. It translates the invitation, families, program, dates and times, venues, forms, guest questions, and contact text using local copy in **`translations.js`**. No translation service or network request is needed. The browser remembers only the language preference; switching languages preserves form entries. WhatsApp message labels follow the chosen language, and guest-entered text stays exactly as typed.

Edit the English/Odia pairs in `translations.js` when changing the corresponding English copy in `index.html` or `wedding-config.js`. Names and venue names have explicit Odia spellings there. Dates and times use the configured India time zone and are formatted explicitly in Odia, including on browsers without an Odia locale. Gallery captions, photo controls, and calendar options also follow the selected language. Standalone “&” symbols, including between the couple’s names and in the monogram, become “ଓ” in Odia. The existing downloadable PDF and calendar file retain their English text. The language button appears only when JavaScript is available.

### Adding celebrations to a calendar

**Add to calendar** opens a chooser for the Thread Ceremony, Wedding, and Grand Dinner. Each celebration offers:

- **Google Calendar** and **Outlook**: open an editable event in a new tab, with the title, date, time, venue, meal details, and map link filled in. Guests finish saving in their own calendar.
- **Apple / iPhone**: download that celebration as an `.ics` file, suitable for importing into Apple Calendar or another calendar app.
- **Download all celebrations (.ics)**: download one file containing all three events, named `Aditya-Priti-celebrations.ics`.

Calendar timestamps use UTC so each app handles the guest’s local time correctly. The chooser displays India Standard Time and preserves the Wedding’s ending on 3 December. Event drafts and .ics files use English details in both page languages. The chooser supports keyboard navigation, Escape to close, and returning focus to the calendar button.

### Photos and traditional artwork

The original photos and video in **`couple-images/`** are tracked in Git using reversible Base64 storage; the local JPEGs and video remain intact. The design references in **`custom-images/`** stay local and are excluded by `.gitignore`. The website uses optimized copies in **`assets/images/`**. Pages includes only assets used by the active page, but all committed files, including unused images and Base64 originals, are available from the public repository.

- `couple-1.webp` is the hero portrait.
- The **“With the blessings of our families”** section places the joined-hands drawing between the groom’s and bride’s names, including in the stacked mobile layout. `hand-tie-odia.webp` is a brown, transparent crop of the supplied sketch, with its embedded Hindi lettering removed. Real Odia text **ଶୁଭ ବିବାହ** appears above it in both languages. The groom’s nickname is spelled **ଶିବା** in the Odia version. Couple photographs remain in the welcome section and gallery.
- `ceremony-knot-cream.webp`, derived from `custom-images/knot-1.jpg`, is the red-and-cream cloth-knot divider above the program heading. Its white backdrop is transparent so the section’s cream background shows through, preserving the fabric colors. The original crop remains in `ceremony-knot.webp`. The other hand-tie photographs and knot sketch remain available in the reference folder.
- **“Little moments. Big feelings”** shows three photos in one horizontal row: `couple-3.jpeg` bottom-right, `couple-7.jpeg` bottom-right, and `couple-8.jpeg` bottom-left. The top-right and bottom-right selections from photo 4, and the top-right selection from photo 8, are commented out in `photos.gallery` and preserved for reuse.
- The crops remove the white collage dividers. Source pixel bounds `(left, top, right, bottom)` are `(647, 647, 1269, 1269)` for bottom-right and `(11, 647, 633, 1269)` for bottom-left, from the original 1280 × 1280 JPEGs. Each crop is 622 × 622 pixels.
- `photos.gallery` controls the selection, captions, intrinsic dimensions, and `fit`. Desktop and tablet show all three side by side; small screens keep one horizontal row with swipe scrolling and tap-to-enlarge controls.
- `ganesha-sketch.webp` preserves the exact pose of the original `ganesha.webp`. It uses a grayscale pencil treatment with transparent paper and linework in `#7b6952`, inspired by `custom-images/ganesh-sketch.jpg`. Petals still start at the original palm coordinates. Both the original and the reference remain untouched.
- The mantra is styled HTML text with a local Noto Serif Devanagari font subset (`assets/fonts/mantra.woff2`); its OFL license is alongside the font. The supplied mantra images are design references, not displayed banners.
- `jagannath-1.webp` and the older artwork files are retained for reuse but are not requested by the page while disabled. The temple is not displayed.
- `assets/ashoka-chakra.svg` is a crisp 24-spoke wheel drawn for the background. The supplied Konark wheel and Odissi artwork remain in the original reference folder.

To change a photo, put the new file in `assets/images/` and update its `src`, `alt`, and `caption` in `photos`. `position`, such as `"center 35%"`, adjusts the crop. Use `fit: "contain"` for a collage that should remain fully visible. Keep paths relative, without a leading `/`, for GitHub project sites.

If you change the hero filename, also update the image preload and static fallback in `index.html`.

The supplied `couple-images/wedding-invitation.mp4` says **5:00 PM**, while the confirmed wedding program starts at **6:00 PM**. It is preserved in the source folder but is not linked or copied into the published site. The downloadable PDF uses the confirmed 6:00 PM start.

### Original photos in Git: Base64 storage

**Base64 is a reversible encoding, not encryption or access control. Anyone with repository access can recover the original photos and video.** The repository is public, and public downloadability of these originals was accepted. Base64 text is roughly one-third larger than the original binary data.

`.gitattributes` applies the `wedding-base64` Git filter to `couple-images/`. `scripts/photo-storage.cjs` encodes files when Git stores them and decodes them for local use. Filenames stay the same; Git stores a `WEDDING-PHOTO-BASE64-V1` marker followed by Base64 text. GitHub's normal JPEG/video previews may not display these encoded files.

After cloning, install the local filter and restore the working copies:

```bash
git clone git@github.com:rodosingh/wedding-webpage.git
cd wedding-webpage
npm run photos:setup
```

This command needs Node.js but no npm dependencies. Run it once in every new clone before editing or committing originals. It sets the filter in that checkout's `.git/config`, restores encoded files, and leaves existing decoded local edits alone. Subsequent `git add` operations store Base64 while the files on your computer remain ordinary images/video. New originals can be added with `git add couple-images` and committed normally.

A raw encoded download can also be restored separately:

```bash
node scripts/photo-storage.cjs decode < downloaded-photo.jpeg > restored-photo.jpeg
```

Keep the input and output paths different. The same command works for the encoded video. `npm run test:photos` checks binary round trips, rejects malformed Base64, and verifies that setup preserves local edits.

Pages continues to load the optimized WebP images, avoiding Base64's extra transfer size. To use another original on the page, restore it locally, create an optimized copy in `assets/images/`, and update `photos` in `wedding-config.js`. The Pages workflow does not need the original-photo filter because it publishes the prepared website files only.

### Update the downloadable invitation

The hero and footer download links point to **`assets/invitation-aditya-priti.pdf`**. This is a real, locally hosted, two-page A5 PDF with selectable text, clickable venue links, and private contact guidance.

After changing names, dates, parents, venues, or contact details, regenerate it:

```bash
npm install
npx playwright install chromium
npm run invitation
```

The generator reads `wedding-config.js`, uses the same local images and fonts, checks that the layout fits, and writes the PDF. The page works without running this command, but an already generated PDF does not automatically change when the JavaScript configuration changes. Commit/upload the refreshed PDF along with the updated configuration.

The print layout lives in `scripts/generate-invitation.cjs`. Photos are resized inside the temporary print document, preserving the website images. On Linux, Playwright may require browser system libraries (`npx playwright install --with-deps chromium`).

## Publish on GitHub Pages

**Repository:** [rodosingh/wedding-webpage](https://github.com/rodosingh/wedding-webpage), public, with `main` as the deployment branch.

**Website:** <https://rodosingh.github.io/wedding-webpage/>.

GitHub Actions publishes the site on pushes to `main`. Making the repository public enables GitHub Pages on the existing free plan; no account upgrade is required.

### How this repository was set up

The existing GitHub CLI login for `rodosingh` was used to create the repository, initially private. The local project was initialized on `main`, connected over SSH, committed, and pushed:

```bash
gh repo create rodosingh/wedding-webpage --private \
  --description 'Aditya and Priti’s Odia wedding invitation'
git init -b main
git remote add origin git@github.com:rodosingh/wedding-webpage.git
git add .
git commit -m "Prepare wedding invitation for private GitHub Pages repository"
git push -u origin main
```

These are setup records, not commands to rerun in an already connected checkout. GitHub initially rejected Pages for the private repository on the current plan. The owner then chose public visibility and accepted that Base64 originals are publicly downloadable. The original-photo filter was configured, all nine originals were checked for exact binary round trips and committed, and repository visibility and Pages were configured as shown below.

`.gitignore` excludes design references, installed dependencies, local credentials, test output, and generated `site/` files. It does not exclude `couple-images/`.

`.github/workflows/deploy.yml` uses GitHub Actions to:

1. Check out `main` and select Node.js 22.
2. Configure GitHub Pages.
3. Run `npm run prepare:pages` to create the `site/` publishing directory.
4. Upload `site/` with `actions/upload-pages-artifact` and deploy it with `actions/deploy-pages`.

`scripts/prepare-site.cjs` copies the main page, CSS, JavaScript, active photo selections, referenced artwork, fonts and licenses, and the invitation PDF. It excludes commented-out images and unused assets from Pages, and refuses to publish if the configured private phone fields are populated. The originals, unused images, and commented-out code remain available in the public repository. No npm dependency installation, custom server, personal access token, or repository secret is needed by this workflow; GitHub supplies its short-lived workflow credentials.

Every file committed to this repository is public, including files excluded from `site/`. The mobile number is absent from the repository's configuration, contact links, and invitation PDF.

### Enable Pages and inspect deployments

The repository was made public and Pages enabled with **GitHub Actions** as the source using these GitHub CLI requests:

```bash
gh api --method PATCH repos/rodosingh/wedding-webpage -F private=false
gh api --method POST repos/rodosingh/wedding-webpage/pages \
  -f build_type=workflow
```

The equivalent Pages setting is in [Settings → Pages](https://github.com/rodosingh/wedding-webpage/settings/pages). Visibility and Pages are already configured; these setup requests do not need to be repeated. A push to `main` triggers deployment. To run one manually or inspect its progress:

```bash
gh workflow run deploy.yml --repo rodosingh/wedding-webpage --ref main
gh run list --repo rodosingh/wedding-webpage --workflow deploy.yml --limit 5
gh run watch RUN_ID --repo rodosingh/wedding-webpage --exit-status
```

Replace `RUN_ID` with the ID shown by `gh run list`. The workflow's `github-pages` environment reports the final website URL after a successful deployment. Verify the page, photo gallery, language switch, and PDF download at the published address. If a run fails, inspect it with `gh run view RUN_ID --repo rodosingh/wedding-webpage --log-failed`.

### Publish future updates

Edit and preview locally. When invitation details change, regenerate the PDF with `npm run invitation`. Then review and push the changed files:

```bash
npm run prepare:pages
git status --short
git add index.html styles.css script.js translations.js wedding-config.js assets
git commit -m "Update wedding invitation"
git push origin main
```

Stage README, workflow, script, or original-photo changes too if you edited them. Each push to `main` automatically publishes the latest version. You can also run **Publish wedding invitation** manually from the Actions tab. The PDF is deployed as committed, so it must be regenerated locally whenever its details change.

For a WhatsApp or social-media link-preview photograph, add an `og:image` meta tag to `index.html` using the full published URL, for example:

```html
<meta
  property="og:image"
  content="https://rodosingh.github.io/wedding-webpage/assets/images/couple-1.webp"
/>
```

## Development checks

```bash
npm install
npx playwright install chromium webkit
npm test
```

On Linux, `npx playwright install --with-deps chromium webkit` can install required system libraries. Tests cover desktop Chromium and iPhone/iPad WebKit emulations, widths from 320 to 1920 pixels, the PDF download, all three venue links, event/calendar times, Google/Outlook links, Apple and combined .ics downloads, calendar-dialog accessibility, WhatsApp message preparation, alternative RSVP modes, selected-photo loading and viewer navigation, English/Odia switching and persistence, form preservation, date-badge containment, responsive blessing source points, decorative-motion controls, reduced motion, and automated accessibility checks in both languages. Messages and form submissions are intercepted during tests.

Use `npm run format` to format the main source files. Text colors, type sizes, spacing, and animation settings live in `styles.css`. The website has no runtime npm packages.

The local fonts are Cormorant Garamond, DM Sans, Caveat, and Noto Serif Oriya. Their SIL Open Font License files are included in `assets/fonts/`.
