// Reminders Module for Momo Agent with Live Audio Chimes & Push Notifications
let currentRemFilter = "all";
const alertedReminderIds = new Set();
let activeAlarmReminder = null;

const remindersCardList = document.getElementById("remindersCardList");
const openNewReminderModalBtn = document.getElementById("openNewReminderModalBtn");
const newReminderModal = document.getElementById("newReminderModal");
const closeNewReminderModal = document.getElementById("closeNewReminderModal");
const cancelNewReminderBtn = document.getElementById("cancelNewReminderBtn");
const saveNewReminderBtn = document.getElementById("saveNewReminderBtn");
const remInputTitle = document.getElementById("remInputTitle");
const remInputDue = document.getElementById("remInputDue");
const remInputPriority = document.getElementById("remInputPriority");
const remInputCategory = document.getElementById("remInputCategory");

const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
const reminderAlarmModal = document.getElementById("reminderAlarmModal");
const alarmModalTitle = document.getElementById("alarmModalTitle");
const alarmModalTime = document.getElementById("alarmModalTime");
const alarmDismissBtn = document.getElementById("alarmDismissBtn");
const alarmCompleteBtn = document.getElementById("alarmCompleteBtn");

// 1. Crystal-clear harmonic Audio Chime via Web Audio API
function playReminderChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    const notes = [
      { freq: 587.33, start: 0.0, dur: 0.4 },  // D5
      { freq: 739.99, start: 0.12, dur: 0.5 }, // F#5
      { freq: 880.00, start: 0.24, dur: 0.6 }, // A5
      { freq: 1174.66, start: 0.36, dur: 1.2 } // D6
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, now + n.start);

      gain.gain.setValueAtTime(0.001, now + n.start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + n.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.start);
      osc.stop(now + n.start + n.dur);
    });
  } catch (e) {
    console.warn("Chime playback error:", e);
  }
}

// 2. Text-To-Speech announcement
function speakReminder(title) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`Atenție! Reminder de la Pandele: ${title}`);
    utterance.lang = "ro-RO";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {}
}

// 3. Notification Permissions
function updateNotificationButtonState() {
  if (!enableNotificationsBtn) return;
  if (!("Notification" in window)) {
    enableNotificationsBtn.style.display = "none";
    return;
  }
  if (Notification.permission === "granted") {
    enableNotificationsBtn.className = "p-2 rounded-lg text-emerald-400 hover:bg-slate-800 transition flex items-center gap-1";
    enableNotificationsBtn.title = "Alerte & Notificări Sonore Active ✓";
  } else if (Notification.permission === "denied") {
    enableNotificationsBtn.className = "p-2 rounded-lg text-slate-500 hover:bg-slate-800 transition flex items-center gap-1";
    enableNotificationsBtn.title = "Notificările sunt blocate din setările browserului";
  } else {
    enableNotificationsBtn.className = "p-2 rounded-lg text-amber-400 hover:bg-slate-800 transition flex items-center gap-1 animate-pulse";
    enableNotificationsBtn.title = "Apasă pentru a activa Alertele & Notificările Sonore";
  }
  lucide.createIcons();
}

async function requestNotificationPermission(userTriggered = false) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default" || userTriggered) {
    try {
      const perm = await Notification.requestPermission();
      updateNotificationButtonState();
      if (perm === "granted") {
        playReminderChime();
      }
    } catch (e) {}
  }
}

// 4. Trigger Alarm
function triggerReminderAlarm(rem) {
  activeAlarmReminder = rem;
  
  playReminderChime();

  if ("vibrate" in navigator) {
    try { navigator.vibrate([300, 150, 300, 150, 300]); } catch(e) {}
  }

  speakReminder(rem.title);

  if ("Notification" in window && Notification.permission === "granted") {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_REMINDER_NOTIFICATION",
        title: "🔔 Pandele: Reminder Scadent!",
        body: rem.title,
        tag: rem.id
      });
    } else {
      try {
        new Notification("🔔 Pandele: Reminder Scadent!", {
          body: rem.title,
          icon: "/static/icons/icon-192.png",
          tag: rem.id
        });
      } catch(e) {}
    }
  }

  if (reminderAlarmModal && alarmModalTitle) {
    alarmModalTitle.innerText = rem.title;
    let timeFormatted = rem.due_date_time;
    try {
      timeFormatted = new Date(rem.due_date_time).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    } catch(e) {}
    if (alarmModalTime) alarmModalTime.innerText = `Scadență: ${timeFormatted}`;
    reminderAlarmModal.classList.remove("hidden");
    lucide.createIcons();
  }
}

// 5. Periodic due checker
async function checkDueReminders() {
  try {
    const res = await fetch("/api/reminders/due");
    if (!res.ok) return;
    const dueList = await res.json();
    
    for (const rem of dueList) {
      if (!alertedReminderIds.has(rem.id)) {
        alertedReminderIds.add(rem.id);
        triggerReminderAlarm(rem);
        break;
      }
    }
  } catch (err) {}
}

