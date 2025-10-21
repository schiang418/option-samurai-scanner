# Option Samurai Scanner

自動掃描雙週收入選擇權策略的 Bull PUT Spread 交易機會。

## 功能特點

- ✅ 自動掃描 21 支高流動性股票
- ✅ 使用 Polygon.io API 獲取實時數據
- ✅ 智能篩選符合條件的 Bull PUT Spread 策略
- ✅ 完善的 API 錯誤處理和重試機制
- ✅ 生成詳細的 Excel 報告
- ✅ 成功率：90.5% (19/21)

## 技術棧

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **後端**: Node.js + Express + tRPC
- **API**: Polygon.io
- **Excel**: ExcelJS

## 快速開始

### 本地開發

```bash
# 安裝依賴
pnpm install

# 設置環境變量
cp .env.example .env
# 編輯 .env 添加您的 POLYGON_API_KEY

# 啟動開發服務器
pnpm run dev
```

訪問 http://localhost:3000

### 生產構建

```bash
# 構建
pnpm run build

# 啟動
pnpm run start
```

## 部署

### Railway 部署（推薦）

詳細步驟請參考 [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md)

快速部署：
1. 推送代碼到 GitHub
2. 訪問 https://railway.app
3. 連接 GitHub 倉庫
4. 添加環境變量 `POLYGON_API_KEY`
5. 自動部署完成！

## 環境變量

```env
POLYGON_API_KEY=your_polygon_api_key_here
NODE_ENV=production
PORT=3000
```

## API 錯誤處理

本項目包含完善的 API 錯誤處理機制：

- ✅ 股票價格 API：7 次重試，速率限制專用延遲
- ✅ 選擇權 API：5 次重試，指數退避延遲
- ✅ 股票間延遲：2.5 秒
- ✅ 速率限制處理：5-30 秒延遲

詳細信息請參考 [API_Error_Fix_Summary.md](./API_Error_Fix_Summary.md)

## 掃描策略

### 篩選條件

- 到期日：10-18 天
- 獲利機率：> 80%
- 價差寬度：$40-60
- Delta 範圍：0.01-0.20
- 最小獲利：> $50

### 目標股票列表

TSLA, AMD, NVDA, AMZN, META, GOOG, GOOGL, NFLX, ORCL, AVGO, TSM, MU, PLTR, COIN, MSTR, CVNA, APP, CLS, SMH, LLY, OKLO

## 項目結構

```
option-samurai-scanner/
├── client/              # 前端代碼
│   ├── src/
│   │   ├── pages/      # 頁面組件
│   │   └── components/ # UI 組件
├── server/              # 後端代碼
│   ├── _core/          # 服務器核心
│   └── polygonScanner.ts # 掃描邏輯
├── package.json
└── README.md
```

## 許可證

MIT

## 作者

由 Manus AI 協助開發
add a line to trigger rebuild

