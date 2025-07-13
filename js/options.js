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
  
  // 加载保存的设置 - 增强错误处理
  function loadSettings() {
    try {
      chrome.storage.sync.get(defaultSettings, (items) => {
        if (chrome.runtime.lastError) {
          console.error('加载设置失败:', chrome.runtime.lastError);
          resetToDefaults();
          return;
        }
        
        // 验证和清理设置
        const safeFormat = validateFormat(items.format) ? items.format : defaultSettings.format;
        const safeShowNotification = typeof items.showNotification === 'boolean' ? items.showNotification : defaultSettings.showNotification;
        
        formatInput.value = safeFormat;
        showNotificationCheckbox.checked = safeShowNotification;
        updatePreview();
      });
    } catch (err) {
      console.error('加载设置时出错:', err);
      resetToDefaults();
    }
  }
  
  // 保存设置 - 增强错误处理
  function saveSettings() {
    try {
      let format = formatInput.value.trim();
      
      // 验证格式模板
      if (!validateFormat(format)) {
        alert('格式必须包含 {title} 和 {url} 占位符');
        return;
      }
      
      // 限制格式长度
      format = format.slice(0, 1000);
      
      const showNotification = Boolean(showNotificationCheckbox.checked);
      
      chrome.storage.sync.set({
        format: format,
        showNotification: showNotification
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('保存设置失败:', chrome.runtime.lastError);
          statusMessage.textContent = '保存失败，请重试';
          statusMessage.classList.add('error');
        } else {
          statusMessage.textContent = '设置已保存！';
          statusMessage.classList.add('success');
        }
        
        statusMessage.classList.add('show');
        
        // 3秒后隐藏消息
        setTimeout(() => {
          statusMessage.classList.remove('show', 'success', 'error');
        }, 3000);
      });
    } catch (err) {
      console.error('保存设置时出错:', err);
      statusMessage.textContent = '保存失败，请重试';
      statusMessage.classList.add('show', 'error');
    }
  }
  
  // 工具函数：验证格式模板
  function validateFormat(format) {
    if (!format || typeof format !== 'string') return false;
    return format.includes('{title}') && format.includes('{url}');
  }
  
  // 工具函数：重置为默认设置
  function resetToDefaults() {
    formatInput.value = defaultSettings.format;
    showNotificationCheckbox.checked = defaultSettings.showNotification;
    updatePreview();
  }
  
  // 重置为默认设置
  function resetSettings() {
    resetToDefaults();
    saveSettings();
  }
  
  // 更新预览 - 增强错误处理
  function updatePreview() {
    try {
      let format = formatInput.value.trim() || defaultSettings.format;
      const sampleTitle = '示例网页标题';
      const sampleUrl = 'https://example.com';
      
      // 验证和清理格式
      if (!validateFormat(format)) {
        format = defaultSettings.format;
      }
      
      // 安全地生成预览
      const previewMarkdown = format
        .replace(/{title}/g, sampleTitle.replace(/[<>]/g, ''))
        .replace(/{url}/g, sampleUrl);
      
      previewText.textContent = previewMarkdown;
    } catch (err) {
      console.error('更新预览时出错:', err);
      previewText.textContent = '[示例网页标题](https://example.com)';
    }
  }
  
  // 打开Chrome快捷键设置页面
  function openShortcutsPage() {
    chrome.tabs.create({
      url: 'chrome://extensions/shortcuts'
    });
  }
});
