# Handoff

Read this first if you are a new session picking up Notes-Web-App.

## State (2026-11-13)

- The first build is **done and committed**. It meets R1–R7 in `problem.md` and everything in `spec.md`.
- Tests that need no install were added (2026-11-13). All 17 browser tests and all 13 Python checks pass.
- On 2026-11-08, `npm test` passed: 16 Playwright tests in `tests/01-initial-build.spec.js`. `node_modules` has since been deleted, so run `npm install` before `npm test`.
- The app was also checked by hand in Chrome, served by Python's real `http.server`.

## Read these, in order

1. `CLAUDE.md`: project rules. Plain HTML/CSS/JS, localStorage only, no new features beyond the spec, commit after each major change, check in the browser after each change.
2. `problem.md`: the requirements R1–R7. **Never edit this file.**
3. `spec.md`: the behavior to build. If the spec and the code disagree, **ask the user** before changing either.
4. `docs/decisions.md`: why things are the way they are (D1–D7).

## How the code works (`app.js`)

- `notes` is the in-memory array of `{ id, text, updatedAt }`. `openNoteId` is the note loaded in the text area, or `null` when writing a new note.
- `loadNotes()` and `storeNotes()` read and write localStorage key `notes-web-app.notes`. Every change calls `storeNotes()` immediately.
- `saveNote()`, `openNote(id)`, and `deleteNote(id)` are the three user actions. Each one finishes by calling `renderList()`.
- `renderList()` rebuilds the `<ul>` newest-first. Each `<li>` has a `.note-open` button (title + date) and a `.note-delete` button.
- After any Save, the editor is cleared (decision D1). That is the only way to start a new note.

## Tests

There are three ways to test, and only Playwright needs Node. `tests/TESTING.md` has the full instructions and a manual checklist (including a real browser restart for R4).

### Browser tests (no install)

- `tests/test.html` + `tests/browser-tests.js`: 17 tests for R1–R7 and the spec, plain JS. They drive the real app in an iframe.
- Serve on **port 8001**, not 8000: `py -m http.server 8001`. Then open http://localhost:8001/tests/test.html. localStorage is separate per port, so test runs never touch real notes. If the tests are run on 8000 anyway, the page backs up the notes and restores them when the run ends.
- From a terminal (with the server on 8001 running in another terminal):

  ```powershell
  & "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --user-data-dir="$env:TEMP\notes-test-chrome" --virtual-time-budget=10000 --dump-dom http://localhost:8001/tests/test.html 2>$null | Select-String -CaseSensitive 'id="summary"|FAIL  '
  ```

  A pass prints `17 of 17 tests passed`. Each failure adds a `FAIL  <name>` line. When the run ends, `<body data-status>` is `passed` or `failed`.
- Fake clock: `setTime(iso)` replaces `Date.now` inside the iframe. A reload resets it, so call it again after `loadApp()`.
- Every test starts with an empty localStorage key and a freshly loaded app.

### Python checks (no install)

- Run: `py -m unittest discover -s tests -v`. This uses `tests/test_static.py`, standard library only, with no pip and no `.venv`.
- **Project rules:** the spec's elements are in `index.html`. The page loads only `style.css` and `app.js`. There are no addresses of other sites and no network calls. Notes use localStorage. There's no login.
- **Server:** checks that Python's `http.server` serves `/`, `/style.css`, `/app.js`, and `/tests/test.html`.
- **Public repo:** fails on `.jsonl` transcripts, `node_modules`, `.venv`, `.env`, things that look like API keys or passwords, home-folder paths, and email addresses in any file git would commit. **Run before every push.** The repo is public.

### Playwright (optional, needs Node)

- Setup: `npm install` (one time). Run: `npm test`. `node_modules` is gitignored and must never be committed.
- Playwright uses the **installed Chrome** (`channel: "chrome"`), so there's no need to run `npx playwright install`.
- `playwright.config.js` starts `node tests/server.js` on port 8123. Locale is `en-US` and timezone is `UTC`, so the date checks are predictable.
- Tests that check dates or ordering use `page.clock`. Note: `fastForward("01:00")` means **1 minute**. Use `"01:00:00"` for an hour.

### Convention

- Each change the user asks for gets its own tests. Add `test(...)` blocks to `tests/browser-tests.js` under a comment naming the change. If Playwright is still used, also add a new `tests/NN-<short-name>.spec.js` file.
- Keep the older tests. They catch regressions.

## Environment gotchas (this Windows machine)

- `python3` resolves to the Microsoft Store stub in `WindowsApps` and fails. Python 3.15 is installed but isn't on PATH. Use the `py` launcher instead, e.g. `py -m http.server 8000`.
- Node 26 and Chrome 157 are installed. Chrome is at `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Headless Chrome prints harmless `Missing value path for key ...` warnings. `2>$null` hides them.

## Workflow for a change request

1. Check that the change fits the spec. If it doesn't, tell the user. Don't edit `spec.md` or `problem.md` unless asked.
2. Make the change in `index.html`, `style.css`, or `app.js`.
3. Add tests for the change (see "Convention" above). Run the browser tests and the Python checks. If `node_modules` is installed, run `npm test` too. All must pass.
4. Check it in a real browser.
5. Add an entry to `docs/decisions.md` for any choice you made, and update this file's "State" section.
6. Commit.
