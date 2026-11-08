// Notes-Web-App: write, save, open, edit, and delete notes in localStorage.

const STORAGE_KEY = "notes-web-app.notes";

const textArea = document.getElementById("note-text");
const saveButton = document.getElementById("save-button");
const noteList = document.getElementById("note-list");
const emptyMessage = document.getElementById("empty-message");

let notes = loadNotes();
let openNoteId = null; // id of the note loaded in the text area, or null for a new note

// ---- Storage ----

// Read notes from localStorage. Bad or missing data gives an empty list.
function loadNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

// ---- Helpers ----

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function findNote(id) {
  return notes.find((note) => note.id === id);
}

// First non-blank line of the note, used as its title in the list.
function firstLine(text) {
  const line = text.split("\n").find((l) => l.trim() !== "");
  return line ? line.trim() : "";
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function newestFirst(a, b) {
  return b.updatedAt - a.updatedAt;
}

// ---- Actions ----

function clearEditor() {
  textArea.value = "";
  openNoteId = null;
}

// Add a new note, or update the open one. Empty notes are not saved.
function saveNote() {
  const text = textArea.value;
  if (text.trim() === "") return;

  const openNote = findNote(openNoteId);
  if (openNote) {
    if (openNote.text !== text) {
      openNote.text = text;
      openNote.updatedAt = Date.now();
    }
  } else {
    notes.push({ id: makeId(), text, updatedAt: Date.now() });
  }

  storeNotes();
  clearEditor(); // after saving, the next save starts a new note
  renderList();
}

function openNote(id) {
  const note = findNote(id);
  if (!note) return;
  textArea.value = note.text;
  openNoteId = id;
  renderList();
  textArea.focus();
}

function deleteNote(id) {
  notes = notes.filter((note) => note.id !== id);
  storeNotes();
  if (id === openNoteId) clearEditor();
  renderList();
}

// ---- Rendering ----

function renderNoteItem(note) {
  const item = document.createElement("li");
  item.className = "note-item";
  if (note.id === openNoteId) item.classList.add("open");

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "note-open";
  openButton.addEventListener("click", () => openNote(note.id));

  const title = document.createElement("span");
  title.className = "note-title";
  title.textContent = firstLine(note.text);

  const date = document.createElement("span");
  date.className = "note-date";
  date.textContent = formatDate(note.updatedAt);

  openButton.append(title, date);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "note-delete";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteNote(note.id));

  item.append(openButton, deleteButton);
  return item;
}

function renderList() {
  noteList.replaceChildren(...[...notes].sort(newestFirst).map(renderNoteItem));
  emptyMessage.hidden = notes.length > 0;
}

saveButton.addEventListener("click", saveNote);
renderList();
