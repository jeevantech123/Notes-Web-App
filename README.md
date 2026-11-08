# Notes-Web-App

A small browser app for writing and saving quick notes. Type a note and click **Save** to add it to the list. Click a note to open it and edit it. Click **Delete** to remove it. Notes are kept in your browser's local storage, so they are still there after you close and reopen the browser. There is no account, no login, and no server-side storage.

## Run the app

From this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.

> On Windows, `python3` may open the Microsoft Store instead of Python. If it does, use `py -m http.server 8000` or `python -m http.server 8000`.

## Run the tests

The tests use [Playwright](https://playwright.dev) with the Chrome you already have installed. You need Node.js and Google Chrome.

One-time setup:

```
npm install
```

Run all tests:

```
npm test
```

The tests start their own small server on port 8123, so you don't need to start the app first.

## Files

| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The app |
| `problem.md` | Who has the problem, and the requirements R1–R7 |
| `spec.md` | How the app should work |
| `decision.md` | Decisions made while building, and why |
| `HANDOFF.md` | Notes for whoever (or whichever session) works on this next |
| `tests/` | Automated tests, one file per change (`01-initial-build.spec.js`, ...) |
| `playwright.config.js`, `package.json` | Test setup only. The app itself doesn't use Node. |
