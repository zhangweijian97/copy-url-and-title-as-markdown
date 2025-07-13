# 截图制作步骤

## 准备工作

### 1. 设置浏览器语言
```bash
# 中文界面截图
1. 打开 chrome://settings/languages
2. 将中文设置为首选语言
3. 重启Chrome

# 英文界面截图  
1. 将英文设置为首选语言
2. 重启Chrome
```

### 2. 准备测试网页
- **中文**：知乎、掘金、CSDN
- **英文**：GitHub、Stack Overflow、Medium

## 截图制作步骤

### 截图1：主要功能（中文）
1. 访问：https://www.zhihu.com
2. 点击扩展图标
3. 按F12 → 设备模拟器 → 1280x800
4. 截图保存为：`screenshot-main-zh-1280x800.png`

### 截图2：快捷键提示（英文）
1. 访问：https://github.com
2. 点击扩展图标  
3. 截图保存为：`screenshot-shortcut-en-1280x800.png`

### 截图3：设置界面
1. 访问：chrome://extensions/
2. 找到扩展 → 详细信息 → 扩展程序选项
3. 截图保存为：`screenshot-settings-1280x800.png`

### 截图4：使用场景
1. 打开Typora或VS Code
2. 粘贴复制的Markdown链接
3. 显示渲染效果
4. 截图保存为：`screenshot-use-case-1280x800.png`

## 截图优化技巧

### 窗口大小设置
```javascript
// 在Console中执行
window.resizeTo(1280, 800);
```

### 清除干扰元素
```css
/* 在Console中添加 */
document.body.style.zoom = '90%';
```

### 突出重要元素
使用Chrome DevTools的截图功能：
1. 打开DevTools
2. 按Ctrl+Shift+P
3. 输入"screenshot"
4. 选择"Capture node screenshot"