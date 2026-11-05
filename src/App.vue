<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { editRoute, dragRoute, blank, clearedMap, cellRef, columnLabel, center, details, equal, exported, imageSize, issues, key, parse, place, prompt, resized, styles, svg, type Cell, type Obstacle } from './model';
const storageKey = 'tdmapcreate.draft.v1';
const map = ref(blank());
const notice = ref('從地圖邊界點選第一格，開始設計你的路線。');
const saved = ref('尚未修改');
try { const raw = localStorage.getItem(storageKey); if (raw) { map.value = parse(raw); saved.value = '已還原本機草稿'; } } catch { notice.value = '本機草稿無法還原，已開啟空白地圖。'; }
const draftGrid = ref({ ...map.value.grid });
const selected = ref(map.value.routes[0]?.id || '');
const route = computed(() => map.value.routes.find(r => r.id === selected.value));
const tool = ref('route');
const kind = ref<Obstacle['kind']>('tree');
const showGrid = ref(true), zoom = ref(0.7), focusCell = ref(0);
const canvasScroll = ref<HTMLElement>();
function fitMap() { if (canvasScroll.value) zoom.value = Math.max(0.05, Math.min(1, (canvasScroll.value.clientWidth - 60) / width.value, 500 / height.value)); }
onMounted(fitMap);
const clearDialog = ref<HTMLDialogElement>();
function openClearDialog() { endStroke(); clearDialog.value?.showModal(); }
const output = ref<HTMLElement>(), promptBox = ref<HTMLTextAreaElement>(), importer = ref<HTMLInputElement>();
const canClear = computed(() => map.value.obstacles.length > 0 || map.value.routes.some(r => r.cells.length > 0) || map.value.routes.length !== 1 || Object.entries(blank().art).some(([k,v]) => JSON.stringify(map.value.art[k as keyof typeof map.value.art]) !== JSON.stringify(v)));
const errors = computed(() => issues(map.value));
const data = computed(() => exported(map.value));
const json = computed(() => JSON.stringify(data.value, null, 2));
const english = computed(() => prompt(map.value));
const image = computed(() => imageSize(map.value));
const width = computed(() => map.value.grid.columns * map.value.grid.cellWidth);
const height = computed(() => map.value.grid.rows * map.value.grid.cellHeight);
const roadKeys = computed(() => new Set(data.value.roadCells.map(key)));
const obstacles = computed(() => new Map(map.value.obstacles.map(o => [key(o.cell), o.kind])));
const cells = computed(() => Array.from({ length: map.value.grid.columns * map.value.grid.rows }, (_, i) => ({ x: i % map.value.grid.columns, y: Math.floor(i / map.value.grid.columns) })));
const selectedKeys = computed(() => new Set(route.value?.cells.map(key) || []));
const hint = computed(() => tool.value === 'route' ? '按住滑鼠左鍵沿格線拖曳可連續畫路線；單點已有格子可刪除後段。' : tool.value === 'obstacle' ? '點選空地放置障礙物；道路格會受到保護。' : '點選障礙物即可擦除；道路請切換「畫路線」，再點要刪除的格子。');
const symbols = { tree: '樹', rock: '石', building: '屋' };
const palette = ['#456b59', '#966c7b', '#627d98', '#9b773c'];
watch(map, () => { try { localStorage.setItem(storageKey, JSON.stringify(map.value)); saved.value = '已儲存於此瀏覽器'; } catch { saved.value = '本機保存不可用，請下載 JSON'; } }, { deep: true });
function act(fn: () => void, message?: string) { try { fn(); if (message) notice.value = message; } catch (e) { notice.value = (e as Error).message; } }
function paint(p: Cell) {
  act(() => { if (tool.value === 'route') { const removed = editRoute(map.value, selected.value, p); if (removed) { notice.value = `已從 ${cellRef(p)} 刪除目前路線的 ${removed} 格（含點選格及後續路段）。`; return; } } else if (tool.value === 'obstacle') place(map.value, p, kind.value); else map.value.obstacles = map.value.obstacles.filter(o => !equal(o.cell, p)); notice.value = `已更新格子 ${cellRef(p)}（${p.x}, ${p.y}）。`; });
}
type MouseStroke = { pointerId: number; start: Cell; routeId: string; moved: boolean; started: boolean; element: HTMLElement };
let stroke: MouseStroke | null = null;
let suppressRouteClick = false;
function endStroke() { const previous = stroke; stroke = null; if (previous?.element.hasPointerCapture(previous.pointerId)) previous.element.releasePointerCapture(previous.pointerId); }
onMounted(() => window.addEventListener('blur', endStroke));
onBeforeUnmount(() => { window.removeEventListener('blur', endStroke); endStroke(); });
watch([selected, tool], endStroke);
function mouseStart(event: PointerEvent, p: Cell) {
  suppressRouteClick = false;
  if (event.pointerType !== 'mouse' || event.button !== 0 || tool.value !== 'route') return;
  event.preventDefault(); suppressRouteClick = true;
  endStroke(); const element = event.currentTarget as HTMLElement; element.focus(); element.setPointerCapture(event.pointerId);
  stroke = { pointerId: event.pointerId, start: { ...p }, routeId: selected.value, moved: false, started: false, element };
}
function pointerCell(event: PointerEvent): Cell | null {
  const rect = stroke?.element.closest('.map')?.getBoundingClientRect(); if (!rect) return null;
  const x = Math.floor((event.clientX - rect.left) / rect.width * map.value.grid.columns);
  const y = Math.floor((event.clientY - rect.top) / rect.height * map.value.grid.rows);
  return x >= 0 && x < map.value.grid.columns && y >= 0 && y < map.value.grid.rows ? { x, y } : null;
}
function mouseMove(event: PointerEvent, finalSample = false) {
  if (!stroke || event.pointerId !== stroke.pointerId) return;
  if (!finalSample && !(event.buttons & 1)) { endStroke(); return; }
  const p = pointerCell(event); if (!p || (!stroke.moved && equal(p, stroke.start))) return;
  stroke.moved = true;
  act(() => {
    if (!stroke) return;
    if (!stroke.started) {
      const r = map.value.routes.find(r => r.id === stroke!.routeId);
      if (r?.cells.some(c => equal(c, stroke!.start)) && !equal(r.cells.at(-1)!, stroke.start)) throw new Error('請從目前路線尾端拖曳續畫；要修改中段，先單點該格擦除後段。');
      dragRoute(map.value, stroke.routeId, stroke.start); stroke.started = true;
    }
    dragRoute(map.value, stroke.routeId, p); notice.value = `正在繪製至 ${cellRef(p)}；放開滑鼠即可結束。`;
  });
}
function mouseEnd(event: PointerEvent) {
  if (!stroke || event.pointerId !== stroke.pointerId) return;
  const current = stroke, p = pointerCell(event);
  if (p && !equal(p, current.start)) mouseMove(event, true);
  endStroke();
  if (current.moved && notice.value.startsWith('正在繪製')) notice.value = '拖曳繪製完成。可從尾端繼續，或單點已畫格子擦除後段。';
  if (!current.moved && p && equal(p, current.start)) paint(p);
}
function cellClick(event: MouseEvent, p: Cell) {
  // Mouse route gestures are handled on pointerup; keyboard and touch retain click behavior.
  if (suppressRouteClick && event.detail !== 0) { suppressRouteClick = false; return; }
  suppressRouteClick = false; paint(p);
}
function applySize() { act(() => { map.value = resized(map.value, draftGrid.value); focusCell.value = 0; nextTick(fitMap); }, '尺寸已套用，地圖座標維持不變。'); }
function addRoute() { if (map.value.routes.length >= 16) { notice.value = '最多支援 16 條路線。'; return; } let n = 1; while (map.value.routes.some(r => r.id === `route-${n}`)) n++; const r = { id: `route-${n}`, name: `路線 ${n}`, cells: [] }; map.value.routes.push(r); selected.value = r.id; tool.value = 'route'; }
function removeRoute() { if (!route.value || !confirm(`刪除「${route.value.name}」整條路線？`)) return; map.value.routes = map.value.routes.filter(r => r.id !== selected.value); selected.value = map.value.routes[0]?.id || ''; }
function clearMap() {
  clearDialog.value?.close();
  endStroke(); map.value = clearedMap(map.value); selected.value = 'route-1'; tool.value = 'route'; focusCell.value = 0;
  notice.value = '已清空路線與障礙物，並還原全部美術設定；名稱與尺寸已保留。';
}
function newMap() { if (!confirm('建立新地圖會替換目前草稿。需要保留請先下載 JSON。')) return; map.value = blank(); draftGrid.value = { ...map.value.grid }; selected.value = map.value.routes[0].id; focusCell.value = 0; notice.value = '已建立空白地圖。'; }
async function importFile(event: Event) {
  const el = event.target as HTMLInputElement, file = el.files?.[0];
  if (!file) return;
  try { if (file.size > 2 * 1024 * 1024) throw new Error('檔案不得超過 2 MB。'); const next = parse(await file.text()); if (confirm('匯入會替換目前草稿，確定繼續？')) { map.value = next; draftGrid.value = { ...next.grid }; selected.value = next.routes[0]?.id || ''; focusCell.value = 0; notice.value = 'JSON 已匯入。'; } } catch (e) { notice.value = `匯入失敗：${(e as Error).message}`; } finally { el.value = ''; }
}
function download(content: BlobPart, type: string, extension: string) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = `tdmap-${errors.value.length ? 'draft' : 'map'}.${extension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function copyPrompt() { try { await navigator.clipboard.writeText(english.value); notice.value = '英文 Prompt 已複製。'; } catch { promptBox.value?.focus(); promptBox.value?.select(); notice.value = '請按 Ctrl+C 或 ⌘C 手動複製已選取的英文 Prompt。'; } }
function generate() { if (errors.value.length) { notice.value = '請先修正右側設計檢查。草稿 JSON 仍可下載。'; return; } output.value?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); notice.value = '已產生最新資料；修改地圖後輸出會自動同步。'; }
const pngBusy = ref(false);
async function downloadPng() {
  if (pngBusy.value || errors.value.length) return;
  // Bound browser canvas allocation; SVG retains full resolution at any supported size.
  if (image.value.width * image.value.height > 16_000_000 || Math.max(image.value.width, image.value.height) > 8192) { notice.value = '此圖片超過 PNG 安全上限（1,600 萬像素／單邊 8192 px），請下載完整 SVG。'; return; }
  pngBusy.value = true;
  const url = URL.createObjectURL(new Blob([svg(map.value)], { type: 'image/svg+xml' }));
  try { const img = new Image(); img.src = url; await img.decode(); const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('瀏覽器無法建立畫布'); ctx.drawImage(img, 0, 0); const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG 轉換失敗')), 'image/png')); download(blob, 'image/png', 'png'); notice.value = 'PNG 參考圖已下載。'; } catch (e) { notice.value = (e as Error).message; } finally { URL.revokeObjectURL(url); pngBusy.value = false; }
}
async function gridKey(event: KeyboardEvent, i: number) { let next = i; const cols = map.value.grid.columns; if (event.key === 'ArrowRight' && i % cols < cols - 1) next++; else if (event.key === 'ArrowLeft' && i % cols > 0) next--; else if (event.key === 'ArrowDown' && i + cols < cells.value.length) next += cols; else if (event.key === 'ArrowUp' && i >= cols) next -= cols; else return; event.preventDefault(); focusCell.value = next; await nextTick(); document.getElementById(`cell-${next}`)?.focus(); }
function cellLabel(p: Cell) { const k = key(p); return `格子 ${p.x}, ${p.y}，${obstacles.value.has(k) ? symbols[obstacles.value.get(k)!] : roadKeys.value.has(k) ? '道路' : '空地'}`; }
</script>

<template>
  <div class="shell">
    <dialog ref="clearDialog" class="clear-dialog" aria-labelledby="clear-title">
      <h2 id="clear-title">清空地圖與美術設定？</h2>
      <p>所有路線、障礙物、配色、風格、細節與安全外圍都會清除或還原。地圖名稱與尺寸會保留。</p>
      <div><button autofocus @click="clearDialog?.close()">取消</button><button class="primary" @click="clearMap">確認清空</button></div>
    </dialog>
    <header class="header">
      <div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div><h1>地圖製作室 <span>TD MAP CREATE</span></h1><p>從一格開始，畫出你的世界。</p></div></div>
      <div class="header-actions"><span class="save-state">{{ saved }}</span><button @click="importer?.click()">匯入 JSON</button><button @click="newMap">新建地圖</button><input ref="importer" type="file" accept=".json,application/json" hidden @change="importFile"></div>
    </header>
    <div class="intro"><p><span class="eyebrow">MAP WORKSPACE</span>設計地圖，再交給 AI 畫出風景。</p><span>01 編輯格線 <b>／</b> 02 設定美術 <b>／</b> 03 匯出使用</span></div>
    <div class="workspace">
      <aside class="panel settings">
        <section><h2><small>01</small> 地圖設定</h2><label>地圖名稱<input v-model="map.name" maxlength="80" @blur="map.name = map.name.trim() || '未命名地圖'"></label><div class="field-pair"><label>欄數<input v-model.number="draftGrid.columns" type="number" min="2" max="64"></label><label>列數<input v-model.number="draftGrid.rows" type="number" min="2" max="64"></label><label>格子寬 · px<input v-model.number="draftGrid.cellWidth" type="number" min="8" max="256"></label><label>格子高 · px<input v-model.number="draftGrid.cellHeight" type="number" min="8" max="256"></label></div><button class="wide" @click="applySize">套用尺寸</button></section>
        <section><h2><small>02</small> 繪圖工具</h2><div class="tools"><button v-for="t in [{id:'route',text:'畫路線'},{id:'obstacle',text:'放障礙'},{id:'erase',text:'擦除'}]" :key="t.id" :class="{active:tool===t.id}" :aria-pressed="tool===t.id" @click="tool=t.id">{{ t.text }}</button></div><p class="helper">{{ hint }}</p>
          <label v-if="tool==='obstacle'">障礙物類型<select v-model="kind"><option value="tree">樹木</option><option value="rock">岩石</option><option value="building">建物</option></select></label>
          <label>目前路線<select v-model="selected"><option v-if="!map.routes.length" value="">請新增路線</option><option v-for="(r,i) in map.routes" :key="r.id" :value="r.id">{{ i+1 }} · {{ r.name }}（{{ r.cells.length }} 格）</option></select></label>
          <label v-if="route">路線名稱<input v-model="route.name" maxlength="60" @blur="route.name = route.name.trim() || '未命名路線'"></label>
          <div class="field-pair buttons"><button @click="addRoute">新增路線</button><button :disabled="!route?.cells.length" @click="route?.cells.pop()">退回一格</button><button :disabled="!route?.cells.length" @click="route?.cells.reverse()">反轉方向</button><button class="quiet-danger" :disabled="!route" @click="removeRoute">刪除路線</button></div>
        </section>
      </aside>
      <main class="canvas-panel">
        <div class="canvas-heading"><div><h2>{{ map.name || '未命名地圖' }}</h2><p>{{ map.grid.columns }} × {{ map.grid.rows }} 格 <span>·</span> {{ width }} × {{ height }} px</p></div><div class="canvas-actions"><label class="check"><input v-model="showGrid" type="checkbox">格線</label><button :disabled="!canClear" @click="openClearDialog">清空</button></div></div>
        <div ref="canvasScroll" class="canvas-scroll"><div class="map-wrap" :style="{width:`${width*zoom}px`,height:`${height*zoom}px`}"><div class="axis-x" aria-hidden="true" :style="{gridTemplateColumns:`repeat(${map.grid.columns},minmax(0,1fr))`}"><span v-for="x in map.grid.columns" :key="x">{{ columnLabel(x-1) }}</span></div><div class="axis-y" aria-hidden="true" :style="{gridTemplateRows:`repeat(${map.grid.rows},minmax(0,1fr))`}"><span v-for="y in map.grid.rows" :key="y">{{ y }}</span></div><div class="map" :class="{ 'no-grid':!showGrid }" :style="{width:`${width*zoom}px`,height:`${height*zoom}px`,background:map.art.backgroundColor,gridTemplateColumns:`repeat(${map.grid.columns},minmax(0,1fr))`,gridTemplateRows:`repeat(${map.grid.rows},minmax(0,1fr))`}">
          <button v-for="(p,i) in cells" :id="`cell-${i}`" :key="key(p)" class="cell" :class="{road:roadKeys.has(key(p)),selected:selectedKeys.has(key(p)),obstacle:obstacles.has(key(p))}" :style="{background:roadKeys.has(key(p)) ? map.art.roadColor : undefined}" :aria-label="cellLabel(p)" :tabindex="i===focusCell?0:-1" @focus="focusCell=i" @keydown="gridKey($event,i)" @pointerdown="mouseStart($event,p)" @pointermove="mouseMove" @pointerup="mouseEnd" @pointercancel="endStroke" @lostpointercapture="endStroke" @click="cellClick($event,p)"><span v-if="obstacles.has(key(p))" class="obstacle-symbol">障</span></button>
          <svg class="route-overlay" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true"><defs><marker v-for="(color,i) in palette" :id="`arrow-${i}`" :key="color" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" :fill="color"/></marker></defs><g v-for="(r,i) in map.routes" :key="r.id" :opacity="r.id===selected?1:0.55"><polyline :points="r.cells.map(p=>{const c=center(p,map.grid);return `${c.x},${c.y}`}).join(' ')" fill="none" :stroke="palette[i%4]" :stroke-width="Math.min(map.grid.cellWidth,map.grid.cellHeight)*.05" :marker-mid="`url(#arrow-${i%4})`"/><template v-if="r.cells.length"><text v-for="(p,j) in [r.cells[0],r.cells.at(-1)!]" :key="j" :x="center(p,map.grid).x" :y="center(p,map.grid).y" text-anchor="middle" dominant-baseline="middle" :font-size="Math.min(map.grid.cellWidth,map.grid.cellHeight)*.18" font-weight="700" :fill="palette[i%4]" stroke="#fffdf8" stroke-width="3" paint-order="stroke">{{ j===0?'IN':'OUT' }}{{ i+1 }}</text></template></g></svg>
        </div></div></div>
        <div class="canvas-footer"><div class="legend"><span><i class="legend-road"></i>道路</span><span><i class="legend-obstacle"></i>障礙</span><span>IN 入口 · OUT 出口</span></div><button class="fit-button" @click="fitMap">符合視窗</button><label class="zoom">縮放 <input v-model.number="zoom" type="range" min="0.05" max="1.5" step="0.01">{{ Math.round(zoom*100) }}%</label></div>
        <p class="canvas-note">橫軸 A、B、C…，縱軸 1、2、3…；A1 = (0, 0)。選取格子後，可用方向鍵移動、Enter 繪製。<br>畫路線時，可按住滑鼠左鍵沿上下左右拖曳連續繪製。再次單點已畫格子，即可擦除該格及後續整段路線。</p>
        <div class="stats"><div><strong>{{ data.roadCells.length }}</strong><span>道路格</span></div><div><strong>{{ map.obstacles.length }}</strong><span>障礙格</span></div><div><strong>{{ cells.length-data.roadCells.length-map.obstacles.length }}</strong><span>開放格</span></div><div><strong>{{ data.junctions.length }}</strong><span>共享路口</span></div></div>
      </main>
      <aside class="panel art"><section><h2><small>03</small> 美術設定</h2><label class="color-field"><span><input v-model="map.art.roadColorSpecified" type="checkbox" aria-label="指定道路顏色"> 道路顏色</span><div><input v-model="map.art.roadColor" type="color" aria-label="道路色彩選擇器" @input="map.art.roadColorSpecified=true"><code>{{ map.art.roadColor }}</code></div></label><label class="color-field"><span><input v-model="map.art.backgroundColorSpecified" type="checkbox" aria-label="指定背景主色"> 背景主色</span><div><input v-model="map.art.backgroundColor" type="color" aria-label="背景色彩選擇器" @input="map.art.backgroundColorSpecified=true"><code>{{ map.art.backgroundColor }}</code></div></label><p class="helper">美術設定皆可留白；未指定時只生成地圖位置描述。勾選顏色才會帶入 Prompt。</p><label>美術風格<select v-model="map.art.style"><option value="">不指定</option><option v-for="(v,k) in styles" :key="k" :value="k">{{ v[0] }}</option></select></label><label>自訂風格描述 <span class="optional">選填，最多 1000 字</span><textarea v-model="map.art.customDescription" class="custom-style" maxlength="1000" rows="3" placeholder="例如：soft pastel colors, hand-drawn outlines"></textarea></label><p class="helper">原文帶入 Prompt，建議輸入英文；中文不會自動翻譯。可搭配既有風格，或選「自訂風格」。</p><label>細節<select v-model="map.art.detail"><option value="">不指定</option><option v-for="(v,k) in details" :key="k" :value="k">{{ v[0] }}</option></select></label><label v-if="map.art.detail==='custom'">自訂細節描述<textarea v-model="map.art.customDetail" class="custom-style" rows="3" maxlength="1000" placeholder="例如：simple shapes, minimal ground texture"></textarea></label><p v-if="map.art.detail==='custom'" class="helper">選填，最多 1000 字，原文帶入 Prompt。</p></section>
        <section><label class="check"><input v-model="map.art.safeBorder.enabled" type="checkbox">手機安全外圍</label><p class="helper">在核心地圖外延伸背景，保留原本格線與路線位置。</p><div v-if="map.art.safeBorder.enabled" class="field-pair"><label v-for="side in (['top','right','bottom','left'] as const)" :key="side">{{ {top:'上',right:'右',bottom:'下',left:'左'}[side] }} · px<input v-model.number="map.art.safeBorder[side]" type="number" min="0" max="2048"></label></div><p class="size-summary">完整圖 {{ image.width }} × {{ image.height }} px<span v-if="map.art.safeBorder.enabled">核心起點 ({{ image.coreOffsetPx.x }}, {{ image.coreOffsetPx.y }})</span></p></section>
        <section class="validation"><h3>設計檢查</h3><ul v-if="errors.length"><li v-for="e in errors" :key="e">{{ e }}</li></ul><p v-else class="valid">檢查通過，可以匯出。</p><button class="primary wide" @click="generate">產生地圖資料與 Prompt ↓</button></section>
      </aside>
    </div>
    <p class="notice" role="status" aria-live="polite">{{ notice }}</p>
    <section ref="output" class="output"><div class="output-heading"><div><span class="eyebrow">READY FOR YOUR NEXT STEP</span><h2>把設計帶到下一步</h2></div><p>下載參考圖與 JSON，再把英文 Prompt 交給 AI。<br>AI 產圖後，請核對路線及障礙是否與格線一致。</p></div><div class="output-grid"><div class="export-card"><div class="card-heading"><h3>地圖資料 <small>JSON</small></h3><button @click="download(json,'application/json','json')">{{ errors.length?'下載草稿':'下載 JSON' }}</button></div><pre tabindex="0" aria-label="地圖 JSON 預覽">{{ json }}</pre><div class="reference"><div><h3>格線參考圖</h3><p>保留精確幾何，作為 AI 產圖參考。</p></div><div class="download-buttons"><button :disabled="!!errors.length" @click="download(svg(map),'image/svg+xml','svg')">下載 SVG</button><button :disabled="!!errors.length || pngBusy" @click="downloadPng">{{ pngBusy?'轉換中…':'下載 PNG' }}</button></div></div></div><div class="export-card"><div class="card-heading"><h3>背景圖提示詞 <small>ENGLISH</small></h3><button class="primary" :disabled="!english" @click="copyPrompt">複製 Prompt</button></div><textarea ref="promptBox" :value="english" readonly aria-label="英文背景圖 Prompt" placeholder="完成至少一條從邊界入口到邊界出口的路線，即可產生英文 Prompt。"></textarea><div class="prompt-bottom"><span>依目前地圖與美術設定即時更新。</span><button :disabled="!english" @click="download(english,'text/plain;charset=utf-8','txt')">下載 TXT</button></div></div></div></section>
    <footer>TD MAP CREATE <span>在瀏覽器裡設計 · 資料保存在你的裝置</span><a href="https://github.com/weimowang/tdmapcreate" target="_blank" rel="noopener noreferrer">GitHub ↗</a></footer>
  </div>
</template>
