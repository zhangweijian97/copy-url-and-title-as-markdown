# Chrome Web Store 上架清单

## 上架前准备

### ✅ 基础信息
- [x] 扩展名称：复制网页为Markdown链接 / Copy URL and Title as Markdown
- [x] 版本号：1.1.0
- [x] 分类：生产力工具 / 开发者工具
- [x] 价格：免费

### ✅ 文件准备
- [x] 扩展图标：16x16, 48x48, 128x128（已存在）
- [x] 扩展包：zip格式（待打包）
- [x] 描述文档：STORE_DESCRIPTION.md
- [x] 隐私政策：PRIVACY_POLICY.md
- [x] 使用条款：TERMS_OF_SERVICE.md

### ✅ 功能清单
- [x] 一键复制为Markdown链接
- [x] 自定义格式模板
- [x] 键盘快捷键支持
- [x] 双语界面（中英文）
- [x] 优雅的通知反馈
- [x] 无需网络权限

### ✅ 权限声明
- `activeTab` - 访问当前标签页
- `clipboardWrite` - 写入剪贴板
- `storage` - 本地存储设置
- `scripting` - 显示页面内通知

## 上架步骤

### 1. 打包扩展
```bash
# 创建发布版本
zip -r copy-url-markdown-v1.1.0.zip . -x "*.git*" "*.DS_Store" "*.md" "resize_icons.py" "icons/temp/*"
```

### 2. Chrome Web Store 开发者账号
- [ ] 注册Chrome Web Store开发者账号
- [ ] 支付$5注册费（一次性）
- [ ] 填写开发者信息

### 3. 上传扩展
- [ ] 登录Chrome Web Store Developer Dashboard
- [ ] 点击"Add new item"
- [ ] 上传zip文件
- [ ] 填写扩展信息

### 4. 填写表单信息

#### 基本信息
- **名称**：复制网页为Markdown链接
- **描述**：使用STORE_DESCRIPTION.md中的内容
- **类别**：Productivity
- **语言**：简体中文、英文

#### 图片上传
- **图标**：icons/icon128.png
- **截图**：按照SCREENSHOTS_GUIDE.md制作
- **推广图片**：1280x800和640x400

#### 隐私设置
- **隐私政策**：链接到PRIVACY_POLICY.md
- **使用条款**：链接到TERMS_OF_SERVICE.md
- **数据收集**：选择"不收集用户数据"

#### 权限说明
- **权限**：已在manifest中声明
- **权限理由**：已在描述中说明

### 5. 发布选项
- **可见性**：公开
- **地区**：全球
- **价格**：免费

## 上架后维护

### 版本更新
- 定期更新功能和修复bug
- 响应用户反馈
- 保持兼容性

### 用户支持
- GitHub Issues支持
- 定期查看用户评论
- 及时回复问题

### 监控指标
- 安装量
- 用户评分
- 功能使用情况
- 崩溃报告

## 联系信息

**开发者**：zhangweijian
**GitHub**：https://github.com/zhangweijian97/copy-url-and-title-as-markdown
**支持邮箱**：通过GitHub Issues联系