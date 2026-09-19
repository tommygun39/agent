// Core Application Script for Momo Agent
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => console.log("Service Worker înregistrat:", reg.scope))
      .catch((err) => console.warn("Eroare Service Worker:", err));
  });
}

// Global State
let currentConversationId = null;
let conversations = [];
let isStreaming = false;
let currentActiveMemories = [];
let activeWorkspaceView = "chat";

// DOM Elements
const drawerOverlay = document.getElementById("drawerOverlay");
const sidebar = document.getElementById("sidebar");
const openDrawerBtn = document.getElementById("openDrawerBtn");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const newChatBtn = document.getElementById("newChatBtn");
const conversationsList = document.getElementById("conversationsList");
const mainHeaderTitle = document.getElementById("mainHeaderTitle");
const activeMemoriesBadge = document.getElementById("activeMemoriesBadge");
const activeMemoriesCount = document.getElementById("activeMemoriesCount");
const modelSelectContainer = document.getElementById("modelSelectContainer");
const modelSelect = document.getElementById("modelSelect");

// Views
const chatView = document.getElementById("chatView");
const remindersView = document.getElementById("remindersView");
const notesView = document.getElementById("notesView");

// Chat DOM Elements
const messagesContainer = document.getElementById("messagesContainer");
const emptyState = document.getElementById("emptyState");
const messagesList = document.getElementById("messagesList");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

// Navigation buttons
const navTabChat = document.getElementById("navTabChat");
const navTabReminders = document.getElementById("navTabReminders");
const navTabNotes = document.getElementById("navTabNotes");
const mobileNavChat = document.getElementById("mobileNavChat");
const mobileNavReminders = document.getElementById("mobileNavReminders");
const mobileNavNotes = document.getElementById("mobileNavNotes");
const mobileNavSettings = document.getElementById("mobileNavSettings");

// Settings & Memories Modals
const settingsModal = document.getElementById("settingsModal");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const closeSettingsModal = document.getElementById("closeSettingsModal");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const geminiKeyInput = document.getElementById("geminiKeyInput");
const assistantNameInput = document.getElementById("assistantNameInput");
const systemPromptInput = document.getElementById("systemPromptInput");
const apiKeyStatus = document.getElementById("apiKeyStatus");
const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");

const memoriesModal = document.getElementById("memoriesModal");
const openMemoriesBtn = document.getElementById("openMemoriesBtn");
const closeMemoriesModal = document.getElementById("closeMemoriesModal");
const memoriesList = document.getElementById("memoriesList");
const newMemoryCategory = document.getElementById("newMemoryCategory");
const newMemoryContent = document.getElementById("newMemoryContent");
const addMemoryBtn = document.getElementById("addMemoryBtn");

document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  loadSettings();
  loadConversations();
  if (typeof initReminders === "function") initReminders();
  if (typeof initNotes === "function") initNotes();
  if (typeof loadRemindersCount === "function") loadRemindersCount();
  setupCoreEvents();
});

function switchView(view) {
  activeWorkspaceView = view;
  chatView.classList.add("hidden");
  remindersView.classList.add("hidden");
  notesView.classList.add("hidden");

  const resetClass = (btn) => {
    btn?.classList.remove("bg-indigo-600", "text-white");
    btn?.classList.add("text-slate-400");
  };
  const setClass = (btn) => {
    btn?.classList.add("bg-indigo-600", "text-white");
    btn?.classList.remove("text-slate-400");
  };

  resetClass(navTabChat);
  resetClass(navTabReminders);
  resetClass(navTabNotes);

  if (view === "chat") {
    chatView.classList.remove("hidden");
    setClass(navTabChat);
    mainHeaderTitle.innerText = getCurrentChatTitle();
    modelSelectContainer.classList.remove("hidden");
    document.querySelectorAll(".chat-only-nav").forEach(el => el.classList.remove("hidden"));
  } else if (view === "reminders") {
    remindersView.classList.remove("hidden");
    setClass(navTabReminders);
    mainHeaderTitle.innerText = "Remindere & Agendă";
    modelSelectContainer.classList.add("hidden");
    document.querySelectorAll(".chat-only-nav").forEach(el => el.classList.add("hidden"));
    if (typeof loadReminders === "function") loadReminders("all");
  } else if (view === "notes") {
    notesView.classList.remove("hidden");
    setClass(navTabNotes);
    mainHeaderTitle.innerText = "Notițe & Cunoștințe";
    modelSelectContainer.classList.add("hidden");
    document.querySelectorAll(".chat-only-nav").forEach(el => el.classList.add("hidden"));
    if (typeof loadNotes === "function") loadNotes();
  }
  lucide.createIcons();
}

