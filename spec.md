\# Spec: Notes-Web-App



A small browser app for writing, saving, and finding notes. It meets the requirements in `problem.md`.



\## How it is built



\- Plain HTML, CSS, and JavaScript. 

\- Files: `index.html`, `style.css`, `app.js`.

\- Notes are stored in the browser's local storage.



\## How to run



```

py -m http.server 8000

```



Then open http://localhost:8000 in a browser.



\## Behavior



\- The page has a text area, a Save button, and a list of saved notes.

\- Saving with text in the text area adds a new note to the list. Empty notes are not saved. 

\- Each item in the list shows the first line of the note and the date it was last changed, newest first.

\- Clicking a note in the list loads its full text into the text area. 

\- Saving while a note is open updates that note instead of adding a new one. 

\- Each note has a Delete button that removes it from the list. 

\- Every change is written to `localStorage` straight away, so notes are still there after the browser is closed and reopened.

\- There is no login or account. 



