# 驗收紀錄

日期：2026-11-05。

## 已通過

- `npm test`：15 項 Node 測試通過；覆蓋預設尺寸、非正方格、路線順序、共享路口、非法繪製、道路障礙衝突、尺寸裁切保護、JSON 往返、損壞／超大／非法輸入、英文 Prompt、安全外圍及 SVG 文字轉義。
- `npm run build`：TypeScript 檢查與 Vite production build 通過。
- 瀏覽器實際繪製八格路線、放置樹木、拒絕在道路放障礙、切換安全外圍與修改左側延伸。
- 英文 Prompt 複製顯示成功；未觀察到瀏覽器 console error。
- 實際下載 JSON／SVG／PNG／TXT；檢查 SVG 與 PNG 皆為 1470×840，JSON 為 ready，TXT 未混入中文。
- 下載的 JSON 透過選檔與確認操作重新匯入成功；重新整理還原草稿。
- 桌面、平板、手機預覽；要求的 viewport 1440／768／375，瀏覽器現有顯示縮放下實際 CSS viewport 為 1309／698／341。各自 document scrollWidth 等於 viewport，無整頁橫向溢出。畫布可獨立捲動。
- 實測發現 hidden file input 被通用 CSS 蓋過，已修正並重新檢查。

## 限制與待驗

- 未在實體 iOS／Android 裝置測試；三種寬度為桌面瀏覽器模擬。
- 剪貼簿被拒時的手動選取備援、本機儲存配額耗盡情境已實作，未透過實際權限／配額故障演練。
- 上限 64×64 與最大圖片場景未作跨瀏覽器效能測試；PNG 有明確記憶體保護上限。
- GitHub Pages 部署狀態另以 README／實際 Actions 結果為準。

## 畫面

- [桌面](qa/desktop.jpg)
- [手機](qa/mobile.jpg)
- [最終預覽](qa/preview.jpg)

測試地圖僅存在測試瀏覽器草稿，首次開啟網站仍為空白地圖。

## 使用者回饋修正驗收

- 畫布 grid 欄列使用 `minmax(0, 1fr)` 固定分配，障礙符號統一「障」。瀏覽器量測放置前／後皆為寬 29.890625、高 29.796875 CSS px，沒有文字撐高列的現象。
- 英文 Prompt 障礙統稱 obstacles，不帶 tree／rock／building 類型。
- 字母欄／數字列顯示，A1 對應 (0,0)；超過 Z 正確使用 AA 至 BL。
- 自訂風格描述「Soft ink texture, pale colors, 手繪線條」實測原文帶入 Prompt；數值與障礙描述仍由資料產生。
- [新版畫面](qa/latest.jpg)。
- 第一版 GitHub Pages 已成功部署，正式網址 HTTP 200；後續版本依 Actions 狀態判定。
