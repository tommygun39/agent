// Reminders Module for Momo Agent with Live Audio Alarm, Web Audio Chimes & Push Notifications
let currentRemFilter = "all";
const alertedReminderIds = new Set();
let activeAlarmReminder = null;
let alarmAudioInterval = null;
let globalAudioCtx = null;
let isAudioUnlocked = false;

// DOM Elements
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
const testAndEnableAudioBtn = document.getElementById("testAndEnableAudioBtn");
const audioUnlockBanner = document.getElementById("audioUnlockBanner");
const reminderAlarmModal = document.getElementById("reminderAlarmModal");
const alarmModalTitle = document.getElementById("alarmModalTitle");
const alarmModalTime = document.getElementById("alarmModalTime");
const alarmDismissBtn = document.getElementById("alarmDismissBtn");
const alarmCompleteBtn = document.getElementById("alarmCompleteBtn");

// 1. Web Audio Unlocker (Crucial for iOS Safari & Android Chrome autoplay policy)
function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

function unlockAudioGlobal() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().then(() => {
      isAudioUnlocked = true;
    }).catch(() => {});
  } else if (ctx && ctx.state === "running") {
    isAudioUnlocked = true;
  }
}

// Attach silent unlock to all user touches/clicks anywhere
["click", "touchstart", "touchend", "keydown"].forEach((evt) => {
  document.addEventListener(evt, unlockAudioGlobal, { passive: true });
});

// 2. Loud, energetic alarm sound generator (High-volume harmonic bell chimes)
function playLoudAlarmTone() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // 4 powerful, bright bell harmonics: A5 (880Hz), C#6 (1108Hz), E6 (1318Hz), A6 (1760Hz)
    const tones = [
      { freq: 880.00, start: 0.0, dur: 0.25, gain: 0.8 },
      { freq: 1108.73, start: 0.12, dur: 0.25, gain: 0.85 },
      { freq: 1318.51, start: 0.24, dur: 0.4, gain: 0.9 },
      { freq: 1760.00, start: 0.38, dur: 0.8, gain: 0.95 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(t.freq, now + t.start);

      gainNode.gain.setValueAtTime(0.001, now + t.start);
      gainNode.gain.exponentialRampToValueAtTime(t.gain, now + t.start + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + t.start);
      osc.stop(now + t.start + t.dur);
    });
  } catch (e) {
    console.warn("Alarm sound error:", e);
  }
}

// 3. Continuous repeating alarm loop (rings until user taps Dismiss or Complete)
function startAlarmLoop(rem) {
  stopAlarmLoop();
  activeAlarmReminder = rem;

  // 1. Play sound immediately and repeat every 2.2 seconds!
  playLoudAlarmTone();
  alarmAudioInterval = setInterval(playLoudAlarmTone, 2200);

  // 2. Vibrate phone in energetic pulses
  if ("vibrate" in navigator) {
    try { navigator.vibrate([500, 200, 500, 200, 500, 200, 1000]); } catch(e) {}
  }

  // 3. Text-to-speech voice announcement
  speakReminder(rem.title);

  // 4. Native web/push notification
  sendNativeNotification(rem);

  // 5. Display interactive alarm modal
  showAlarmModal(rem);
}

function stopAlarmLoop() {
  if (alarmAudioInterval) {
    clearInterval(alarmAudioInterval);
    alarmAudioInterval = null;
  }
  if ("vibrate" in navigator) {
    try { navigator.vibrate(0); } catch(e) {}
  }
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }
  if (reminderAlarmModal) {
    reminderAlarmModal.classList.add("hidden");
  }
  activeAlarmReminder = null;
}

// 4. Voice announcement
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

// 5. Native Notifications
function sendNativeNotification(rem) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const title = `🔔 Pandele: ${rem.title}`;
  const options = {
    body: `Scadență atinsă! Prioritate: ${rem.priority || "normal"}`,
    icon: "/static/icons/icon-192.png",
    badge: "/static/icons/icon-192.png",
    vibrate: [500, 200, 500, 200, 500],
    tag: rem.id,
    renotify: true,
    requireInteraction: true,
    data: { url: "/" }
  };

  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_REMINDER_NOTIFICATION",
      title: title,
      body: options.body,
      tag: rem.id
    });
  } else {
    try {
      new Notification(title, options);
    } catch(e) {}
  }
}