function initReminders() {
  document.querySelectorAll(".rem-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".rem-filter-btn").forEach((b) => {
        b.classList.remove("bg-indigo-600", "text-white", "font-medium");
        b.classList.add("text-slate-400");
      });
      btn.classList.add("bg-indigo-600", "text-white", "font-medium");
      btn.classList.remove("text-slate-400");
      currentRemFilter = btn.getAttribute("data-filter");
      loadReminders(currentRemFilter);
    });
  });

  openNewReminderModalBtn?.addEventListener("click", () => {
    setDefaultDueDateTime();
    newReminderModal.classList.remove("hidden");
  });
  closeNewReminderModal?.addEventListener("click", () => newReminderModal.classList.add("hidden"));
  cancelNewReminderBtn?.addEventListener("click", () => newReminderModal.classList.add("hidden"));
  saveNewReminderBtn?.addEventListener("click", saveNewReminder);

  // Notification button in header
  enableNotificationsBtn?.addEventListener("click", () => {
    requestNotificationPermission(true);
  });
  updateNotificationButtonState();

  // Alarm modal action buttons
  alarmCompleteBtn?.addEventListener("click", async () => {
    if (activeAlarmReminder) {
      await fetch(`/api/reminders/${activeAlarmReminder.id}/toggle`, { method: "POST" });
      loadReminders(currentRemFilter);
      loadRemindersCount();
    }
    reminderAlarmModal.classList.add("hidden");
    activeAlarmReminder = null;
  });

  alarmDismissBtn?.addEventListener("click", async () => {
    if (activeAlarmReminder) {
      await fetch(`/api/reminders/${activeAlarmReminder.id}/snooze?minutes=10`, { method: "POST" });
      alertedReminderIds.delete(activeAlarmReminder.id); // allow it to alert again in 10 mins
      loadReminders(currentRemFilter);
      loadRemindersCount();
    }
    reminderAlarmModal.classList.add("hidden");
    activeAlarmReminder = null;
  });

  // Start background monitoring every 15 seconds
  setInterval(checkDueReminders, 15000);
  checkDueReminders();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkDueReminders();
  });
}

function setDefaultDueDateTime() {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(0);
  const pad = (n) => String(n).padStart(2, "0");
  const formatted = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (remInputDue) remInputDue.value = formatted;
}

async function loadRemindersCount() {
  try {
    const res = await fetch("/api/reminders?filter_type=today");
    const data = await res.json();
    const count = data.filter(r => !r.is_completed).length;
    const sidebarBadge = document.getElementById("sidebarRemindersBadge");
    if (sidebarBadge) sidebarBadge.innerText = count;
    const pill = document.getElementById("headerRemindersPill");
    const text = document.getElementById("headerRemindersText");
    if (count > 0 && pill && text) {
      text.innerText = `${count} remindere azi`;
      pill.classList.remove("hidden");
      pill.classList.add("flex");
    } else if (pill) {
      pill.classList.add("hidden");
    }
  } catch (err) {}
}

async function loadReminders(filterType = "all") {
  try {
    const res = await fetch(`/api/reminders?filter_type=${filterType}`);
    const items = await res.json();
    renderReminders(items);
  } catch (err) {
    console.error("Eroare remindere:", err);
  }
}

function renderReminders(items) {
  if (!remindersCardList) return;
  remindersCardList.innerHTML = "";
  if (items.length === 0) {
    remindersCardList.innerHTML = `<div class="text-center py-12 text-slate-500 text-xs">Nu există remindere în această categorie.</div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = `p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
      item.is_completed ? "bg-slate-900/40 border-slate-800/60 opacity-60" : "bg-slate-900 border-slate-800 hover:border-slate-700"
    }`;

    let priorityBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">Normal</span>`;
    if (item.priority === "high") {
      priorityBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">Urgent</span>`;
    } else if (item.priority === "low") {
      priorityBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">Scăzut</span>`;
    }

    let dateFormatted = item.due_date_time;
    try {
      const d = new Date(item.due_date_time);
      dateFormatted = d.toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch(e) {}

    card.innerHTML = `
      <div class="flex items-center gap-3 overflow-hidden flex-1">
        <input type="checkbox" ${item.is_completed ? "checked" : ""} class="rem-checkbox w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700 cursor-pointer">
        <div class="truncate">
          <div class="text-sm font-medium ${item.is_completed ? "line-through text-slate-400" : "text-slate-100"} truncate">${escapeHtml(item.title)}</div>
          <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${dateFormatted}</span>
            <span>•</span>
            <span class="capitalize">${item.category}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        ${priorityBadge}
        <button class="delete-rem-btn text-slate-500 hover:text-rose-400 p-1 rounded-lg" title="Șterge"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
      </div>
    `;

    card.querySelector(".rem-checkbox").addEventListener("change", async () => {
      await fetch(`/api/reminders/${item.id}/toggle`, { method: "POST" });
      loadReminders(currentRemFilter);
      loadRemindersCount();
    });

    card.querySelector(".delete-rem-btn").addEventListener("click", async () => {
      await fetch(`/api/reminders/${item.id}`, { method: "DELETE" });
      loadReminders(currentRemFilter);
      loadRemindersCount();
    });

    remindersCardList.appendChild(card);
  });
  lucide.createIcons();
}

async function saveNewReminder() {
  const title = remInputTitle.value.trim();
  const due = remInputDue.value;
  if (!title || !due) {
    alert("Te rog să introduci titlul și data/ora scadenței.");
    return;
  }
  try {
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        due_date_time: due,
        priority: remInputPriority.value,
        category: remInputCategory.value
      })
    });
    newReminderModal.classList.add("hidden");
    remInputTitle.value = "";
    loadReminders(currentRemFilter);
    loadRemindersCount();
  } catch (err) {
    alert("Eroare salvare reminder");
  }
}

window.loadReminders = loadReminders;
window.loadRemindersCount = loadRemindersCount;
window.playReminderChime = playReminderChime;
window.checkDueReminders = checkDueReminders;
