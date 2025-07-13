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
      await showNotification('无法获取当前标签页信息');
      return;
    }

    // 验证标签页信息
    if (!activeTab.url) {
      await showNotification('无法获取当前页面URL');
      return;
    }

    // 检查是否为内部页面
    if (isInternalPage(activeTab.url)) {
      await showNotification('无法在Chrome内部页面复制URL');
      return;
    }

    const safeUrl = sanitizeUrl(activeTab.url);
    const copySuccess = await copyToClipboard(safeUrl);

    // 安全获取通知设置
    const options = await getStorageOptions();

    if (options.showNotification) {
      await showNotification(copySuccess ? 'URL已复制！' : '复制失败，请重试');
    }
  } catch (err) {
    error('复制URL失败:', err);
    await showNotification('操作失败，请刷新页面后重试');
  }
}

// 复制当前页面为Markdown格式 - 增强错误处理版本
async function copyCurrentPageAsMarkdown() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      await showNotification('无法获取当前标签页信息');
      return;
    }

    // 验证标签页信息
    if (!activeTab.url || !activeTab.title) {
      await showNotification('标签页信息不完整');
      return;
    }

    // 检查是否是Chrome内部页面或无效URL
    if (isInternalPage(activeTab.url)) {
      await showNotification('无法在Chrome内部页面使用此功能');
      return;
    }

    // 安全地获取自定义格式设置，带错误处理
    const options = await getStorageOptions();
    
    // 安全地处理标题和URL，防止XSS和格式错误
    const safeTitle = sanitizeText(activeTab.title);
    const safeUrl = sanitizeUrl(activeTab.url);
    
    // 验证格式模板
    if (!isValidFormat(options.format)) {
      options.format = '[{title}]({url})'; // 使用默认格式
    }

    // 替换模板中的占位符
    let markdownText = options.format
      .replace(/{title}/g, safeTitle)
      .replace(/{url}/g, safeUrl);

    // 确保输出的是纯文本，限制长度防止内存问题
    markdownText = markdownText.toString().slice(0, 10000);

    // 复制到剪贴板
    const copySuccess = await copyToClipboard(markdownText);

    // 显示通知
    if (options.showNotification) {
      await showNotification(copySuccess ? '已复制为Markdown格式！' : '复制失败，请重试');
    }
  } catch (err) {
    error('复制Markdown格式失败:', err);
    await showNotification('操作失败，请刷新页面后重试');
  }
}



// 工具函数：检查是否为Chrome内部页面
function isInternalPage(url) {
  if (!url || typeof url !== 'string') return true;
  return url.startsWith('chrome://') || 
         url.startsWith('chrome-extension://') || 
         url.startsWith('edge://') ||
         url.startsWith('about:') ||
         !url.startsWith('http');
}

// 工具函数：清理文本，防止XSS
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return 'Untitled';
  return text.toString()
    .replace(/[<>]/g, '') // 移除潜在危险的HTML标签
    .replace(/\s+/g, ' ') // 规范化空白字符
    .trim()
    .slice(0, 500); // 限制长度
}

// 工具函数：验证和清理URL
function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return 'about:blank';
  
  try {
    const urlObj = new URL(url);
    return urlObj.toString();
  } catch {
    return 'about:blank';
  }
}

// 工具函数：验证格式模板
function isValidFormat(format) {
  if (!format || typeof format !== 'string') return false;
  return format.includes('{title}') && format.includes('{url}');
}

// 工具函数：安全获取存储选项，带错误处理
async function getStorageOptions() {
  const defaultOptions = {
    format: '[{title}]({url})',
    showNotification: true
  };
  
  try {
    // 使用 Promise 包装 chrome.storage API
    return await new Promise((resolve, reject) => {
      chrome.storage.sync.get(defaultOptions, (items) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(items);
        }
      });
    });
  } catch (err) {
    error('获取存储选项失败:', err);
    return defaultOptions; // 使用默认选项
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
