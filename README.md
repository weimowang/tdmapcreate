# TD Map Create · 地圖製作室

日系簡約、淡色系的一頁式塔防地圖設計工具。Vue 3 + Vite + TypeScript，資料在瀏覽器處理，無後端與 AI API 金鑰。

## 功能

- 自訂欄列（預設 18×10）及每格寬高（預設 70×70 px）。
- 滑鼠左鍵按住拖曳繪路，也支援多路線逐格編輯、出入口、反轉、退回與共享路口；支援同一路線自我交叉。未勾選「交叉續畫」時，點已有格會從最後一次經過的位置擦除後段。
- 逐格設定障礙物，統一以「障」標示，避免和道路重疊；英文 Prompt 使用 obstacles，不指定種類。
- 道路與背景配色、合併去重的美術風格選單、細節選單及原文自訂風格描述。
- 字母欄／數字列座標（A1＝數值 0,0）；障礙統一顯示「障」。
- 選配手機安全外圍：預設關閉，四側可各自設定 px，不改核心地圖。
- JSON 匯出／匯入、本機草稿保存、英文 Prompt 一鍵複製／TXT 下載。
- SVG 與 PNG 格線參考圖下載。PNG 限 1,600 萬像素、單邊 8192 px；更大尺寸可用 SVG。
- 格線開關旁的「清空」可一次移除所有路線與障礙，確認後執行並還原全部美術設定，保留名稱與尺寸。
- 等比縮放與符合視窗、鍵盤方向鍵移動格子、Enter／Space 繪製。

[產品規格與 Mermaid UI 操作流程](docs/SPEC.md) · [驗收紀錄](docs/QA.md)

## 本機開發

使用 Node.js 22：

```sh
npm ci
npm run dev
npm test
npm run build
```

開啟終端顯示的 `/tdmapcreate/` 網址。`npm run build` 產出 `dist/`。

## GitHub Pages

Repository 的 **Settings → Pages → Source** 選擇 **GitHub Actions**。推送 `main` 後，`.github/workflows/pages.yml` 會安裝依賴、測試、建置並發布 `dist`。Vite 的 base 已設定為 `/tdmapcreate/`。

網站：[https://weimowang.github.io/tdmapcreate/](https://weimowang.github.io/tdmapcreate/)。首次 GitHub Pages 部署與正式頁面載入已驗證成功。

## 使用方式

1. 設定尺寸並套用，在邊界點選入口，依序點選上下左右相鄰格，最後停在邊界作為出口。
2. 可新增多條路線，也能拖曳穿越自己的路線畫出 8 字形。逐格點選交叉請勾選「交叉續畫（點選不擦除）」；取消勾選可恢復點擊擦除。JSON 保留每次經過的順序，共享格不會自動改變路線順序。
3. 選擇障礙物工具，在空地逐格放置。
4. 美術設定全部選填：可不指定風格、細節及顏色，仍產生純地圖幾何 Prompt。細節可選自訂，文字原文帶入；需要指定顏色時勾選對應欄位。
5. 通過檢查後下載 JSON／參考圖、複製英文 Prompt，交給 AI 產圖。完成後人工核對幾何對齊。

JSON 格座標由左上 (0,0) 起算。`canvasPx` 為核心範圍；`imagePx` 是含外圍的完整圖片與核心偏移。路線 `centerlinePx` 仍相對核心原點。

草稿只存在目前瀏覽器，清除網站資料會失去草稿，請下載 JSON 備份。網站本身不生成 AI 背景圖、不收集地圖資料。
