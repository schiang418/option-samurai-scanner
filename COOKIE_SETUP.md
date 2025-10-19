# Option Samurai Cookie 設置指南

## 步驟 1: 提取 Cookies

您已經在 Manus 瀏覽器中登入了 Option Samurai。現在需要提取 cookies:

### 方法: 使用瀏覽器開發者工具

1. 在 Option Samurai 頁面打開開發者工具 (F12)
2. 切換到「Application」標籤
3. 在左側找到「Cookies」→「https://new.optionsamurai.com」
4. 您會看到所有的 cookies

### 需要的 Cookies

主要需要這些 cookies:
- `auth0` 相關的 cookies (認證 token)
- `session` 相關的 cookies
- 任何包含 `token` 的 cookies

## 步驟 2: 創建 Cookies 文件

創建文件 `option-samurai-cookies.json`,格式如下:

```json
[
  {
    "name": "cookie_name",
    "value": "cookie_value",
    "domain": ".optionsamurai.com",
    "path": "/",
    "expires": 1735689600,
    "httpOnly": false,
    "secure": true,
    "sameSite": "Lax"
  }
]
```

## 步驟 3: 測試

運行測試腳本:

```bash
npx tsx test-cookie-scanner.ts
```

如果成功,您會看到掃描結果和生成的 Excel 報告!

## 故障排除

### 如果出現「Not logged in」錯誤:
- Cookies 可能已過期
- Cookies 格式不正確
- 需要重新登入並提取新的 cookies

### Cookie 有效期:
- 通常 7-30 天
- 過期後需要重新提取
- 系統會自動檢測並提示

## 自動化提取腳本

由於瀏覽器安全限制,我們無法完全自動化提取。但您可以:

1. 手動登入一次
2. 提取 cookies (每 1-2 週一次)
3. 之後所有掃描都是全自動的!

