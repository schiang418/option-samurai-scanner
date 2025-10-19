# 本地部署到 Railway - 完整指南

## 🚀 5 分鐘部署流程

---

## 📋 前提條件

- ✅ Node.js 18+ 已安裝
- ✅ npm 已安裝
- ✅ 有 GitHub 帳號

---

## 步驟 1: 下載項目代碼

### 方法 A: 從當前沙箱下載

項目位置：`/home/ubuntu/option-samurai-scanner`

您可以：
1. 壓縮整個文件夾
2. 下載到本地
3. 解壓

### 方法 B: 從 GitHub 克隆（如果已推送）

```bash
git clone https://github.com/YOUR_USERNAME/option-samurai-scanner.git
cd option-samurai-scanner
```

---

## 步驟 2: 安裝 Railway CLI

```bash
npm install -g @railway/cli
```

驗證安裝：
```bash
railway --version
# 應該顯示: railway 4.10.0 或更高版本
```

---

## 步驟 3: 登錄 Railway

```bash
railway login
```

**會發生什麼：**
1. 終端會詢問：`Open the browser? (Y/n)`
2. 輸入 `Y` 並按 Enter
3. 瀏覽器會自動打開 Railway 登錄頁面
4. 使用 GitHub 登錄
5. 授權 Railway CLI
6. 返回終端，看到 "Logged in as YOUR_USERNAME"

---

## 步驟 4: 初始化 Railway 項目

```bash
cd option-samurai-scanner  # 確保在項目目錄中
railway init
```

**會發生什麼：**
1. 詢問項目名稱，輸入：`option-samurai-scanner`
2. Railway 會創建一個新項目
3. 看到 "Project created successfully"

---

## 步驟 5: 添加環境變量

```bash
railway variables set POLYGON_API_KEY=darsfvapYZJ7ysIzNspvIFgDqDE9VWMt
railway variables set NODE_ENV=production
railway variables set PORT=3000
```

驗證環境變量：
```bash
railway variables
```

---

## 步驟 6: 部署應用

```bash
railway up
```

**會發生什麼：**
1. Railway 會上傳您的代碼
2. 自動檢測到 Node.js 項目
3. 運行 `pnpm install && pnpm run build`
4. 啟動應用 `pnpm run start`
5. 部署完成！

**預計時間：2-3 分鐘**

---

## 步驟 7: 獲取網站 URL

```bash
railway domain
```

這會生成一個公開 URL，例如：
```
https://option-samurai-scanner-production.up.railway.app
```

**或者在網頁上查看：**
1. 訪問 https://railway.app
2. 進入您的項目
3. Settings → Domains → Generate Domain

---

## 步驟 8: 測試部署

訪問生成的 URL，測試：
1. ✅ 網站可以打開
2. ✅ 點擊 "使用 Polygon.io API 掃描"
3. ✅ 等待 3-4 分鐘
4. ✅ 下載 Excel 報告
5. ✅ 驗證 19/21 成功率

---

## 🔧 常用命令

### 查看日誌
```bash
railway logs
```

### 查看部署狀態
```bash
railway status
```

### 重新部署
```bash
railway up
```

### 查看環境變量
```bash
railway variables
```

### 打開項目控制台
```bash
railway open
```

### 連接到項目（如果切換了目錄）
```bash
railway link
```

---

## 📊 監控使用量

### 在終端查看
```bash
railway status
```

### 在網頁查看
1. 訪問 https://railway.app
2. 進入項目
3. Metrics 標籤 - 查看 CPU、內存、網絡使用量
4. 右上角頭像 → Usage - 查看費用

---

## 🔄 更新應用

當您修改代碼後：

```bash
# 1. 提交更改（如果使用 Git）
git add .
git commit -m "Update: description"

# 2. 重新部署
railway up
```

Railway 會自動：
- 上傳新代碼
- 重新構建
- 部署新版本

---

## 🆘 故障排除

### 問題 1: `railway: command not found`

**解決方案：**
```bash
npm install -g @railway/cli
```

### 問題 2: 部署失敗

**查看錯誤日誌：**
```bash
railway logs
```

**常見原因：**
- 環境變量未設置
- 構建命令錯誤
- 端口配置問題

### 問題 3: 無法訪問網站

**檢查：**
1. 部署是否成功：`railway status`
2. 是否生成了域名：`railway domain`
3. 查看日誌：`railway logs`

### 問題 4: API 掃描失敗

**檢查環境變量：**
```bash
railway variables
```

確保 `POLYGON_API_KEY` 已正確設置。

---

## 💰 費用管理

### 查看當前使用量
```bash
railway status
```

### 在網頁查看詳細費用
1. https://railway.app
2. 右上角頭像 → Usage
3. 查看當月使用量和費用

### 免費額度
- $5/月免費額度
- 個人使用通常在免費額度內

---

## 📝 完整命令清單

```bash
# 1. 安裝 CLI
npm install -g @railway/cli

# 2. 登錄
railway login

# 3. 進入項目目錄
cd option-samurai-scanner

# 4. 初始化項目
railway init

# 5. 設置環境變量
railway variables set POLYGON_API_KEY=darsfvapYZJ7ysIzNspvIFgDqDE9VWMt
railway variables set NODE_ENV=production
railway variables set PORT=3000

# 6. 部署
railway up

# 7. 生成域名
railway domain

# 8. 查看狀態
railway status

# 9. 查看日誌
railway logs
```

---

## ✅ 部署檢查清單

**部署前：**
- [ ] Node.js 已安裝
- [ ] Railway CLI 已安裝
- [ ] 項目代碼已下載

**部署中：**
- [ ] Railway 已登錄
- [ ] 項目已初始化
- [ ] 環境變量已設置
- [ ] 部署成功

**部署後：**
- [ ] 域名已生成
- [ ] 網站可訪問
- [ ] 掃描功能正常
- [ ] Excel 下載正常

---

## 🎯 預期結果

部署成功後，您將獲得：
- ✅ 一個公開的網站 URL
- ✅ 自動 HTTPS
- ✅ 24/7 運行
- ✅ 自動擴展
- ✅ 每月 $5 免費額度

---

## 📞 需要幫助？

如果遇到問題：
1. 查看 Railway 文檔：https://docs.railway.app
2. Railway Discord：https://discord.gg/railway
3. 查看日誌：`railway logs`

---

**祝您部署順利！🚀**

最後更新：2025-10-19
