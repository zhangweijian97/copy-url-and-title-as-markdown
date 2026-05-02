// content.js
// 用于在页面上下文中执行的脚本
//
// v1.3 核心变更：复制+通知全部在 content script 内完成，
// 不再经过 background.js 的跨进程 IPC，消除 5-10 秒延迟。

// ============================================================
// i18n：复用扩展的本地化资源
// ============================================================
function i18n(key, substitutions) {
  try {
    return chrome.i18n.getMessage(key, substitutions) || key;
  } catch {
    return key;
  }
}

// ============================================================
// 防重复：在 Chrome 中 chrome.commands 和 content script 的 keydown
// 都会触发，添加防抖避免重复执行。
// ============================================================
let lastExecution = 0;
const DEBOUNCE_MS = 300;

function isInputElement(event) {
  const target = event.target;
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  const isContentEditable = target.isContentEditable || document.designMode === 'on';
  return tag === 'input' || tag === 'textarea' || tag === 'select' || isContentEditable;
}

// ============================================================
// 剪贴板：直接在页面上下文中执行，无需 IPC
// ============================================================
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;left:-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

// ============================================================
// 通知：直接在页面中创建 DOM，无需 executeScript
// ============================================================
function showNotification(message) {
  const existing = document.getElementById('md-copy-notification');
  if (existing) existing.remove();

  // 只注入一次 style
  if (!document.getElementById('md-copy-notification-style')) {
    const style = document.createElement('style');
    style.id = 'md-copy-notification-style';
    style.textContent = `
      @keyframes mdFadeInOut {
        0%   { opacity:0; transform:translateY(-16px); }
        10%  { opacity:1; transform:translateY(0); }
        85%  { opacity:1; transform:translateY(0); }
        100% { opacity:0; transform:translateY(-16px); }
      }
      .md-notification {
        position:fixed; top:20px; right:20px;
        background:#4CAF50; color:white;
        padding:10px 16px; border-radius:4px;
        box-shadow:0 2px 8px rgba(0,0,0,0.2);
        z-index:9999; font-family:system-ui,sans-serif; font-size:14px;
        animation:mdFadeInOut 2s ease-in-out forwards;
        pointer-events:none;
      }
    `;
    document.head.appendChild(style);
  }

  const el = document.createElement('div');
  el.className = 'md-notification';
  el.textContent = message;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ============================================================
// 默认选项（避免等 storage 异步返回）
// ============================================================
const DEFAULT_OPTIONS = {
  format: '[{title}]({url})',
  showNotification: true
};

function isInternalPage(url) {
  return !url || typeof url !== 'string' ||
    url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') || url.startsWith('about:') ||
    !url.startsWith('http');
}

function sanitizeText(text) {
  if (!text || typeof text !== 'string') return 'Untitled';
  return text.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function sanitizeUrl(url) {
  try { return new URL(url).toString(); } catch { return 'about:blank'; }
}

function isValidFormat(fmt) {
  return fmt && typeof fmt === 'string' && fmt.includes('{title}') && fmt.includes('{url}');
}

// ============================================================
// 核心执行：全同步路径，无跨进程 IPC
// ============================================================
async function executeCopyCommand(command) {
  // 读取选项（有缓存就不走 IPC）
  let options;
  try {
    options = await chrome.storage.sync.get(DEFAULT_OPTIONS);
  } catch {
    options = DEFAULT_OPTIONS;
  }

  const title = sanitizeText(document.title);
  const url = sanitizeUrl(location.href);

  if (isInternalPage(url)) {
    showNotification(i18n('internalPage'));
    return;
  }

  let text;
  if (command === 'copy_url_only') {
    text = url;
  } else {
    const fmt = isValidFormat(options.format) ? options.format : DEFAULT_OPTIONS.format;
    text = fmt.replace(/{title}/g, title).replace(/{url}/g, url).slice(0, 10000);
  }

  const ok = copyToClipboard(text);
  if (options.showNotification) {
    const key = command === 'copy_url_only' ? 'urlCopied' : (ok ? 'copySuccess' : 'copyFailed');
    showNotification(i18n(key));
  }
}

// ============================================================
// 键盘快捷键 Fallback（content script 路径）
// ============================================================
const SHORTCUTS = {
  'copy_as_markdown': { key: 'C', ctrl: false, alt: true, shift: true, meta: false },
  'copy_url_only':    { key: 'U', ctrl: false, alt: true, shift: true, meta: false }
};

document.addEventListener('keydown', (event) => {
  if (isInputElement(event)) return;

  const now = Date.now();
  for (const [command, shortcut] of Object.entries(SHORTCUTS)) {
    if (event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        event.altKey === shortcut.alt &&
        event.shiftKey === shortcut.shift &&
        event.ctrlKey === shortcut.ctrl &&
        event.metaKey === shortcut.meta) {
      event.preventDefault();
      event.stopPropagation();
      if (now - lastExecution < DEBOUNCE_MS) return;
      lastExecution = now;
      // 直接在 content script 执行，不经过 background
      executeCopyCommand(command);
      return;
    }
  }
}, true);

// ============================================================
// 消息监听：接收来自 background.js（chrome.commands 路径）或 popup 的请求
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    showNotification(request.message);
    sendResponse({ success: true });
    return true;
  }
  // chrome.commands 路径也会发到这里
  if (request.action === 'copy_as_markdown' || request.action === 'copy_url_only') {
    const now = Date.now();
    if (now - lastExecution < DEBOUNCE_MS) {
      sendResponse({ success: true, debounced: true });
      return true;
    }
    lastExecution = now;
    executeCopyCommand(request.action)
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
  return false;
});
