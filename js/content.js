// content.js
// 用于在页面上下文中执行的脚本

// 创建通知元素的样式
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
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
`;

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    showNotification(request.message);
    sendResponse({ success: true });
  }
  return true;
});

// 显示通知函数
function showNotification(message) {
  // 移除可能已存在的通知
  const existingNotification = document.getElementById('md-copy-notification');
  if (existingNotification) {
    document.body.removeChild(existingNotification);
  }
  
  // 创建新的通知元素
  const notification = document.createElement('div');
  notification.id = 'md-copy-notification';
  notification.style.cssText = notificationStyle;
  notification.textContent = message;
  
  // 添加到页面
  document.body.appendChild(notification);
  
  // 显示通知
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // 3秒后隐藏通知
  setTimeout(() => {
    notification.style.opacity = '0';
    
    // 动画完成后移除元素
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
