// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => console.log("Service Worker înregistrat cu succes:", reg.scope))
      .catch((err) => console.warn("Eroare la înregistrarea Service Worker:", err));
  });
}

// Global State
let currentConversationId = null;
let conversations = [];
let isStreaming = false;
let currentActiveMemories = [];

// DOM Elements
const drawerOverlay = document.getElementById("drawerOverlay");
const sidebar = document.getElementById("sidebar");
const openDrawerBtn = document.getElementById("openDrawerBtn");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const newChatBtn = document.getElementById("newChatBtn");
const searchChatsInput = document.getElementById("searchChatsInput");
const conversationsList = document.getElementById("conversationsList");
const currentChatTitle = document.getElementById("currentChatTitle");
const activeMemoriesBadge = document.getElementById("activeMemoriesBadge");
const activeMemoriesCount = document.getElementById("activeMemoriesCount");
const modelSelect = document.getElementById("modelSelect");
const messagesContainer = document.getElementById("messagesContainer");
const emptyState = document.getElementById("emptyState");
const messagesList = document.getElementById("messagesList");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");

// Modals
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
const searchMemoryInput = document.getElementById("searchMemoryInput");

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

const memoriesPreviewModal = document.getElementById("memoriesPreviewModal");
const previewMemoriesContent = document.getElementById("previewMemoriesContent");
const closePreviewBtn = document.getElementById("closePreviewBtn");

// Mobile Nav buttons
const mobileNavChat = document.getElementById("mobileNavChat");
const mobileNavMemories = document.getElementById("mobileNavMemories");
const mobileNavTools = document.getElementById("mobileNavTools");
const mobileNavSettings = document.getElementById("mobileNavSettings");

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  loadSettings();
  loadConversations();
  setupEvents();
});

function setupEvents() {
  // Drawer controls
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

  // New Chat
  newChatBtn?.addEventListener("click", () => {
    startNewChat();
    closeDrawer();
  });

  // Search Conversations
  searchChatsInput?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll(".chat-item").forEach((el) => {
      const title = el.getAttribute("data-title").toLowerCase();
      el.style.display = title.includes(q) ? "flex" : "none";
    });
  });

  // Textarea auto-resize & submit on Enter (without Shift)
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";
  });
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isMobile()) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  // Chat Form Submit
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });

  // Starter prompts
  document.querySelectorAll(".starter-prompt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.querySelector(".text-slate-400")?.innerText || "";
      messageInput.value = text;
      messageInput.focus();
      sendMessage();
    });
  });

  // Voice Recognition (Web Speech API)
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

  // Active Memories Badge Click
  activeMemoriesBadge?.addEventListener("click", () => {
    if (currentActiveMemories.length > 0) {
      previewMemoriesContent.innerHTML = currentActiveMemories
        .map((m) => `<div class="p-2 bg-slate-950 rounded-lg border border-slate-800"><span class="text-indigo-400 font-semibold">[${m.category}]</span> ${escapeHtml(m.content)}</div>`)
        .join("");
      memoriesPreviewModal.classList.remove("hidden");
    }
  });
  closePreviewBtn?.addEventListener("click", () => memoriesPreviewModal.classList.add("hidden"));

  // Modals Toggles
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

  openToolsBtn?.addEventListener("click", () => toolsModal.classList.remove("hidden"));
  closeToolsModal?.addEventListener("click", () => toolsModal.classList.add("hidden"));
  runCalcBtn?.addEventListener("click", runPawnCalculator);

  // Mobile Bottom Nav actions
  mobileNavChat?.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
    memoriesModal.classList.add("hidden");
    toolsModal.classList.add("hidden");
  });
  mobileNavMemories?.addEventListener("click", () => {
    memoriesModal.classList.remove("hidden");
    loadMemories();
  });
  mobileNavTools?.addEventListener("click", () => {
    toolsModal.classList.remove("hidden");
  });
  mobileNavSettings?.addEventListener("click", () => {
    settingsModal.classList.remove("hidden");
  });
}

function isMobile() {
  return window.innerWidth < 768;
}

// Conversation Functions
async function loadConversations() {
  try {
    const res = await fetch("/api/conversations");
    conversations = await res.json();
    renderConversations();
    if (conversations.length > 0 && !currentConversationId) {
      selectConversation(conversations[0].id);
    }
  } catch (err) {
    console.error("Eroare încărcare conversații:", err);
  }
}

function renderConversations() {
  conversationsList.innerHTML = "";
  if (conversations.length === 0) {
    conversationsList.innerHTML = `
      <div class="text-center py-6 text-slate-500 text-xs">
        Nu există conversații încă.
      </div>
    `;
    return;
  }

  conversations.forEach((conv) => {
    const isSelected = conv.id === currentConversationId;
    const item = document.createElement("div");
    item.className = `chat-item group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition ${
      isSelected
        ? "bg-slate-800 text-white font-medium shadow-sm"
        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
    }`;
    item.setAttribute("data-title", conv.title);

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
  currentChatTitle.innerText = "Conversație nouă";
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
  if (conv) currentChatTitle.innerText = conv.title;
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
  } catch (err) {
    console.error("Eroare încărcare mesaje:", err);
  }
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
  } catch (err) {
    console.error("Eroare ștergere:", err);
  }
}

