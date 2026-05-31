#!/bin/bash
# 学霸帝 Zero-to-CAD — 构建脚本
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "🔧 学霸帝 Zero-to-CAD 构建脚本"
echo "================================"

# 1. 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# 2. 安装 npm 依赖
echo ""
echo "📦 安装前端依赖..."
npm install

# 3. 检查 Python 依赖
echo ""
echo "🐍 检查 Python 依赖..."
pip3 install -r python/requirements.txt --quiet 2>/dev/null || {
    echo "⚠️  Python 依赖安装可能不完整"
    echo "   请手动运行: pip3 install -r python/requirements.txt"
}

# 4. 创建应用图标（如果不存在）
if [ ! -f "assets/icon.icns" ]; then
    echo ""
    echo "🎨 生成应用图标..."
    python3 -c "
import struct, os

def create_png(width, height, pixels):
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', 0xFFFFFFFF & __import__('zlib').crc32(c))
    
    header = b'\\x89PNG\\r\\n\\x1a\\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    
    raw_data = b''
    for y in range(height):
        raw_data += b'\\x00'  # filter none
        for x in range(width):
            cx, cy = x - width//2, y - height//2
            dist = (cx*cx + cy*cy) ** 0.5
            r = width // 3
            if dist < r * 0.35:
                raw_data += bytes([0, 212, 170])
            elif dist < r * 0.7:
                raw_data += bytes([0, 136, 255])
            elif dist < r:
                raw_data += bytes([8, 9, 13])
            else:
                raw_data += bytes([15, 17, 23])
    
    idat = chunk(b'IDAT', __import__('zlib').compress(raw_data))
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

# 创建 512x512 图标
png = create_png(512, 512)
with open('assets/icon.png', 'wb') as f:
    f.write(png)
print('图标已生成: assets/icon.png')
" 2>/dev/null || echo "⚠️ 图标生成失败，将使用默认图标"
fi

# 5. 转换为 icns（macOS）
if [ -f "assets/icon.png" ] && [ ! -f "assets/icon.icns" ]; then
    echo ""
    echo "🔄 转换图标格式..."
    mkdir -p /tmp/icon.iconset
    sips -z 16 16 assets/icon.png --out /tmp/icon.iconset/icon_16x16.png 2>/dev/null
    sips -z 32 32 assets/icon.png --out /tmp/icon.iconset/icon_16x16@2x.png 2>/dev/null
    sips -z 32 32 assets/icon.png --out /tmp/icon.iconset/icon_32x32.png 2>/dev/null
    sips -z 64 64 assets/icon.png --out /tmp/icon.iconset/icon_32x32@2x.png 2>/dev/null
    sips -z 128 128 assets/icon.png --out /tmp/icon.iconset/icon_128x128.png 2>/dev/null
    sips -z 256 256 assets/icon.png --out /tmp/icon.iconset/icon_128x128@2x.png 2>/dev/null
    sips -z 256 256 assets/icon.png --out /tmp/icon.iconset/icon_256x256.png 2>/dev/null
    sips -z 512 512 assets/icon.png --out /tmp/icon.iconset/icon_256x256@2x.png 2>/dev/null
    sips -z 512 512 assets/icon.png --out /tmp/icon.iconset/icon_512x512.png 2>/dev/null
    sips -z 1024 1024 assets/icon.png --out /tmp/icon.iconset/icon_512x512@2x.png 2>/dev/null
    iconutil -c icns /tmp/icon.iconset -o assets/icon.icns 2>/dev/null && echo "✅ icon.icns 已生成" || echo "⚠️ icns 转换失败"
    rm -rf /tmp/icon.iconset
fi

echo ""
echo "============================="
echo ""
echo "🎉 构建准备完成！"
echo ""
echo "运行方式："
echo "  开发模式: npm start"
echo "  打包 DMG: npm run dist"
echo ""
echo "首次运行需要下载模型（约4.2GB），请确保网络畅通。"
