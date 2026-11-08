// Tests for the first build of Notes-Web-App.
// Each test names the requirement (problem.md) or spec rule (spec.md) it checks.
const { test, expect } = require("@playwright/test");

const STORAGE_KEY = "notes-web-app.notes";

// Helpers that act like a user on the page.
const textArea = (page) => page.locator("#note-text");
const saveButton = (page) => page.getByRole("button", { name: "Save" });
const listItems = (page) => page.locator("#note-list .note-item");
const itemTitles = (page) => page.locator("#note-list .note-title");

async function writeAndSave(page, text) {
  await textArea(page).fill(text);
  await saveButton(page).click();
}

async function storedNotes(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "[]"), STORAGE_KEY);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("spec: page has a text area, a Save button, and a list of saved notes", async ({ page }) => {
  await expect(textArea(page)).toBeVisible();
  await expect(saveButton(page)).toBeVisible();
  await expect(page.locator("#note-list")).toBeAttached();
  await expect(page.locator("#empty-message")).toBeVisible();
});

test("R1/R2: typing a note and saving adds it to the list", async ({ page }) => {
  await writeAndSave(page, "Buy milk");

  await expect(listItems(page)).toHaveCount(1);
  await expect(itemTitles(page).first()).toHaveText("Buy milk");
  await expect(page.locator("#empty-message")).toBeHidden();
});

test("spec: after saving, the text area is cleared for a new note", async ({ page }) => {
  await writeAndSave(page, "First");
  await expect(textArea(page)).toHaveValue("");

  await writeAndSave(page, "Second");
  await expect(listItems(page)).toHaveCount(2);
});

test("spec: empty and whitespace-only notes are not saved", async ({ page }) => {
  await saveButton(page).click();
  await writeAndSave(page, "   \n\t  ");

  await expect(listItems(page)).toHaveCount(0);
  expect(await storedNotes(page)).toEqual([]);
});

test("spec: list item shows the first line of the note and its date", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-03-14T09:30:00Z") });
  await page.reload();

  await writeAndSave(page, "Shopping list\neggs\nbread");

  await expect(itemTitles(page).first()).toHaveText("Shopping list");
  await expect(page.locator("#note-list .note-date").first()).toHaveText("Mar 14, 2026, 9:30 AM");
});

test("spec: list is ordered newest first", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-03-14T09:00:00Z") });
  await page.reload();

  await writeAndSave(page, "Oldest");
  await page.clock.fastForward("01:00:00");
  await writeAndSave(page, "Middle");
  await page.clock.fastForward("01:00:00");
  await writeAndSave(page, "Newest");

  await expect(itemTitles(page)).toHaveText(["Newest", "Middle", "Oldest"]);
});

test("R3: clicking a note loads its full text into the text area", async ({ page }) => {
  const fullText = "Meeting notes\nTalk about budget\nBook room";
  await writeAndSave(page, fullText);

  await itemTitles(page).first().click();

  await expect(textArea(page)).toHaveValue(fullText);
});

test("R5: saving while a note is open updates it instead of adding a new one", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-03-14T09:00:00Z") });
  await page.reload();

  await writeAndSave(page, "Draft one");
  await page.clock.fastForward("01:00:00");
  await writeAndSave(page, "Other note");
  await page.clock.fastForward("01:00:00");

  await page.locator("#note-list .note-item", { hasText: "Draft one" }).locator(".note-open").click();
  await textArea(page).fill("Draft two");
  await saveButton(page).click();

  await expect(listItems(page)).toHaveCount(2);
  // The edited note has the newest change date, so it moves to the top.
  await expect(itemTitles(page)).toHaveText(["Draft two", "Other note"]);
  await expect(page.locator("#note-list .note-date").first()).toHaveText("Mar 14, 2026, 11:00 AM");
  await expect(textArea(page)).toHaveValue("");
});

test("R5: after saving an edit, the next save makes a new note", async ({ page }) => {
  await writeAndSave(page, "Original");
  await itemTitles(page).first().click();
  await textArea(page).fill("Edited");
  await saveButton(page).click();

  await writeAndSave(page, "Brand new");

  await expect(listItems(page)).toHaveCount(2);
});

test("R5: clearing an open note and saving does not change or delete it", async ({ page }) => {
  await writeAndSave(page, "Keep me");
  await itemTitles(page).first().click();
  await textArea(page).fill("");
  await saveButton(page).click();

  await expect(itemTitles(page)).toHaveText(["Keep me"]);
});

test("R6: the Delete button removes a note", async ({ page }) => {
  await writeAndSave(page, "Keep");
  await writeAndSave(page, "Remove");

  await page.locator("#note-list .note-item", { hasText: "Remove" })
    .getByRole("button", { name: "Delete" }).click();

  await expect(itemTitles(page)).toHaveText(["Keep"]);
  expect((await storedNotes(page)).map((n) => n.text)).toEqual(["Keep"]);
});

test("R6: deleting the open note clears the text area", async ({ page }) => {
  await writeAndSave(page, "Open then delete");
  await itemTitles(page).first().click();
  await expect(textArea(page)).toHaveValue("Open then delete");

  await page.locator(".note-delete").click();

  await expect(textArea(page)).toHaveValue("");
  await expect(listItems(page)).toHaveCount(0);
  await expect(page.locator("#empty-message")).toBeVisible();
});

test("R4: every change is written to localStorage straight away", async ({ page }) => {
  await writeAndSave(page, "Stored");
  expect((await storedNotes(page)).map((n) => n.text)).toEqual(["Stored"]);

  await itemTitles(page).first().click();
  await textArea(page).fill("Stored and edited");
  await saveButton(page).click();
  expect((await storedNotes(page)).map((n) => n.text)).toEqual(["Stored and edited"]);

  await page.locator(".note-delete").click();
  expect(await storedNotes(page)).toEqual([]);
});

test("R4: notes are still there after the browser is closed and reopened", async ({ page, browser }) => {
  await writeAndSave(page, "Survives restart\nsecond line");
  await writeAndSave(page, "Another one");

  // Save the browser's storage, close it, and open a fresh browser with that storage.
  const savedState = await page.context().storageState();
  await page.context().close();

  const reopened = await browser.newContext({ storageState: savedState });
  const newPage = await reopened.newPage();
  await newPage.goto("/");

  await expect(itemTitles(newPage)).toHaveText(["Another one", "Survives restart"]);
  await itemTitles(newPage).nth(1).click();
  await expect(textArea(newPage)).toHaveValue("Survives restart\nsecond line");
  await reopened.close();
});

test("R7: no login or account is needed and no other sites are contacted", async ({ page, baseURL }) => {
  const requests = [];
  page.on("request", (req) => requests.push(req.url()));
  await page.reload();

  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.getByText(/log ?in|sign ?in|sign ?up|account/i)).toHaveCount(0);

  // The app works right away without any sign-in step.
  await writeAndSave(page, "No login needed");
  await expect(listItems(page)).toHaveCount(1);

  expect(requests.length).toBeGreaterThan(0);
  for (const url of requests) expect(url.startsWith(baseURL)).toBe(true);
});

test("robustness: broken data in localStorage does not break the page", async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, "not json"), STORAGE_KEY);
  await page.reload();

  await expect(listItems(page)).toHaveCount(0);
  await writeAndSave(page, "Still works");
  await expect(itemTitles(page)).toHaveText(["Still works"]);
});
