# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 提供在此代码库中工作的指导。

## 项目概述

这是一个 Chrome 扩展程序，可以一键将当前网页的标题和 URL 复制为 Markdown 格式的链接。扩展提供键盘快捷键和 UI 交互两种复制方式。

## 架构设计

扩展采用 Chrome Extension Manifest V3 架构，主要组件包括：

- **Service Worker** (`js/background.js`): 处理扩展生命周期、键盘快捷键和剪贴板操作
- **内容脚本** (`js/content.js`): 显示页面内通知并处理 DOM 交互
- **弹出界面** (`html/popup.html` + `js/popup.js`): 提供可视化的复制和设置访问界面
- **选项页面** (`html/options.html` + `js/options.js`): 自定义格式和通知设置

## 核心功能

1. **键盘快捷键**: Alt+Shift+C（复制为 markdown），Alt+Shift+U（仅复制 URL）
2. **直接操作**: 点击扩展图标直接复制 markdown，无需弹窗
3. **可自定义格式**: 用户可通过选项页面自定义 markdown 格式
4. **智能通知**: 复制操作的可视化反馈
5. **剪贴板处理**: 健壮的剪贴板 API 及备用方法

## 开发命令

### 加载扩展进行开发
1. 打开 Chrome → `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序" → 选择项目文件夹

### 测试扩展
- **键盘快捷键**: 在任意网页使用 Alt+Shift+C 或 Alt+Shift+U
- **图标点击**: 点击扩展图标直接复制 markdown
- **弹出界面**: 点击扩展图标 → 使用弹出界面
- **选项设置**: 右键点击扩展图标 → 选项，或通过弹出界面 → 设置

### 调试扩展
- **后台日志**: `chrome://extensions/` → Service Worker → 检查
- **内容脚本日志**: 在任意网页打开 DevTools → 控制台
- **存储检查**: DevTools → 应用程序 → 存储 → 扩展存储

### 图标管理
- 图标存储在 `/icons/` 目录
- Python 脚本 `resize_icons.py` 可用于图标调整
- 必需尺寸: 16x16, 48x48, 128x128 像素

## 文件结构

- `manifest.json`: 扩展配置和权限
- `js/background.js`: 包含剪贴板逻辑的服务工作线程
- `js/content.js`: 页面内通知和 DOM 操作
- `js/popup.js`: 弹出界面逻辑
- `js/options.js`: 设置页面功能
- `html/*.html`: 扩展界面页面
- `css/*.css`: 扩展界面样式
- `icons/`: 多尺寸扩展图标

## 使用的关键 API

- `chrome.tabs.query()`: 获取当前标签页信息
- `chrome.storage.sync`: 持久化用户设置
- `chrome.commands.onCommand`: 键盘快捷键处理
- `chrome.action.onClicked`: 扩展图标点击处理
- `navigator.clipboard.writeText`: 现代剪贴板 API
- `document.execCommand('copy')`: 备用剪贴板方法