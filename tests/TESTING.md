# Testing without Node or a virtual environment

The Playwright tests (`npm test`) need `node_modules`, which is not part of the app and is not committed. These three methods need nothing beyond what the app already needs: a browser and Python.

| Method | Checks | Needs |
|---|---|---|
| 1. Browser test page (`tests/test.html`) | Behavior: R1–R7 and the spec | A browser |
| 2. Python checks (`tests/test_static.py`) | Project rules, the Python server, and that the repo is safe to publish | Python's standard library |
| 3. Manual checklist (below) | What automation can't do, such as closing the real browser | A person |

## 1. Browser test page

```
py -m http.server 8001
```

(`python3 -m http.server 8001` on macOS/Linux.) Then open http://localhost:8001/tests/test.html. The 17 tests run on their own and show PASS or FAIL. The app runs in the frame under the results. Click **Run again** to repeat the tests.

- **Use a different port from the app (8001, not 8000).** localStorage is kept separately for each port, so your real notes on port 8000 are never touched. If you do run the tests on 8000, the page saves your notes before the run and puts them back after it.
- The tests use a fake clock (they replace `Date.now` inside the frame), so the date and order checks don't depend on the time of day.
- A page reload is used as the stand-in for "browser closed and reopened" (R4). Item 4 of the manual checklist covers a real restart.

Optional, from the command line with headless Chrome (while the server is running):

```
chrome --headless --dump-dom --virtual-time-budget=10000 http://localhost:8001/tests/test.html
```

When the run ends, `<body>` has `data-status="passed"` or `data-status="failed"`, and the page title starts with `PASS` or `FAIL`.

## 2. Python checks (standard library only)

```
py -m unittest discover -s tests -v
```

(`python3 -m unittest discover -s tests -v` on macOS/Linux.) No `pip install` and no `.venv`.

- **Project rules:** `index.html` has the text area, Save button, and list from the spec. The page loads only `style.css` and `app.js`. There are no addresses of other sites and no `fetch`/`XMLHttpRequest`/`WebSocket` calls. Notes use `localStorage`. There is no password field and no login text.
- **Python server:** starts Python's built-in `http.server` (the same server as the run command) on a free port and checks that `/`, `/style.css`, `/app.js`, and `/tests/test.html` are served.
- **Public repo:** looks at every file git would commit and fails on:
  - `.jsonl` transcripts, `node_modules`, `.venv`, or `.env`
  - things that look like API keys, tokens, private keys, or passwords
  - home folder paths (they contain a user name) and email addresses

  Run this before every push.

## 3. Manual checklist

Serve the app on port 8000 (`py -m http.server 8000`) and open http://localhost:8000.

1. **R1, R2:** Type `Buy milk` and click Save. It appears in the list with today's date, and the text area empties.
2. **Spec:** Click Save with the text area empty, then again with only spaces. Nothing is added.
3. **R3:** Save a note with three lines. Click it in the list. All three lines appear in the text area.
4. **R4, real restart:** Save two notes. Close **every** browser window, so the browser fully quits. Open it again and go to http://localhost:8000. Both notes are there, in the same order.
5. **R5:** Open a note, change it, and click Save. The list still has the same number of notes. The edited note is at the top with a new time.
6. **R6:** Click Delete on a note. It disappears, and it stays gone after a reload.
7. **R7:** The page never asks for an account or a login. In DevTools → Network, reload. Every request goes to `localhost:8000`.
8. **Keyboard:** Use Tab to move to a note in the list and press Enter. The note opens.
