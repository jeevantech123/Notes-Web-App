# Handoff

Read this first if you are a new session picking up Notes-Web-App.

## State (2026-11-08)

- The first build is **done and committed**. It meets R1–R7 in `problem.md` and everything in `spec.md`.
- `npm test` passes: 16 Playwright tests in `tests/01-initial-build.spec.js`.
- The app was also checked by hand in Chrome, served by Python's real `http.server`.

## Read these, in order

1. `CLAUDE.md`: project rules. Plain HTML/CSS/JS, localStorage only, no new features beyond the spec, commit after each major change, check in the browser after each change.
2. `problem.md`: the requirements R1–R7. **Never edit this file.**
3. `spec.md`: the behavior to build. If the spec and the code disagree, **ask the user** before changing either.
4. `decision.md`: why things are the way they are (D1–D7).

## How the code works (`app.js`)

- `notes` is the in-memory array of `{ id, text, updatedAt }`. `openNoteId` is the note loaded in the text area, or `null` when writing a new note.
- `loadNotes()` and `storeNotes()` read and write localStorage key `notes-web-app.notes`. Every change calls `storeNotes()` immediately.
- `saveNote()`, `openNote(id)`, and `deleteNote(id)` are the three user actions. Each one finishes by calling `renderList()`.
- `renderList()` rebuilds the `<ul>` newest-first. Each `<li>` has a `.note-open` button (title + date) and a `.note-delete` button.
- After any Save, the editor is cleared (decision D1). That is the only way to start a new note.

## Tests

- Setup: `npm install` (one time). Run: `npm test`.
- Playwright uses the **installed Chrome** (`channel: "chrome"`), so there's no need to run `npx playwright install`.
- `playwright.config.js` starts `node tests/server.js` on port 8123. Locale is `en-US` and timezone is `UTC`, so the date checks are predictable.
- Tests that check dates or ordering use `page.clock`. Note: `fastForward("01:00")` means **1 minute**. Use `"01:00:00"` for an hour.
- **Convention:** each change the user asks for gets a new file, `tests/NN-<short-name>.spec.js`, with tests for that change. Keep the older files. They catch regressions.

## Environment gotchas (this Windows machine)

- `python3` resolves to the Microsoft Store stub in `WindowsApps` and fails. Python 3.15 is installed at `C:\Users\jeeva\AppData\Local\Programs\Python\Python315\python.exe` but isn't on PATH. `py -m http.server 8000` works.
- Node 26 and Chrome 157 are installed.

## Workflow for a change request

1. Check that the change fits the spec. If it doesn't, tell the user. Don't edit `spec.md` or `problem.md` unless asked.
2. Make the change in `index.html`, `style.css`, or `app.js`.
3. Add `tests/NN-<change>.spec.js`, then run `npm test`. All tests must pass.
4. Check it in a real browser.
5. Add an entry to `decision.md` for any choice you made, and update this file's "State" section.
6. Commit.
