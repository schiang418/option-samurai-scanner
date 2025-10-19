# Option Samurai Scanner

自動掃描 Option Samurai 雙週收入選擇權策略的 Web 應用程式。

## 功能特色

- ✅ **即時掃描**: 點擊按鈕即時執行 Bull PUT Spread 策略掃描
- ✅ **自動登入**: 自動登入 Option Samurai 帳戶
- ✅ **Excel 報告**: 自動生成格式化的 Excel 報告
- ✅ **無需登入**: 完全免費使用,無需註冊
- ✅ **現代化 UI**: 響應式設計,支援桌面和移動設備

## 技術架構

### 前端
- **框架**: React 19 + Vite
- **UI 庫**: shadcn/ui + Tailwind CSS
- **狀態管理**: tRPC + React Query
- **圖標**: Lucide React

### 後端
- **框架**: Express + tRPC
- **自動化**: Playwright (Chromium)
- **Excel 生成**: ExcelJS
- **語言**: TypeScript

## 快速開始

### 安裝依賴

```bash
pnpm install
```

### 啟動開發伺服器

```bash
pnpm dev
```

網站將在 `http://localhost:3000` 啟動。

### 建置生產版本

```bash
pnpm build
pnpm start
```

## 使用方式

1. 打開網站
2. 點擊「生成 Bi-Weekly Income 報告」按鈕
3. 等待 30-60 秒完成掃描
4. 自動下載 Excel 報告

## 掃描策略說明

### Bi-Weekly Income All

**策略類型**: Bull PUT Spread (牛市看跌價差)

**篩選條件**:
- 總選擇權成交量: > 5,000
- 價內程度: -15% 以下股價
- 到期日範圍: 10-18 天
- Short PUT Delta: 1-20
- 最大獲利機率: > 80%
- 價差寬度: $50
- 最大獲利: > $50

**預期結果**:
- 約 21+ 個交易機會
- 平均獲利機率: 96%+
- 平均報酬率: 1.76%

## Excel 報告內容

### 工作表 1: 策略摘要
- 報告生成時間
- 策略類型和參數
- 掃描結果統計
- 高報酬機會列表

### 工作表 2: 掃描結果
包含以下欄位:
- 排名
- 股票代號
- 公司名稱
- 股價
- 股價變動%
- IV Rank %
- IV值
- 賣出履約價
- 買入履約價
- 距股價%_賣出
- 距股價%_買入
- 到期日
- 距到期天數
- 總選擇權成交量
- 獲利機率%
- 收到權利金
- 最大獲利
- 報酬率%

## 專案結構

```
option-samurai-scanner/
├── client/                 # 前端代碼
│   ├── src/
│   │   ├── pages/         # 頁面組件
│   │   │   └── Home.tsx   # 主頁面
│   │   ├── components/    # UI 組件
│   │   └── lib/           # 工具函數
├── server/                # 後端代碼
│   ├── routers.ts         # tRPC 路由
│   ├── optionSamuraiScanner.ts  # 掃描器核心邏輯
│   └── db.ts              # 資料庫操作
└── shared/                # 共享類型和常數
```

## API 端點

### `scanner.executeScan`

執行 bi-weekly income 掃描並返回 Excel 檔案。

**類型**: Mutation (POST)

**返回值**:
```typescript
{
  success: boolean;
  scanDate: string;
  strategy: string;
  resultCount: number;
  excelBase64: string;
  fileName: string;
}
```

## 環境變數

專案使用 Manus 平台提供的內建環境變數,無需額外配置。

## 未來擴展計劃

### 階段 2: 增強功能
- [ ] 支援多個掃描策略 (weekly, monthly, yearly)
- [ ] 歷史數據追蹤
- [ ] 自訂篩選條件
- [ ] 圖表和視覺化

### 階段 3: 訂閱服務
- [ ] 用戶註冊和登入
- [ ] 訂閱付費功能
- [ ] 每日自動掃描
- [ ] Email 通知
- [ ] 進階分析功能

## 技術細節

### 自動化流程

1. **初始化瀏覽器**: 使用 Playwright Chromium
2. **登入 Option Samurai**: 自動填寫表單並提交
3. **導航到掃描頁面**: 訪問預定義的掃描 URL
4. **提取數據**: 使用 DOM 選擇器提取表格數據
5. **生成 Excel**: 使用 ExcelJS 創建格式化報告
6. **清理資源**: 關閉瀏覽器並釋放記憶體

### 性能優化

- 使用 Headless 瀏覽器減少資源消耗
- 單次掃描完成後立即清理資源
- 前端使用 React Query 快取管理
- Excel 使用 Base64 傳輸,避免檔案系統操作

### 錯誤處理

- 自動重試機制 (Playwright 內建)
- 詳細的錯誤日誌
- 用戶友好的錯誤提示
- 資源清理保證 (try-finally)

## 故障排除

### 掃描失敗

**可能原因**:
1. Option Samurai 網站結構變更
2. 網路連線問題
3. 登入憑證錯誤

**解決方法**:
1. 檢查伺服器日誌
2. 驗證登入憑證
3. 更新 DOM 選擇器

### Excel 下載失敗

**可能原因**:
1. 瀏覽器阻擋下載
2. Base64 解碼錯誤

**解決方法**:
1. 允許瀏覽器下載
2. 檢查網路連線
3. 清除瀏覽器快取

## 授權

本專案僅供個人學習和研究使用。

## 聯絡方式

如有問題或建議,請聯絡專案維護者。

---

**注意**: 本工具使用您的 Option Samurai 帳戶進行掃描。請確保遵守 Option Samurai 的服務條款。

