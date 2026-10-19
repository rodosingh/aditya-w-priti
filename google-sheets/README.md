# Connect the private guest list

The invitation stays on GitHub Pages. A small Google Apps Script writes submissions to your private Google Sheet; guests can submit without a Google account. Guest records are never committed to GitHub or returned by the public endpoint.

1. Create a Google Sheet named **Aditya & Priti — Guest list**. Keep its sharing setting **Restricted**.
2. Open **Extensions → Apps Script** from that Sheet. Replace the editor's contents with [Code.gs](Code.gs), then save.
3. Select **setupGuestList** at the top of the editor and click **Run**. Authorize access for your own script. This creates the **RSVPs** tab without erasing existing responses.
4. Select **Deploy → New deployment → Web app**. Choose **Execute as: Me** and **Who has access: Anyone**, then deploy. “Anyone” applies to submitting through the script; keep the Sheet itself restricted.
5. Copy the web app URL ending in **/exec**. This is a public submission URL, not your Sheet's edit link. Add it to `rsvp.endpoint` in `wedding-config.js` with `rsvp.mode: "google-sheets"`, then publish the site.

If your Google Workspace account does not offer “Anyone”, its administrator restricts anonymous web apps. Use an account that permits them.

The visible columns are **Submitted at, Name, Email, Phone, Number of people, Attendance, Dietary preferences, Message**. A hidden **Submission ID** column prevents duplicate rows when a guest retries after a connection failure. Unhide it if needed, but keep all column headers and their order intact. Use **File → Download → Comma-separated values (.csv)** for a simple export.

The form accepts an email address, a phone number, or both. A successful browser confirmation is shown only after the receiver acknowledges the matching submission ID. The receiver validates fields, blocks spreadsheet formulas, and never exposes a list of responses. A browser timeout preserves the form and reuses its submission ID on retry.

Opening the `/exec` URL shows a small readiness response and no guest data. If it opens a Google sign-in screen, check the deployment's **Anyone** access setting. The production URL ends in `/exec`; `/dev` is only for script editors.

After changing `Code.gs`, use **Deploy → Manage deployments → Edit → New version → Deploy** to update the existing web app without changing its URL. Keep `setupGuestList` bound to the Sheet you intend to use. The Sheet uses its own time-zone setting for submission timestamps.
