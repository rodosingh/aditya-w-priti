/** Wedding RSVP receiver. Paste into the Apps Script project bound to your private Sheet. */
const RSVP_HEADERS = [
  "Submitted at",
  "Name",
  "Email",
  "Phone",
  "Number of people",
  "Attendance",
  "Dietary preferences",
  "Message",
  "Submission ID",
];

function setupGuestList() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet)
    throw new Error(
      "Open Apps Script from Extensions in your guest-list spreadsheet.",
    );
  PropertiesService.getScriptProperties().setProperty(
    "RSVP_SPREADSHEET_ID",
    spreadsheet.getId(),
  );
  let sheet = spreadsheet.getSheetByName("RSVPs");
  if (!sheet) sheet = spreadsheet.insertSheet("RSVPs");
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setValues([RSVP_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, RSVP_HEADERS.length).setFontWeight("bold");
    sheet.autoResizeColumns(1, RSVP_HEADERS.length);
    sheet.hideColumns(9);
  }
  checkHeaders_(sheet);
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// This public endpoint never returns guest records or the private spreadsheet ID.
function doGet() {
  return json_({
    service: "wedding-rsvp",
    version: 1,
    ready: Boolean(
      PropertiesService.getScriptProperties().getProperty(
        "RSVP_SPREADSHEET_ID",
      ),
    ),
  });
}

function cleanText_(value, limit) {
  if (typeof value !== "string" || value.length > limit)
    throw new Error("Invalid field.");
  return value.trim();
}

function validateRsvp_(input) {
  if (!input || typeof input !== "object" || input._gotcha)
    throw new Error("Invalid RSVP.");
  const id = cleanText_(input.submissionId, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    throw new Error("Invalid submission ID.");
  const name = cleanText_(input.name, 120);
  const email = cleanText_(input.email || "", 254);
  const phone = cleanText_(input.phone || "", 32);
  if (!name || (!email && !phone))
    throw new Error("Name and a contact method are required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Invalid email.");
  if (
    phone &&
    (!/^\+?[\d\s().-]+$/.test(phone) ||
      !/^\d{8,15}$/.test(phone.replace(/\D/g, "")))
  )
    throw new Error("Invalid phone.");
  const people = Number(input.guests);
  if (!Number.isInteger(people) || people < 1 || people > 20)
    throw new Error("Invalid party size.");
  if (
    !["Joyfully accepts", "Attending the entire celebration"].includes(
      input.attendance,
    )
  )
    throw new Error("Invalid attendance choice.");
  return {
    id,
    name,
    email,
    phone,
    people,
    attendance: input.attendance,
    dietary: cleanText_(input.dietary || "", 500),
    message: cleanText_(input.message || "", 2000),
  };
}

// Prevent user-entered formulas from executing in Sheets or an exported CSV.
function cellText_(value) {
  return /^[=+\-@\t\r\n]/.test(value) ? "'" + value : value;
}

function checkHeaders_(sheet) {
  const actual = sheet.getRange(1, 1, 1, RSVP_HEADERS.length).getValues()[0];
  if (actual.join("\n") !== RSVP_HEADERS.join("\n"))
    throw new Error("The RSVP sheet columns were changed.");
}

function doPost(event) {
  let lock;
  let locked = false;
  try {
    const body = event && event.postData && event.postData.contents;
    if (!body || body.length > 12000) throw new Error("Invalid request.");
    const rsvp = validateRsvp_(JSON.parse(body));
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
      "RSVP_SPREADSHEET_ID",
    );
    if (!spreadsheetId) throw new Error("Run setupGuestList first.");
    lock = LockService.getScriptLock();
    locked = lock.tryLock(10000);
    if (!locked) throw new Error("Please retry.");
    const sheet =
      SpreadsheetApp.openById(spreadsheetId).getSheetByName("RSVPs");
    if (!sheet) throw new Error("The guest list is unavailable.");
    checkHeaders_(sheet);
    const lastRow = sheet.getLastRow();
    // The browser keeps the same ID after a timeout, so retries cannot add duplicates.
    const exists =
      lastRow > 1 &&
      sheet
        .getRange(2, 9, lastRow - 1, 1)
        .getValues()
        .some(function (row) {
          return row[0] === rsvp.id;
        });
    if (!exists) {
      const row = [
        new Date(),
        cellText_(rsvp.name),
        cellText_(rsvp.email),
        cellText_(rsvp.phone),
        rsvp.people,
        rsvp.attendance,
        cellText_(rsvp.dietary),
        cellText_(rsvp.message),
        rsvp.id,
      ];
      sheet.getRange(lastRow + 1, 2, 1, 3).setNumberFormat("@");
      sheet.getRange(lastRow + 1, 7, 1, 3).setNumberFormat("@");
      sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);
      sheet.getRange(lastRow + 1, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
      SpreadsheetApp.flush();
    }
    return json_({ ok: true, submissionId: rsvp.id });
  } catch (error) {
    return json_({
      ok: false,
      error:
        "We could not save this RSVP. Please check your details and try again.",
    });
  } finally {
    if (locked) lock.releaseLock();
  }
}
