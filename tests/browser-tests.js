// In-browser tests for Notes-Web-App. Plain JavaScript, nothing to install.
// Serve the project folder and open tests/test.html, e.g.
//   py -m http.server 8001   then open http://localhost:8001/tests/test.html
// Each test names the requirement (problem.md) or spec rule (spec.md) it checks.
"use strict";

const STORAGE_KEY = "notes-web-app.notes";
const frame = document.getElementById("app-frame");
const results = document.getElementById("results");
const summary = document.getElementById("summary");

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ---- Assertions ----

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

// ---- Driving the app inside the iframe ----

const appWindow = () => frame.contentWindow;
const $ = (selector) => frame.contentDocument.querySelector(selector);
const $$ = (selector) => [...frame.contentDocument.querySelectorAll(selector)];

// Load (or reload) the app. A reload is a fresh page that must read localStorage again.
function loadApp() {
  return new Promise((resolve) => {
    frame.addEventListener("load", resolve, { once: true });
    if (frame.contentWindow.location.pathname.endsWith("/index.html")) {
      frame.contentWindow.location.reload();
    } else {
      frame.src = "../index.html";
    }
  });
}

function writeAndSave(text) {
  $("#note-text").value = text;
  $("#save-button").click();
}

const textAreaValue = () => $("#note-text").value;
const titles = () => $$("#note-list .note-title").map((el) => el.textContent);
const dates = () => $$("#note-list .note-date").map((el) => el.textContent);
const storedTexts = () => storedNotes().map((note) => note.text);

function storedNotes() {
  return JSON.parse(appWindow().localStorage.getItem(STORAGE_KEY) || "[]");
}

function itemWithTitle(title) {
  const item = $$("#note-list .note-item").find(
    (li) => li.querySelector(".note-title").textContent === title
  );
  assert(item, `no list item titled "${title}"`);
  return item;
}

const openNote = (title) => itemWithTitle(title).querySelector(".note-open").click();
const deleteNote = (title) => itemWithTitle(title).querySelector(".note-delete").click();

// Fake clock: from now on the app's Date.now() returns this time. Lasts until the next reload.
function setTime(isoString) {
  const time = new Date(isoString).getTime();
  appWindow().Date.now = () => time;
  return time;
}

// ---- Tests ----

test("spec: page has a text area, a Save button, and a list of saved notes", () => {
  assert($("textarea#note-text"), "text area is missing");
  assertEqual($("#save-button").textContent.trim(), "Save", "Save button text");
  assert($("ul#note-list"), "note list is missing");
  assert(!$("#empty-message").hidden, '"No notes yet." should show when the list is empty');
});

test("R1/R2: typing a note and saving adds it to the list", () => {
  writeAndSave("Buy milk");
  assertEqual(titles(), ["Buy milk"], "titles");
  assert($("#empty-message").hidden, "empty message should be hidden");
});

test("spec: after saving, the text area is cleared for a new note", () => {
  writeAndSave("First");
  assertEqual(textAreaValue(), "", "text area after save");
  writeAndSave("Second");
  assertEqual($$("#note-list .note-item").length, 2, "number of notes");
});

test("spec: empty and whitespace-only notes are not saved", () => {
  $("#save-button").click();
  writeAndSave("   \n\t  ");
  assertEqual(titles(), [], "titles");
  assertEqual(storedNotes(), [], "stored notes");
});

test("spec: list item shows the first line of the note and its date", () => {
  const time = setTime("2026-03-14T09:30:00Z");
  writeAndSave("Shopping list\neggs\nbread");
  assertEqual(titles(), ["Shopping list"], "titles");
  // Compare with the browser's own locale so the test works in any language.
  const day = new Date(time).toLocaleDateString(undefined, { dateStyle: "medium" });
  assert(dates()[0].includes(day), `date "${dates()[0]}" should include "${day}"`);
});

test("spec: list is ordered newest first", () => {
  setTime("2026-03-14T09:00:00Z");
  writeAndSave("Oldest");
  setTime("2026-03-14T10:00:00Z");
  writeAndSave("Middle");
  setTime("2026-03-14T11:00:00Z");
  writeAndSave("Newest");
  assertEqual(titles(), ["Newest", "Middle", "Oldest"], "titles");
});

test("R3: clicking a note loads its full text into the text area", () => {
  const fullText = "Meeting notes\nTalk about budget\nBook room";
  writeAndSave(fullText);
  openNote("Meeting notes");
  assertEqual(textAreaValue(), fullText, "text area");
});

test("R5: saving while a note is open updates it instead of adding a new one", () => {
  setTime("2026-03-14T09:00:00Z");
  writeAndSave("Draft one");
  setTime("2026-03-14T10:00:00Z");
  writeAndSave("Other note");
  setTime("2026-03-14T11:00:00Z");

  openNote("Draft one");
  writeAndSave("Draft two");

  // The edited note has the newest change date, so it moves to the top.
  assertEqual(titles(), ["Draft two", "Other note"], "titles");
  assertEqual(storedNotes().length, 2, "number of stored notes");
  assertEqual(textAreaValue(), "", "text area after save");
});

