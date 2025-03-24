// background.js
// 处理快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'copy_as_markdown') {
    copyCurrentPageAsMarkdown();
  }
});

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
    const markdownText = options.format
      .replace('{title}', activeTab.title)
      .replace('{url}', activeTab.url);

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
      // 使用navigator.clipboard API复制文本
      await navigator.clipboard.writeText(text);
      console.log('Successfully copied to clipboard:', text);
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
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      },
      args: [text]
    });
    
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
      
      // 等待内容脚本加载完成
      setTimeout(async () => {
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
      }, 100);
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
