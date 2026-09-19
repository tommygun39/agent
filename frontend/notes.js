// Notes & Tools Module for Momo Agent
const notesCardList = document.getElementById("notesCardList");
const openNewNoteModalBtn = document.getElementById("openNewNoteModalBtn");
const newNoteModal = document.getElementById("newNoteModal");
const closeNewNoteModal = document.getElementById("closeNewNoteModal");
const cancelNewNoteBtn = document.getElementById("cancelNewNoteBtn");
const saveNewNoteBtn = document.getElementById("saveNewNoteBtn");
const noteInputTitle = document.getElementById("noteInputTitle");
const noteInputContent = document.getElementById("noteInputContent");
const noteInputTags = document.getElementById("noteInputTags");

const toolsModal = document.getElementById("toolsModal");
const openToolsBtn = document.getElementById("openToolsBtn");
const closeToolsModal = document.getElementById("closeToolsModal");
const calcPrincipal = document.getElementById("calcPrincipal");
const calcDays = document.getElementById("calcDays");
const calcRate = document.getElementById("calcRate");
const runCalcBtn = document.getElementById("runCalcBtn");
const calcResult = document.getElementById("calcResult");
const resCommission = document.getElementById("resCommission");
const resTotal = document.getElementById("resTotal");

function initNotes() {
  openNewNoteModalBtn?.addEventListener("click", () => newNoteModal.classList.remove("hidden"));
  closeNewNoteModal?.addEventListener("click", () => newNoteModal.classList.add("hidden"));
  cancelNewNoteBtn?.addEventListener("click", () => newNoteModal.classList.add("hidden"));
  saveNewNoteBtn?.addEventListener("click", saveNewNote);

  openToolsBtn?.addEventListener("click", () => toolsModal.classList.remove("hidden"));
  closeToolsModal?.addEventListener("click", () => toolsModal.classList.add("hidden"));
  runCalcBtn?.addEventListener("click", runPawnCalculator);
}

async function loadNotes() {
  try {
    const res = await fetch("/api/notes");
    const notes = await res.json();
    renderNotes(notes);
  } catch (err) {
    console.error("Eroare notițe:", err);
  }
}

function renderNotes(notes) {
  if (!notesCardList) return;
  notesCardList.innerHTML = "";
  if (notes.length === 0) {
    notesCardList.innerHTML = `<div class="col-span-2 text-center py-12 text-slate-500 text-xs">Nu există notițe salvate încă.</div>`;
    return;
  }
  notes.forEach((note) => {
    const el = document.createElement("div");
    el.className = "p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2";
    el.innerHTML = `
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-semibold text-white">${escapeHtml(note.title)}</h4>
        <span class="text-[10px] text-slate-500">${note.created_at.split("T")[0]}</span>
      </div>
      <p class="text-xs text-slate-300 whitespace-pre-wrap">${escapeHtml(note.content)}</p>
      ${note.tags ? `<div class="text-[10px] text-emerald-400 font-medium">${escapeHtml(note.tags)}</div>` : ""}
    `;
    notesCardList.appendChild(el);
  });
}

async function saveNewNote() {
  const title = noteInputTitle.value.trim();
  const content = noteInputContent.value.trim();
  if (!title || !content) return;
  try {
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, content: content, tags: noteInputTags.value.trim() })
    });
    newNoteModal.classList.add("hidden");
    noteInputTitle.value = "";
    noteInputContent.value = "";
    loadNotes();
  } catch (err) {
    alert("Eroare salvare notiță");
  }
}

async function runPawnCalculator() {
  const principal = parseFloat(calcPrincipal.value) || 0;
  const days = parseInt(calcDays.value) || 0;
  const rate = parseFloat(calcRate.value) || 0.3;
  try {
    const res = await fetch(`/api/tools/pawn-commission?principal=${principal}&days=${days}&rate=${rate}`, { method: "POST" });
    const data = await res.json();
    resCommission.innerText = `${data.total_commission_lei} RON`;
    resTotal.innerText = `${data.total_due_lei} RON`;
    calcResult.classList.remove("hidden");
  } catch (err) {}
}

window.loadNotes = loadNotes;
