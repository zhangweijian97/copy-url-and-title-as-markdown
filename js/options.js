// options.js
// 处理设置页面的交互逻辑

document.addEventListener('DOMContentLoaded', () => {
  // 获取DOM元素
  const formatInput = document.getElementById('format-input');
  const showNotificationCheckbox = document.getElementById('show-notification-checkbox');
  const previewText = document.getElementById('preview-text');
  const saveButton = document.getElementById('save-button');
  const resetButton = document.getElementById('reset-button');
  const shortcutsButton = document.getElementById('shortcuts-button');
  const statusMessage = document.getElementById('status');
  
  // 默认设置
  const defaultSettings = {
    format: '[{title}]({url})',
    showNotification: true
  };
  
  // 加载保存的设置
  loadSettings();
  
  // 格式输入变化时更新预览
  formatInput.addEventListener('input', updatePreview);
  
  // 保存按钮点击事件
  saveButton.addEventListener('click', saveSettings);
  
  // 重置按钮点击事件
  resetButton.addEventListener('click', resetSettings);
  
  // 快捷键设置按钮点击事件
  shortcutsButton.addEventListener('click', openShortcutsPage);
  
  // 加载保存的设置
  function loadSettings() {
    chrome.storage.sync.get(defaultSettings, (items) => {
      formatInput.value = items.format;
      showNotificationCheckbox.checked = items.showNotification;
      updatePreview();
    });
  }
  
  // 保存设置
  function saveSettings() {
    const format = formatInput.value.trim() || defaultSettings.format;
    const showNotification = showNotificationCheckbox.checked;
    
    chrome.storage.sync.set({
      format: format,
      showNotification: showNotification
    }, () => {
      // 显示保存成功消息
      statusMessage.textContent = 'Settings saved!';
      statusMessage.classList.add('show');
      
      // 3秒后隐藏消息
      setTimeout(() => {
        statusMessage.classList.remove('show');
      }, 3000);
    });
  }
  
  // 重置为默认设置
  function resetSettings() {
    formatInput.value = defaultSettings.format;
    showNotificationCheckbox.checked = defaultSettings.showNotification;
    updatePreview();
    
    // 保存默认设置
    saveSettings();
  }
  
  // 更新预览
  function updatePreview() {
    const format = formatInput.value.trim() || defaultSettings.format;
    const sampleTitle = 'Example Web Page Title';
    const sampleUrl = 'https://example.com';
    
    const previewMarkdown = format
      .replace('{title}', sampleTitle)
      .replace('{url}', sampleUrl);
    
    previewText.textContent = previewMarkdown;
  }
  
  // 打开Chrome快捷键设置页面
  function openShortcutsPage() {
    chrome.tabs.create({
      url: 'chrome://extensions/shortcuts'
    });
  }
});