test("R5: after saving an edit, the next save makes a new note", () => {
  writeAndSave("Original");
  openNote("Original");
  writeAndSave("Edited");
  writeAndSave("Brand new");
  assertEqual(titles().sort(), ["Brand new", "Edited"], "titles");
});

test("R5: clearing an open note and saving does not change or delete it", () => {
  writeAndSave("Keep me");
  openNote("Keep me");
  writeAndSave("");
  assertEqual(titles(), ["Keep me"], "titles");
  assertEqual(storedTexts(), ["Keep me"], "stored texts");
});

test("R5: saving an open note without changes keeps its date", () => {
  setTime("2026-03-14T09:00:00Z");
  writeAndSave("Unchanged");
  const before = storedNotes()[0].updatedAt;
  setTime("2026-03-14T12:00:00Z");
  openNote("Unchanged");
  $("#save-button").click();
  assertEqual(storedNotes()[0].updatedAt, before, "updatedAt");
});

test("R6: the Delete button removes a note", () => {
  writeAndSave("Keep");
  writeAndSave("Remove");
  deleteNote("Remove");
  assertEqual(titles(), ["Keep"], "titles");
  assertEqual(storedTexts(), ["Keep"], "stored texts");
});

test("R6: deleting the open note clears the text area", () => {
  writeAndSave("Open then delete");
  openNote("Open then delete");
  assertEqual(textAreaValue(), "Open then delete", "text area after opening");
  deleteNote("Open then delete");
  assertEqual(textAreaValue(), "", "text area after delete");
  assert(!$("#empty-message").hidden, "empty message should show again");
});

test("R4: every change is written to localStorage straight away", () => {
  writeAndSave("Stored");
  assertEqual(storedTexts(), ["Stored"], "after add");
  openNote("Stored");
  writeAndSave("Stored and edited");
  assertEqual(storedTexts(), ["Stored and edited"], "after edit");
  deleteNote("Stored and edited");
  assertEqual(storedNotes(), [], "after delete");
});

// A page reload starts the app from nothing but localStorage. A real browser
// restart can't be done from inside a page; see the manual checklist for that.
test("R4: notes are still there after the page is reloaded", async () => {
  writeAndSave("Survives reload\nsecond line");
  writeAndSave("Another one");
  await loadApp();
  assertEqual(titles().sort(), ["Another one", "Survives reload"], "titles after reload");
  openNote("Survives reload");
  assertEqual(textAreaValue(), "Survives reload\nsecond line", "text area");
});

test("R7: no login or account, and no other sites are contacted", () => {
  assertEqual($$('input[type="password"]').length, 0, "password fields");
  const pageText = frame.contentDocument.body.textContent;
  assert(!/log ?in|sign ?in|sign ?up|account/i.test(pageText), "page mentions login or account");

  writeAndSave("No login needed");
  assertEqual(titles(), ["No login needed"], "titles");

  // Every file the page loaded must come from this same server.
  const loaded = appWindow().performance.getEntriesByType("resource").map((e) => e.name);
  assert(loaded.length > 0, "expected the page to load style.css and app.js");
  for (const url of loaded) {
    assert(url.startsWith(location.origin), `page loaded a file from another site: ${url}`);
  }
});

test("robustness: broken data in localStorage does not break the page", async () => {
  appWindow().localStorage.setItem(STORAGE_KEY, "not json");
  await loadApp();
  assertEqual(titles(), [], "titles");
  writeAndSave("Still works");
  assertEqual(titles(), ["Still works"], "titles");
});

// ---- Runner ----

function showResult(name, error) {
  const row = document.createElement("li");
  row.className = error ? "fail" : "pass";
  row.textContent = error ? `FAIL  ${name}\n      ${error.message}` : `PASS  ${name}`;
  results.append(row);
}

// The tests share localStorage with the app on this origin, so any notes
// already saved here are put back when the run ends.
async function runAll() {
  results.replaceChildren();
  summary.className = "";
  summary.textContent = "Running...";
  document.body.dataset.status = "running";

  const backup = localStorage.getItem(STORAGE_KEY);
  let passed = 0;
  try {
    for (const { name, fn } of tests) {
      localStorage.removeItem(STORAGE_KEY);
      await loadApp();
      try {
        await fn();
        passed++;
        showResult(name);
      } catch (error) {
        showResult(name, error);
      }
    }
  } finally {
    if (backup === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, backup);
    await loadApp();
  }

  const allPassed = passed === tests.length;
  summary.textContent = `${passed} of ${tests.length} tests passed`;
  summary.className = allPassed ? "pass" : "fail";
  document.title = `${allPassed ? "PASS" : "FAIL"} - Notes tests`;
  document.body.dataset.status = allPassed ? "passed" : "failed";
}

document.getElementById("run-again").addEventListener("click", runAll);
runAll();
