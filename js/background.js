// background.js
// 性能优化：移除开发日志，减少内存占用
const DEBUG = false; // 生产环境设为 false

function log(...args) {
  if (DEBUG) console.log(...args);
}

function error(...args) {
  if (DEBUG) console.error(...args);
}

// 点击扩展图标时直接复制为 Markdown 格式
chrome.action.onClicked.addListener(() => {
  copyCurrentPageAsMarkdown();
});

// 处理快捷键命令
chrome.commands.onCommand.addListener((command) => {
  log('Command received:', command);
  if (command === 'copy_as_markdown') {
    copyCurrentPageAsMarkdown();
  } else if (command === 'copy_url_only') {
    copyCurrentPageUrlOnly();
  }
});

// 确保在 service worker 激活时重新注册命令监听器
chrome.runtime.onStartup.addListener(() => {
  log('Extension started up');
});

// 监听 service worker 安装事件
chrome.runtime.onInstalled.addListener(() => {
  log('Service worker installed/updated');
});

// Add this new function definition
async function copyCurrentPageUrlOnly() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      await showNotification('Unable to get current tab information');
      return;
    }

    // Check for Chrome internal pages
    if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
      await showNotification('Unable to copy URL from Chrome internal pages');
      return;
    }

    const copySuccess = await copyToClipboard(activeTab.url);

    // Get notification preference
    const options = await new Promise(resolve => {
      chrome.storage.sync.get({ showNotification: true }, resolve);
    });

    if (options.showNotification) {
      if (copySuccess) {
        await showNotification('URL Copied!');
      } else {
        await showNotification('Copy failed, please try again');
      }
    }
  } catch (err) {
    console.error('Failed to copy URL:', err);
    await showNotification('Operation failed, please try again');
  }
}

// 复制当前页面为Markdown格式
async function copyCurrentPageAsMarkdown() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      await showNotification('Unable to get current tab information');
      return;
    }

    // 检查是否是Chrome内部页面
    if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
      await showNotification('Unable to use this feature in Chrome internal pages');
      return;
    }

    // 获取自定义格式设置
    const options = await new Promise(resolve => {
      chrome.storage.sync.get({
        format: '[{title}]({url})',
        showNotification: true
      }, resolve);
    });

    // 替换模板中的占位符
    // 确保生成纯文本格式的Markdown链接
    let markdownText = options.format
      .replace('{title}', activeTab.title)
      .replace('{url}', activeTab.url);

    // 确保输出的是纯文本，去除可能的格式信息
    markdownText = markdownText.toString();

    // 复制到剪贴板
    const copySuccess = await copyToClipboard(markdownText);

    // 显示通知
    if (options.showNotification) {
      if (copySuccess) {
        await showNotification('Copied as Markdown format!');
      } else {
        await showNotification('Copy failed, please try again');
      }
    }
  } catch (err) {
    console.error('Failed to copy Markdown format:', err);
    await showNotification('Operation failed, please try again');
  }
}



// 复制文本到剪贴板 - 性能优化版本
async function copyToClipboard(text) {
  try {
    // 优先使用现代剪贴板 API
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      log('Copied via clipboard API');
      return true;
    }
    
    // 回退到内容脚本方法
    log('Using content script fallback');
    return await executeContentScriptCopy(text);
  } catch (err) {
    error('Clipboard operation failed:', err);
    return await executeContentScriptCopy(text);
  }
}



// 在内容脚本中执行复制操作 - 性能优化版本
async function executeContentScriptCopy(text) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return false;

    // 重用已注入的内容脚本，避免重复注入
    try {
      // 先尝试直接调用已存在的内容脚本
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: 'copyToClipboard',
        text: text
      });
      if (result?.success) return true;
    } catch (e) {
      // 内容脚本未加载，继续注入
    }

    // 注入并执行复制操作
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (textToCopy) => {
        // 使用更高效的一次性复制函数
        const copyText = (text) => {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;left:-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textarea);
          return success;
        };
        
        const success = copyText(textToCopy);
        return { success };
      },
      args: [text]
    });

    return results?.[0]?.result?.success || false;
  } catch (err) {
    error('Content script copy failed:', err);
    return false;
  }
}



// 显示通知 - 性能优化版本
async function showNotification(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // 使用更高效的通知系统
    try {
      // 直接注入通知代码，避免消息传递开销
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msg) => {
          // 清理已存在的通知
          const existing = document.getElementById('md-copy-notification');
          if (existing) {
            existing.remove();
          }

          // 使用 CSS 动画代替 JavaScript setTimeout
          const style = document.createElement('style');
          style.textContent = `
            @keyframes fadeInOut {
              0% { opacity: 0; transform: translateY(-20px); }
              10% { opacity: 1; transform: translateY(0); }
              90% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-20px); }
            }
            .md-notification {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #4CAF50;
              color: white;
              padding: 12px 16px;
              border-radius: 4px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              z-index: 9999;
              font-family: system-ui, sans-serif;
              font-size: 14px;
              animation: fadeInOut 3s ease-in-out forwards;
              pointer-events: none;
            }
          `;
          
          if (!document.getElementById('md-notification-style')) {
            style.id = 'md-notification-style';
            document.head.appendChild(style);
          }

          const notification = document.createElement('div');
          notification.className = 'md-notification';
          notification.textContent = msg;
          document.body.appendChild(notification);

          // 动画结束后自动清理
          notification.addEventListener('animationend', () => {
            notification.remove();
          });
        },
        args: [message]
      });
    } catch (err) {
      error('Notification failed:', err);
    }
  } catch (err) {
    error('Failed to display notification:', err);
  }
}



// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'copyAsMarkdown') {
    copyCurrentPageAsMarkdown()
      .then(() => sendResponse({ success: true }))
      .catch(err => {
        console.error('Failed to process copy request:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // 保持消息通道开放，等待异步响应
  }
  return false;
});
