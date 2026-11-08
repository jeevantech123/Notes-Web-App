# Decision records

Decisions made while building Notes-Web-App, newest last. Each entry says what was decided, why, and what else was considered.

---

## D1. Clear the text area after every Save (no "New note" button)

- **Date:** 2026-11-08
- **Context:** The spec says "saving while a note is open updates that note". It has no way to close a note. Without one, once you opened a note you could never create a new one.
- **Decision:** After any successful Save, the text area empties and no note is open. The next Save creates a new note.
- **Why:** It fixes the gap without adding UI that the spec doesn't list. Chosen by the user.
- **Alternative rejected:** A "New note" button. It adds a feature the spec doesn't describe.

## D2. Use Playwright for tests, driving the installed Chrome

- **Date:** 2026-11-08
- **Context:** The requirements are about a real page and real `localStorage`, including surviving a browser restart. That needs a real browser.
- **Decision:** `@playwright/test` as a dev dependency, with `channel: "chrome"` so it uses the Chrome already on the machine and downloads no browsers. Run with `npm test`. Chosen by the user.
- **Alternative rejected:** A hand-written Chrome DevTools Protocol script with no dependencies. Nothing to install, but much more custom test code.
- **Note:** Node is used only for tests. The app is still plain HTML/CSS/JS served by Python.

## D3. Tests use their own small Node server on port 8123

- **Context:** The app is served with `python3 -m http.server 8000`. On the dev machine, `python3` is a broken Microsoft Store shortcut, and Python 3.15 isn't on PATH.
- **Decision:** `tests/server.js` is a static file server of about 30 lines. Playwright starts it automatically. Port 8123 avoids clashing with the app on 8000.
- **Why:** The tests then work on any machine that has Node, whatever the Python setup. The app was also checked by hand through Python's real `http.server` (Python 3.15).

## D4. One test file per change

- **Decision:** `tests/01-initial-build.spec.js` covers the first build. Each later change requested by the user gets its own `tests/NN-<change>.spec.js`. `npm test` always runs all of them, so older behavior is checked for regressions.
- **Why:** The user asked for a test for the first build and a test for each change.

## D5. Data format in localStorage

- **Decision:** One key, `notes-web-app.notes`, holding a JSON array of `{ id, text, updatedAt }`. `updatedAt` is a millisecond timestamp.
- **Why:** This is the simplest shape that supports the spec's features: first line, last-changed date, newest-first order, and edit/delete by id.
- **Robustness:** If the stored value is missing or isn't valid JSON, the app starts with an empty list instead of crashing.

## D6. Small behavior choices the spec doesn't spell out

- **Title** = the first *non-blank* line, trimmed. A note that starts with a blank line still gets a useful title. Long titles are cut off with "…" by CSS.
- **Date** is shown in the browser's locale, e.g. "Mar 14, 2026, 9:30 AM".
- **Saving an open note with no changes** keeps its date. The date means "last changed", and nothing changed.
- **Saving an open note after emptying the text area** does nothing. The note is kept as it was. "Empty notes are not saved" means the note isn't overwritten with nothing, and it isn't deleted either.
- **Deleting the open note** also clears the text area, so a later Save doesn't refer to a note that no longer exists.
- **No delete confirmation.** The spec doesn't ask for one.
- **The open note is outlined in blue** in the list. This is a visual cue only, not a new feature.
- **"No notes yet."** is shown when the list is empty.
- **The list item is a `<button>`**, so notes can be opened with the keyboard as well as the mouse.

## D7. Did not edit existing files

- `problem.md`, `spec.md`, and `CLAUDE.md` were left unchanged, as instructed. The run-command problem on Windows is documented in README.md instead.