function showAlarmModal(rem) {
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

// 6. Periodic Due Reminders Checker
async function checkDueReminders() {
  try {
    const res = await fetch("/api/reminders/due");
    if (!res.ok) return;
    const dueList = await res.json();

    for (const rem of dueList) {
      if (!alertedReminderIds.has(rem.id)) {
        alertedReminderIds.add(rem.id);
        startAlarmLoop(rem);
        break; // Trigger one alarm at a time
      }
    }
  } catch (err) {}
}

// 7. Notification Button & Banner state
function updateNotificationButtonState() {
  if (!enableNotificationsBtn) return;
  if (!("Notification" in window)) {
    enableNotificationsBtn.style.display = "none";
    return;
  }
  if (Notification.permission === "granted") {
    enableNotificationsBtn.className = "p-2 rounded-lg text-emerald-400 hover:bg-slate-800 transition flex items-center gap-1";
    enableNotificationsBtn.title = "Alerte Sonore & Notificări Active ✓";
  } else {
    enableNotificationsBtn.className = "p-2 rounded-lg text-amber-400 hover:bg-slate-800 transition flex items-center gap-1 animate-pulse";
    enableNotificationsBtn.title = "Apasă pentru a activa Alerte & Notificări";
  }
  lucide.createIcons();
}

async function requestNotificationPermission(userTriggered = false) {
  unlockAudioGlobal();
  if (!("Notification" in window)) return;
  if (Notification.permission === "default" || userTriggered) {
    try {
      const perm = await Notification.requestPermission();
      updateNotificationButtonState();
      return perm;
    } catch (e) {}
  }
  return Notification.permission;
}

// 8. Test Sound & Notification Button Handlers
function initAudioBanner() {
  const isTested = localStorage.getItem("pandele_audio_tested") === "true";
  if (isTested && Notification.permission === "granted") {
    if (audioUnlockBanner) audioUnlockBanner.style.display = "none";
  }

  testAndEnableAudioBtn?.addEventListener("click", async () => {
    unlockAudioGlobal();
    // 1. Play loud chime right now!
    playLoudAlarmTone();
    setTimeout(playLoudAlarmTone, 700);

    // 2. Request notification permission
    const perm = await requestNotificationPermission(true);

    // 3. Vibrate
    if ("vibrate" in navigator) {
      try { navigator.vibrate([200, 100, 200]); } catch(e) {}
    }

    // 4. Test TTS
    speakReminder("Test sunet și alarme reușit!");

    // 5. Send test notification
    if (perm === "granted") {
      try {
        new Notification("🔔 Pandele: Alerte Active!", {
          body: "Sunetul de alarmă și notificările sunt activate pe acest telefon!",
          icon: "/static/icons/icon-192.png"
        });
      } catch(e) {}
    }

    // 6. Update UI
    localStorage.setItem("pandele_audio_tested", "true");
    testAndEnableAudioBtn.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4"></i><span>Sunet & Alerte Active ✓</span>`;
    testAndEnableAudioBtn.className = "px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5";
    lucide.createIcons();

    setTimeout(() => {
      if (audioUnlockBanner) {
        audioUnlockBanner.classList.add("hidden");
      }
    }, 3500);
  });
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

  enableNotificationsBtn?.addEventListener("click", () => {
    requestNotificationPermission(true);
    playLoudAlarmTone();
  });
  updateNotificationButtonState();
  initAudioBanner();

  // Alarm modal buttons
  alarmCompleteBtn?.addEventListener("click", async () => {
    if (activeAlarmReminder) {
      await fetch(`/api/reminders/${activeAlarmReminder.id}/toggle`, { method: "POST" });
      loadReminders(currentRemFilter);
      loadRemindersCount();
    }
    stopAlarmLoop();
  });

  alarmDismissBtn?.addEventListener("click", async () => {
    if (activeAlarmReminder) {
      await fetch(`/api/reminders/${activeAlarmReminder.id}/snooze?minutes=10`, { method: "POST" });
      alertedReminderIds.delete(activeAlarmReminder.id); // allow it to alert again in 10 mins
      loadReminders(currentRemFilter);
      loadRemindersCount();
    }
    stopAlarmLoop();
  });

  // Background monitoring every 10 seconds
  setInterval(checkDueReminders, 10000);
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
window.playLoudAlarmTone = playLoudAlarmTone;
window.checkDueReminders = checkDueReminders;
