
#!/bin/bash

# Chrome扩展插件发布打包脚本
# Click & Scrape Extension Release Packager

echo "🚀 开始打包Chrome扩展插件..."

# 设置变量
PLUGIN_NAME="click-scrape-extension"
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
RELEASE_DIR="release"
PACKAGE_DIR="${RELEASE_DIR}/${PLUGIN_NAME}-v${VERSION}"
ARCHIVE_NAME="${PLUGIN_NAME}-v${VERSION}.zip"

# 创建发布目录
echo "📁 创建发布目录结构..."
rm -rf "${RELEASE_DIR}"
mkdir -p "${PACKAGE_DIR}"

# 复制插件核心文件
echo "📋 复制插件核心文件..."
cp manifest.json "${PACKAGE_DIR}/"
cp background.js "${PACKAGE_DIR}/"
cp content.js "${PACKAGE_DIR}/"

# 复制图标文件
echo "🎨 复制图标文件..."
if [ -d "icons" ]; then
    mkdir -p "${PACKAGE_DIR}/icons"
    cp icons/*.png "${PACKAGE_DIR}/icons/" 2>/dev/null || echo "  ⚠️  警告: 未找到PNG图标文件"
    cp icons/*.svg "${PACKAGE_DIR}/icons/" 2>/dev/null || echo "  ℹ️  未找到SVG文件"
else
    echo "  ⚠️  警告: 图标文件夹不存在，请先生成图标"
fi

# 验证必要文件是否存在
echo "🔍 验证必要文件..."
REQUIRED_FILES=("manifest.json" "background.js" "content.js")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "${PACKAGE_DIR}/${file}" ]; then
        echo "❌ 错误: 缺少必要文件 ${file}"
        exit 1
    else
        echo "✅ ${file} 已复制"
    fi
done

# 创建英文版README用于发布
echo "📝 创建英文版发布说明文件..."
cat > "${PACKAGE_DIR}/README.txt" << EOF
Click & Scrape Chrome Extension v${VERSION}
============================================

An intelligent Chrome extension for visual web element selection and optimal CSS selector generation.

Installation:
1. Open Chrome browser and go to chrome://extensions
2. Turn on "Developer mode" toggle in the top right
3. Click "Load unpacked" button in the top left
4. Select the extracted folder

Usage:
1. Click the extension icon to start selection mode
2. Hover over web elements to preview
3. Click elements to select and generate CSS selectors
4. Press ESC key to exit selection mode

Key Features:
- Smart CSS selector generation
- List element optimization algorithm
- Visual element selection
- History management
- One-click selector copying

Perfect for frontend developers, test engineers, and data analysts.

For more information, visit the project homepage.
EOF

# 创建压缩包
echo "📦 创建压缩包..."
cd "${RELEASE_DIR}"
zip -r "${ARCHIVE_NAME}" "${PLUGIN_NAME}-v${VERSION}"
cd ..

# 显示打包结果
echo ""
echo "✅ 打包完成!"
echo "📂 发布文件位置: ${RELEASE_DIR}/"
echo "📁 解压版本: ${PACKAGE_DIR}/"
echo "📦 压缩包: ${RELEASE_DIR}/${ARCHIVE_NAME}"
echo ""

# 显示文件信息
echo "📋 打包文件列表:"
echo "-------------------"
ls -la "${PACKAGE_DIR}/"
echo ""

echo "📊 压缩包信息:"
echo "-------------------"
ls -lh "${RELEASE_DIR}/${ARCHIVE_NAME}"
echo ""

echo "🎯 发布指南:"
echo "1. Chrome Web Store: 上传 ${RELEASE_DIR}/${ARCHIVE_NAME}"
echo "2. 开发者安装: 解压 ${PACKAGE_DIR}/ 并加载到Chrome"
echo "3. 测试验证: 在浏览器中测试所有功能"
echo ""

echo "🔍 版本信息: v${VERSION}"
echo "✨ 打包流程完成!"