function getCurrentChatTitle() {
  const conv = conversations.find(c => c.id === currentConversationId);
  return conv ? conv.title : "Conversație nouă";
}

function setupCoreEvents() {
  navTabChat?.addEventListener("click", () => switchView("chat"));
  navTabReminders?.addEventListener("click", () => switchView("reminders"));
  navTabNotes?.addEventListener("click", () => switchView("notes"));

  mobileNavChat?.addEventListener("click", () => switchView("chat"));
  mobileNavReminders?.addEventListener("click", () => switchView("reminders"));
  mobileNavNotes?.addEventListener("click", () => switchView("notes"));
  mobileNavSettings?.addEventListener("click", () => settingsModal.classList.remove("hidden"));

  openDrawerBtn?.addEventListener("click", () => {
    sidebar.classList.remove("-translate-x-full");
    drawerOverlay.classList.remove("hidden");
  });
  const closeDrawer = () => {
    sidebar.classList.add("-translate-x-full");
    drawerOverlay.classList.add("hidden");
  };
  closeDrawerBtn?.addEventListener("click", closeDrawer);
  drawerOverlay?.addEventListener("click", closeDrawer);

  newChatBtn?.addEventListener("click", () => {
    switchView("chat");
    startNewChat();
    closeDrawer();
  });

  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";
  });
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  document.querySelectorAll(".starter-prompt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.querySelector(".text-slate-400")?.innerText || "";
      messageInput.value = text;
      messageInput.focus();
      sendMessage();
    });
  });

  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ro-RO";
    recognition.interimResults = false;

    let isListening = false;
    voiceBtn.addEventListener("click", () => {
      if (!isListening) {
        recognition.start();
        voiceBtn.classList.add("text-rose-500", "animate-pulse");
        isListening = true;
      } else {
        recognition.stop();
        voiceBtn.classList.remove("text-rose-500", "animate-pulse");
        isListening = false;
      }
    });

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      messageInput.value = (messageInput.value + " " + transcript).trim();
      messageInput.style.height = "auto";
      messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";
    };

    recognition.onend = () => {
      voiceBtn.classList.remove("text-rose-500", "animate-pulse");
      isListening = false;
    };
  } else {
    voiceBtn.style.display = "none";
  }

  openSettingsBtn?.addEventListener("click", () => {
    settingsModal.classList.remove("hidden");
    closeDrawer();
  });
  closeSettingsModal?.addEventListener("click", () => settingsModal.classList.add("hidden"));
  cancelSettingsBtn?.addEventListener("click", () => settingsModal.classList.add("hidden"));
  saveSettingsBtn?.addEventListener("click", saveSettings);
  toggleKeyVisibility?.addEventListener("click", () => {
    geminiKeyInput.type = geminiKeyInput.type === "password" ? "text" : "password";
  });

  openMemoriesBtn?.addEventListener("click", () => {
    memoriesModal.classList.remove("hidden");
    loadMemories();
    closeDrawer();
  });
  closeMemoriesModal?.addEventListener("click", () => memoriesModal.classList.add("hidden"));
  addMemoryBtn?.addEventListener("click", addMemory);
}

async function loadConversations() {
  try {
    const res = await fetch("/api/conversations");
    conversations = await res.json();
    renderConversations();
    if (conversations.length > 0 && !currentConversationId) {
      selectConversation(conversations[0].id);
    }
  } catch (err) {}
}

