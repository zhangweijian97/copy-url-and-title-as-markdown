#!/bin/bash

# Chrome Web Store 打包脚本
# 用于创建发布版本的zip文件

echo "🚀 开始打包Chrome扩展程序..."

# 版本号
VERSION="1.1.0"
FILENAME="copy-url-markdown-v${VERSION}.zip"

# 清理之前的打包文件
if [ -f "$FILENAME" ]; then
    echo "🧹 清理之前的打包文件..."
    rm "$FILENAME"
fi

# 打包命令 - 排除不需要的文件
echo "📦 正在打包扩展程序..."
zip -r "$FILENAME" . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "*.md" \
    -x "package.sh" \
    -x "resize_icons.py" \
    -x "icons/temp/*" \
    -x "STORE_*" \
    -x "PRIVACY_POLICY.md" \
    -x "TERMS_OF_SERVICE.md" \
    -x "SCREENSHOTS_GUIDE.md" \
    -x "STORE_CHECKLIST.md"

# 检查文件大小
FILESIZE=$(du -h "$FILENAME" | cut -f1)
echo "✅ 打包完成！"
echo "📁 文件名: $FILENAME"
echo "📊 文件大小: $FILESIZE"

# 验证zip文件
echo "🔍 验证zip文件..."
unzip -l "$FILENAME" | head -20
echo "..."

# 计算文件数量
FILECOUNT=$(unzip -l "$FILENAME" | wc -l)
echo "📋 文件数量: $((FILECOUNT - 2))个文件"

echo ""
echo "🎉 打包完成！"
echo "请将 $FILENAME 上传到Chrome Web Store"
echo ""
echo "📋 下一步操作："
echo "1. 访问 https://chrome.google.com/webstore/devconsole"
echo "2. 登录开发者账号"
echo "3. 点击 'Add new item'"
echo "4. 上传 $FILENAME"
echo "5. 填写扩展信息（参考 STORE_CHECKLIST.md）"