// background.js — v1.3
// 精简版：快捷键/点击 → 转发给 content script 执行
// 复制和通知全部在 content script 内完成，消除跨进程 IPC 延迟

const DEBUG = false;

function log(...args) { if (DEBUG) console.log(...args); }
function error(...args) { if (DEBUG) console.error(...args); }

// 处理快捷键命令
chrome.commands.onCommand.addListener((command) => {
  log('Command received:', command);
  if (command === 'copy_as_markdown' || command === 'copy_url_only') {
    forwardToContentScript(command);
  }
});

// 点击扩展图标
chrome.action.onClicked.addListener(() => {
  forwardToContentScript('copy_as_markdown');
});

// 转发命令到 content script 执行
async function forwardToContentScript(command) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    await chrome.tabs.sendMessage(tab.id, { action: command });
  } catch (err) {
    // content script 未加载，注入一次
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['js/content.js']
      });
    } catch (e2) {
      error('Failed to inject content script:', e2);
    }
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'copyAsMarkdown') {
    forwardToContentScript('copy_as_markdown')
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  return false;
});

// 生命周期事件
chrome.runtime.onInstalled.addListener(() => {
  log('Extension installed/updated');
});

chrome.runtime.onStartup.addListener(() => {
  log('Extension started up');
});