function renderConversations() {
  conversationsList.innerHTML = "";
  conversations.forEach((conv) => {
    const isSelected = conv.id === currentConversationId;
    const item = document.createElement("div");
    item.className = `chat-item group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${
      isSelected ? "bg-slate-800 text-white font-medium shadow-sm" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
    }`;

    item.innerHTML = `
      <div class="flex items-center gap-2 overflow-hidden flex-1">
        <i data-lucide="${conv.is_pinned ? "pin" : "message-square"}" class="w-4 h-4 flex-shrink-0 ${conv.is_pinned ? "text-amber-400" : ""}"></i>
        <span class="truncate">${escapeHtml(conv.title)}</span>
      </div>
      <button class="delete-conv-btn opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition" title="Șterge">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    `;

    item.addEventListener("click", (e) => {
      if (e.target.closest(".delete-conv-btn")) {
        deleteConversation(conv.id);
        return;
      }
      selectConversation(conv.id);
    });

    conversationsList.appendChild(item);
  });
  lucide.createIcons();
}

function startNewChat() {
  currentConversationId = null;
  mainHeaderTitle.innerText = "Conversație nouă";
  activeMemoriesBadge.classList.add("hidden");
  messagesList.innerHTML = "";
  emptyState.style.display = "block";
  messageInput.value = "";
  messageInput.focus();
  renderConversations();
}

async function selectConversation(convId) {
  currentConversationId = convId;
  const conv = conversations.find((c) => c.id === convId);
  if (conv) mainHeaderTitle.innerText = conv.title;
  renderConversations();

  try {
    const res = await fetch(`/api/conversations/${convId}/messages`);
    const messages = await res.json();
    messagesList.innerHTML = "";
    if (messages.length > 0) {
      emptyState.style.display = "none";
      messages.forEach((m) => appendMessage(m.role, m.content, false));
      scrollToBottom();
    } else {
      emptyState.style.display = "block";
    }
  } catch (err) {}
}

async function deleteConversation(convId) {
  if (!confirm("Sigur dorești să ștergi această conversație?")) return;
  try {
    await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
    conversations = conversations.filter((c) => c.id !== convId);
    if (currentConversationId === convId) {
      startNewChat();
    } else {
      renderConversations();
    }
  } catch (err) {}
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isStreaming) return;

  messageInput.value = "";
  messageInput.style.height = "auto";
  emptyState.style.display = "none";

  appendMessage("user", text);
  scrollToBottom();

  isStreaming = true;
  sendBtn.disabled = true;

  const assistantBubble = appendMessage("assistant", "", true);
  const contentEl = assistantBubble.querySelector(".prose-custom");
  const typingIndicator = assistantBubble.querySelector(".typing-indicator");
  scrollToBottom();

  let accumulatedResponse = "";

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        conversation_id: currentConversationId,
        model: modelSelect.value
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.substring(6));

        if (payload.type === "init") {
          currentConversationId = payload.conversation_id;
          currentActiveMemories = payload.memories || [];
          if (currentActiveMemories.length > 0) {
            activeMemoriesCount.innerText = `${currentActiveMemories.length} memorii`;
            activeMemoriesBadge.classList.remove("hidden");
            activeMemoriesBadge.classList.add("flex");
          }
          loadConversations();
          if (typeof loadRemindersCount === "function") loadRemindersCount();
        } else if (payload.type === "chunk") {
          if (typingIndicator) typingIndicator.remove();
          accumulatedResponse += payload.content;
          contentEl.innerHTML = marked.parse(accumulatedResponse);
          highlightCode(contentEl);
          scrollToBottom();
        } else if (payload.type === "error") {
          if (typingIndicator) typingIndicator.remove();
          contentEl.innerHTML = `<span class="text-rose-400">${escapeHtml(payload.content)}</span>`;
        }
      }
    }
  } catch (err) {
    if (typingIndicator) typingIndicator.remove();
    contentEl.innerHTML = `<span class="text-rose-400">A apărut o eroare la conectare.</span>`;
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    scrollToBottom();
    loadConversations();
    if (typeof loadRemindersCount === "function") loadRemindersCount();
  }
}