// Chat Streaming
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isStreaming) return;

  // Clear input
  messageInput.value = "";
  messageInput.style.height = "auto";
  emptyState.style.display = "none";

  // Append User message to UI
  appendMessage("user", text);
  scrollToBottom();

  isStreaming = true;
  sendBtn.disabled = true;

  // Create Assistant Message Placeholder
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
      buffer = lines.pop(); // keep partial chunk

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.substring(6));

        if (payload.type === "init") {
          currentConversationId = payload.conversation_id;
          currentActiveMemories = payload.memories || [];
          if (currentActiveMemories.length > 0) {
            activeMemoriesCount.innerText = `${currentActiveMemories.length} memorii active`;
            activeMemoriesBadge.classList.remove("hidden");
            activeMemoriesBadge.classList.add("flex");
          }
          loadConversations();
        } else if (payload.type === "chunk") {
          if (typingIndicator) typingIndicator.remove();
          accumulatedResponse += payload.content;
          contentEl.innerHTML = marked.parse(accumulatedResponse);
          highlightCode(contentEl);
          scrollToBottom();
        } else if (payload.type === "error") {
          if (typingIndicator) typingIndicator.remove();
          contentEl.innerHTML = `<span class="text-rose-400">${escapeHtml(payload.content)}</span>`;
        } else if (payload.type === "done") {
          // Finished
        }
      }
    }
  } catch (err) {
    console.error("Eroare streaming:", err);
    if (typingIndicator) typingIndicator.remove();
    contentEl.innerHTML = `<span class="text-rose-400">A apărut o eroare la conectare.</span>`;
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    scrollToBottom();
    loadConversations();
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

  // Speak aloud action for assistant
  const actionsHtml = !isUser && !isPlaceholder
    ? `<div class="flex items-center gap-2 mt-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400">
         <button class="speak-btn hover:text-white flex items-center gap-1"><i data-lucide="volume-2" class="w-3.5 h-3.5"></i> Citește cu voce</button>
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

  // Attach speak and copy handlers
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
  // Strip markdown tags
  const clean = text.replace(/[#*`_~]/g, "");
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = "ro-RO";
  utterance.rate = 1.05;
  window.speechSynthesis.speak(utterance);
}

function highlightCode(element) {
  element.querySelectorAll("pre code").forEach((block) => {
    hljs.highlightElement(block);
  });
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Settings Handlers
async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    assistantNameInput.value = data.assistant_name || "Momo Agent";
    systemPromptInput.value = data.system_prompt || "";
    modelSelect.value = data.default_model || "gemini-2.0-flash";
    if (data.has_api_key) {
      apiKeyStatus.innerText = "Configurat ✓ (" + data.masked_api_key + ")";
      apiKeyStatus.className = "text-emerald-400 font-medium";
    } else {
      apiKeyStatus.innerText = "Lipsă API Key ⚠️";
      apiKeyStatus.className = "text-amber-400 font-medium";
    }
  } catch (err) {
    console.error("Eroare încărcare setări:", err);
  }
}

async function saveSettings() {
  const payload = {
    assistant_name: assistantNameInput.value.trim(),
    system_prompt: systemPromptInput.value.trim(),
    default_model: modelSelect.value
  };
  if (geminiKeyInput.value.trim()) {
    payload.gemini_api_key = geminiKeyInput.value.trim();
  }

  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    settingsModal.classList.add("hidden");
    loadSettings();
  } catch (err) {
    alert("Eroare la salvarea setărilor");
  }
}

// Memories Handlers
async function loadMemories() {
  try {
    const res = await fetch("/api/memories");
    const data = await res.json();
    renderMemoriesList(data);
  } catch (err) {
    console.error("Eroare încărcare memorii:", err);
  }
}

function renderMemoriesList(memories) {
  memoriesList.innerHTML = "";
  if (memories.length === 0) {
    memoriesList.innerHTML = `<div class="text-center py-6 text-slate-500 text-xs">Nicio memorie salvată încă.</div>`;
    return;
  }

  memories.forEach((m) => {
    const el = document.createElement("div");
    el.className = "p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start justify-between gap-3 text-xs";
    el.innerHTML = `
      <div class="flex-1">
        <span class="inline-block px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold uppercase text-[10px] mb-1">
          ${m.category}
        </span>
        <div class="text-slate-200">${escapeHtml(m.content)}</div>
      </div>
      <button class="delete-memory-btn text-slate-500 hover:text-rose-400 p-1" title="Șterge">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
      </button>
    `;
    el.querySelector(".delete-memory-btn").addEventListener("click", async () => {
      await fetch(`/api/memories/${m.id}`, { method: "DELETE" });
      loadMemories();
    });
    memoriesList.appendChild(el);
  });
  lucide.createIcons();
}

async function addMemory() {
  const content = newMemoryContent.value.trim();
  if (!content) return;

  try {
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: newMemoryCategory.value,
        content: content,
        importance_score: 1.0
      })
    });
    newMemoryContent.value = "";
    loadMemories();
  } catch (err) {
    console.error("Eroare adăugare memorie:", err);
  }
}

// Pawn Calculator
async function runPawnCalculator() {
  const principal = parseFloat(calcPrincipal.value) || 0;
  const days = parseInt(calcDays.value) || 0;
  const rate = parseFloat(calcRate.value) || 0.3;

  try {
    const res = await fetch(`/api/tools/pawn-commission?principal=${principal}&days=${days}&rate=${rate}`, {
      method: "POST"
    });
    const data = await res.json();
    resCommission.innerText = `${data.total_commission_lei} RON`;
    resTotal.innerText = `${data.total_due_lei} RON`;
    calcResult.classList.remove("hidden");
  } catch (err) {
    alert("Eroare la calcul");
  }
}
