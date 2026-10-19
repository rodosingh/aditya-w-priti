const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function receiver() {
  const rows = [
    [
      "Submitted at",
      "Name",
      "Email",
      "Phone",
      "Number of people",
      "Attendance",
      "Dietary preferences",
      "Message",
      "Submission ID",
    ],
  ];
  let acquired = 0;
  let released = 0;
  const sheet = {
    getLastRow: () => rows.length,
    getRange(row, column, height = 1, width = 1) {
      return {
        getValues: () =>
          rows
            .slice(row - 1, row - 1 + height)
            .map((values) => values.slice(column - 1, column - 1 + width)),
        setNumberFormat() {
          return this;
        },
        setValues(values) {
          values.forEach((value, index) => {
            rows[row - 1 + index] ||= [];
            rows[row - 1 + index].splice(column - 1, width, ...value);
          });
          return this;
        },
      };
    },
  };
  const context = vm.createContext({
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (body) => ({
        body,
        setMimeType() {
          return this;
        },
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: () => "private-sheet-id" }),
    },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => sheet }),
      flush() {},
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          acquired++;
          return true;
        },
        releaseLock: () => {
          released++;
        },
      }),
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "Code.gs"), "utf8"),
    context,
  );
  return {
    rows,
    post: (input) =>
      JSON.parse(
        context.doPost({
          postData: {
            contents: typeof input === "string" ? input : JSON.stringify(input),
          },
        }).body,
      ),
    get: () => JSON.parse(context.doGet().body),
    locks: () => ({ acquired, released }),
  };
}
const valid = {
  submissionId: "7c57497e-f350-4b48-8308-20f76b202b9d",
  name: "Taylor Guest",
  email: "taylor@example.com",
  phone: "",
  attendance: "Joyfully accepts",
  guests: "3",
  dietary: "Vegetarian",
  message: "See you there!",
  _gotcha: "",
};

test("the receiver stores the requested columns and acknowledges only the matching submission", () => {
  const service = receiver();
  assert.deepEqual(service.post(valid), {
    ok: true,
    submissionId: valid.submissionId,
  });
  assert.equal(service.rows.length, 2);
  assert.deepEqual(Array.from(service.rows[1].slice(1)), [
    valid.name,
    valid.email,
    "",
    3,
    valid.attendance,
    valid.dietary,
    valid.message,
    valid.submissionId,
  ]);
  assert.deepEqual(service.locks(), { acquired: 1, released: 1 });
});

test("retries are idempotent and a phone-only RSVP is valid", () => {
  const service = receiver();
  const input = {
    ...valid,
    email: "",
    phone: "+1 202 555 0123",
    attendance: "Attending the entire celebration",
  };
  assert.equal(service.post(input).ok, true);
  assert.equal(service.post(input).ok, true);
  assert.equal(service.rows.length, 2);
  assert.equal(service.rows[1][3], "'+1 202 555 0123");
  assert.deepEqual(service.locks(), { acquired: 2, released: 2 });
});

test("invalid, oversized, incomplete, and honeypot submissions are not saved", () => {
  for (const changes of [
    { name: " " },
    { email: "", phone: "" },
    { email: "invalid" },
    { phone: "12" },
    { phone: "hello12345678" },
    { guests: 0 },
    { guests: 21 },
    { guests: 1.5 },
    { attendance: "unknown" },
    { submissionId: "bad" },
    { message: "x".repeat(2001) },
    { _gotcha: "spam" },
  ]) {
    const service = receiver();
    assert.equal(
      service.post({ ...valid, ...changes }).ok,
      false,
      JSON.stringify(changes),
    );
    assert.equal(service.rows.length, 1);
  }
  const service = receiver();
  assert.equal(service.post("{invalid JSON").ok, false);
  assert.equal(service.rows.length, 1);
});

test("guest text cannot become a spreadsheet formula and GET never lists guest data", () => {
  const service = receiver();
  assert.equal(
    service.post({
      ...valid,
      name: '=HYPERLINK("https://example.com")',
      message: "@SUM(1,2)",
    }).ok,
    true,
  );
  assert.equal(service.rows[1][1][0], "'");
  assert.equal(service.rows[1][7][0], "'");
  assert.deepEqual(service.get(), {
    service: "wedding-rsvp",
    version: 1,
    ready: true,
  });
  assert.equal(
    JSON.stringify(service.get()).includes("private-sheet-id"),
    false,
  );
});

test("changed sheet columns fail safely and release the write lock", () => {
  const service = receiver();
  service.rows[0][0] = "Changed header";
  assert.equal(service.post(valid).ok, false);
  assert.equal(service.rows.length, 1);
  assert.deepEqual(service.locks(), { acquired: 1, released: 1 });
});