function appendMessage(role, content, isPlaceholder = false) {
  const isUser = role === "user";
  const msgEl = document.createElement("div");
  msgEl.className = `flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`;

  const avatar = isUser
    ? `<div class="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">EU</div>`
    : `<div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-indigo-500/20"><i data-lucide="sparkles" class="w-4 h-4"></i></div>`;

  const bubbleClass = isUser
    ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] md:max-w-xl text-sm shadow-sm"
    : "bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[95%] md:max-w-2xl text-sm shadow-sm";

  const placeholderHtml = isPlaceholder
    ? `<div class="typing-indicator flex items-center gap-1.5 py-1">
         <span class="w-2 h-2 rounded-full bg-indigo-400 typing-dot"></span>
         <span class="w-2 h-2 rounded-full bg-indigo-400 typing-dot"></span>
         <span class="w-2 h-2 rounded-full bg-indigo-400 typing-dot"></span>
       </div>`
    : "";

  const formattedContent = content ? marked.parse(content) : "";

  const actionsHtml = !isUser && !isPlaceholder
    ? `<div class="flex items-center gap-2 mt-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
         <button class="speak-btn hover:text-white flex items-center gap-1"><i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Citește</button>
         <button class="copy-btn hover:text-white flex items-center gap-1 ml-2"><i data-lucide="copy" class="w-3.5 h-3.5"></i> Copiază</button>
       </div>`
    : "";

  msgEl.innerHTML = `
    ${!isUser ? avatar : ""}
    <div class="${bubbleClass}">
      <div class="prose-custom">${formattedContent}</div>
      ${placeholderHtml}
      ${actionsHtml}
    </div>
    ${isUser ? avatar : ""}
  `;

  if (!isUser && !isPlaceholder) {
    const speakBtn = msgEl.querySelector(".speak-btn");
    speakBtn?.addEventListener("click", () => speakText(content));
    const copyBtn = msgEl.querySelector(".copy-btn");
    copyBtn?.addEventListener("click", () => {
      navigator.clipboard.writeText(content);
      copyBtn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> Copiat!`;
      lucide.createIcons();
      setTimeout(() => {
        copyBtn.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5"></i> Copiază`;
        lucide.createIcons();
      }, 2000);
    });
  }

  messagesList.appendChild(msgEl);
  lucide.createIcons();
  highlightCode(msgEl);
  return msgEl;
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[#*`_~]/g, "");
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "ro-RO";
  window.speechSynthesis.speak(utterance);
}

function highlightCode(element) {
  element.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    assistantNameInput.value = data.assistant_name || "Pandele";
    systemPromptInput.value = data.system_prompt || "";
    modelSelect.value = data.default_model || "gemini-3.6-flash";
    if (data.has_api_key) {
      apiKeyStatus.innerText = "Configurat ✓ (" + data.masked_api_key + ")";
      apiKeyStatus.className = "text-emerald-400 font-medium";
    } else {
      apiKeyStatus.innerText = "Lipsă API Key ⚠️";
      apiKeyStatus.className = "text-amber-400 font-medium";
    }
  } catch (err) {}
}

async function saveSettings() {
  const payload = {
    assistant_name: assistantNameInput.value.trim(),
    system_prompt: systemPromptInput.value.trim(),
    default_model: modelSelect.value
  };
  if (geminiKeyInput.value.trim()) payload.gemini_api_key = geminiKeyInput.value.trim();
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    settingsModal.classList.add("hidden");
    loadSettings();
  } catch (err) {
    alert("Eroare salvare setări");
  }
}

async function loadMemories() {
  try {
    const res = await fetch("/api/memories");
    const data = await res.json();
    memoriesList.innerHTML = "";
    if (data.length === 0) {
      memoriesList.innerHTML = `<div class="text-center py-6 text-slate-500 text-xs">Nicio memorie salvată.</div>`;
      return;
    }
    data.forEach((m) => {
      const el = document.createElement("div");
      el.className = "p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start justify-between gap-3 text-xs";
      el.innerHTML = `
        <div class="flex-1">
          <span class="inline-block px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold uppercase text-[10px] mb-1">${m.category}</span>
          <div class="text-slate-200">${escapeHtml(m.content)}</div>
        </div>
        <button class="delete-memory-btn text-slate-500 hover:text-rose-400 p-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      `;
      el.querySelector(".delete-memory-btn").addEventListener("click", async () => {
        await fetch(`/api/memories/${m.id}`, { method: "DELETE" });
        loadMemories();
      });
      memoriesList.appendChild(el);
    });
    lucide.createIcons();
  } catch (err) {}
}

async function addMemory() {
  const content = newMemoryContent.value.trim();
  if (!content) return;
  try {
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newMemoryCategory.value, content: content, importance_score: 1.0 })
    });
    newMemoryContent.value = "";
    loadMemories();
  } catch (err) {}
}
