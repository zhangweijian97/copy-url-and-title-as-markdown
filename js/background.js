// background.js
// 确保 service worker 保持活跃状态
const KEEP_ALIVE_INTERVAL = 20 * 60 * 1000; // 20分钟

// 定期发送消息以保持 service worker 活跃
function keepAlive() {
  console.log('Service worker keep-alive ping at', new Date().toISOString());
  setTimeout(keepAlive, KEEP_ALIVE_INTERVAL);
}

// 在 service worker 启动时启动保活机制
keepAlive();

// 处理快捷键命令
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);
  if (command === 'copy_as_markdown') {
    copyCurrentPageAsMarkdown();
  } else if (command === 'copy_url_only') {
    copyCurrentPageUrlOnly();
  }
});

// 确保在 service worker 激活时重新注册命令监听器
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started up at', new Date().toISOString());
});

// 监听 service worker 安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('Service worker installed/updated at', new Date().toISOString());
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



// 复制文本到剪贴板
async function copyToClipboard(text) {
  try {
    // 检查navigator.clipboard是否可用
    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      // 使用navigator.clipboard API复制纯文本
      // 确保使用writeText方法，它只会复制纯文本，不带格式
      await navigator.clipboard.writeText(text);
      console.log('Successfully copied to clipboard as plain text:', text);
      return true;
    } else {
      // 如果navigator.clipboard不可用，直接使用内容脚本方法
      console.log('navigator.clipboard not available, using fallback method');
      return executeContentScriptCopy(text);
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);

    // 如果navigator.clipboard API失败，尝试在内容脚本中执行复制
    return executeContentScriptCopy(text);
  }
}



// 在内容脚本中执行复制操作
async function executeContentScriptCopy(text) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return false;

    // 注入并执行内容脚本
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (textToCopy) => {
        // 创建一个textarea元素用于复制纯文本
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        // 设置样式使其不可见
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        // 确保不会应用任何样式
        textarea.setAttribute('readonly', '');
        textarea.setAttribute('contenteditable', 'true');
        // 添加到DOM
        document.body.appendChild(textarea);
        // 选择文本并复制
        textarea.select();
        const success = document.execCommand('copy');
        // 移除元素
        document.body.removeChild(textarea);
        return success;
      },
      args: [text]
    });

    console.log('Successfully copied to clipboard as plain text using content script');
    return true;
  } catch (err) {
    console.error('Failed to copy in content script:', err);
    return false;
  }
}



// 显示通知
async function showNotification(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      // 尝试发送消息给内容脚本
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showNotification',
        message: message
      });
    } catch (error) {
      // If content script is not loaded, inject it
      console.log('Injecting content script...');
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['js/content.js']
      });

      // Give the content script a moment to load before sending the message
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'showNotification',
          message: message
        });
      } catch (err) {
          console.error('Failed to send notification message:', err);

          // If still fails, display notification directly on the page
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: (msg) => {
              // Prevent creating multiple notifications
              if (document.getElementById('md-copy-notification')) return;

              const notificationStyle = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #4CAF50;
                color: white;
                padding: 16px;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 9999;
                font-family: Arial, sans-serif;
                font-size: 14px;
                transition: opacity 0.3s ease-in-out;
              `;

              const notification = document.createElement('div');
              notification.id = 'md-copy-notification';
              notification.style.cssText = notificationStyle;
              notification.textContent = msg;
              notification.style.opacity = '0';

              document.body.appendChild(notification);

              setTimeout(() => {
                notification.style.opacity = '1';
              }, 10);

              setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                  if (notification.parentNode) {
                    document.body.removeChild(notification);
                  }
                }, 300);
              }, 3000);
            },
            args: [message]
          });
        }
    }
  } catch (err) {
    console.error('Failed to display notification:', err);
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
