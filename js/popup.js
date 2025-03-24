// popup.js
// 处理弹出窗口的交互逻辑

document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const copyButton = document.getElementById('copy-button');
  const optionsButton = document.getElementById('options-button');
  const previewText = document.getElementById('preview-text');
  const shortcutText = document.getElementById('shortcut-text');
  
  // 获取当前操作系统类型，用于显示正确的快捷键
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutPrefix = isMac ? 'Command' : 'Ctrl';
  shortcutText.textContent = `${shortcutPrefix}+Shift+C`;
  
  // 获取当前标签页信息并更新预览
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      previewText.textContent = 'Unable to get current tab information';
      return;
    }

    const activeTab = tabs[0];
    
    // 检查是否是Chrome内部页面
    if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
      previewText.textContent = 'Unable to use this feature in Chrome internal pages';
      copyButton.disabled = true;
      return;
    }

    // 获取自定义格式设置
    chrome.storage.sync.get({
      format: '[{title}]({url})'
    }, (options) => {
      // 替换模板中的占位符
      const markdownText = options.format
        .replace('{title}', activeTab.title)
        .replace('{url}', activeTab.url);
      
      // 更新预览
      previewText.textContent = markdownText;
    });
  });
  
  // 复制按钮点击事件
  copyButton.addEventListener('click', () => {
    // 显示加载状态
    copyButton.textContent = 'Copying...';
    copyButton.disabled = true;
    
    chrome.runtime.sendMessage({ action: 'copyAsMarkdown' }, (response) => {
      if (response && response.success) {
        // 显示复制成功的视觉反馈
        copyButton.textContent = 'Copied!';
      } else {
        // 显示错误反馈
        copyButton.textContent = 'Copy failed!';
        console.error('Copy failed:', response ? response.error : 'Unknown error');
      }
      
      // 恢复按钮状态
      copyButton.disabled = false;
      setTimeout(() => {
        copyButton.textContent = 'Copy as Markdown';
      }, 1500);
    });
  });
  
  // 设置按钮点击事件
  optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
