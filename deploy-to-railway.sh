#!/bin/bash

echo "🚀 Option Samurai Scanner - Railway 部署助手"
echo "============================================"
echo ""

# 檢查是否安裝了 gh CLI
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI 未安裝"
    echo "請訪問 https://cli.github.com/ 安裝 gh CLI"
    echo ""
    echo "或使用手動方式："
    echo "1. 訪問 https://github.com/new 創建新倉庫"
    echo "2. 按照指示推送代碼"
    exit 1
fi

# 檢查是否已登錄 GitHub
if ! gh auth status &> /dev/null; then
    echo "📝 請先登錄 GitHub..."
    gh auth login
fi

echo "📦 準備推送代碼到 GitHub..."
echo ""

# 初始化 Git（如果需要）
if [ ! -d .git ]; then
    git init
    git add .
    git commit -m "Initial commit - Option Samurai Scanner"
fi

# 創建 GitHub 倉庫並推送
echo "🔄 創建 GitHub 倉庫..."
gh repo create option-samurai-scanner --public --source=. --push

echo ""
echo "✅ 代碼已推送到 GitHub！"
echo ""
echo "📋 下一步："
echo "1. 訪問 https://railway.app"
echo "2. 使用 GitHub 登錄"
echo "3. 點擊 'New Project' → 'Deploy from GitHub repo'"
echo "4. 選擇 'option-samurai-scanner' 倉庫"
echo "5. 添加環境變量："
echo "   - POLYGON_API_KEY=darsfvapYZJ7ysIzNspvIFgDqDE9VWMt"
echo "   - NODE_ENV=production"
echo "6. 等待部署完成！"
echo ""
echo "📖 詳細指南請查看: RAILWAY_DEPLOYMENT_GUIDE.md"
echo ""
