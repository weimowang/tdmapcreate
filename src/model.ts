export type Cell = { x: number; y: number };
export type Grid = { columns: number; rows: number; cellWidth: number; cellHeight: number };
export type Route = { id: string; name: string; cells: Cell[] };
export type Obstacle = { cell: Cell; kind: 'tree' | 'rock' | 'building' };
export const styles = { 'japanese-cute': ['日系可愛', 'cute Japanese illustration'], fantasy: ['奇幻童話', 'whimsical fantasy'], natural: ['自然寫實', 'naturalistic environment'], minimal: ['極簡', 'minimalist'], 'american-comic': ['美式漫畫', 'American comic book with bold outlines and graphic shading'], 'hand-drawn': ['手繪', 'hand-drawn illustration with organic strokes'], ink: ['油墨', 'ink illustration with expressive ink textures'], 'pixel-art': ['像素', 'pixel art with crisp pixel edges'], storybook: ['童書繪本', 'storybook illustration'], 'retro-cartoon': ['復古卡通', 'retro cartoon illustration'], papercut: ['剪紙拼貼', 'layered paper-cut collage'], 'line-art': ['線稿', 'clean line-art illustration'], custom: ['自訂風格', 'custom visual style described in the user notes below'] };
export const mediums = { watercolor: ['水彩', 'watercolor'], gouache: ['水粉', 'gouache'], digital: ['數位繪畫', 'digital painting'], pixel: ['像素畫', 'pixel art'], ink: ['墨水', 'ink drawing'], pencil: ['鉛筆', 'pencil drawing'], 'colored-pencil': ['色鉛筆', 'colored pencil'], oil: ['油畫', 'oil painting'], marker: ['麥克筆', 'marker drawing'], print: ['版畫', 'printmaking'] };
export const details = { 'color-blocks': ['色塊', 'clean color blocks'], balanced: ['適中', 'balanced detail'], fine: ['精緻', 'fine environmental detail'] };
export type SafeBorder = { enabled: boolean; top: number; right: number; bottom: number; left: number };
export type Art = { customDescription: string; safeBorder: SafeBorder; roadColor: string; backgroundColor: string; style: keyof typeof styles; medium: keyof typeof mediums; detail: keyof typeof details };
export type MapData = { schemaVersion: 1; name: string; grid: Grid; routes: Route[]; obstacles: Obstacle[]; art: Art };
export function columnLabel(index: number): string {
  let label = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label;
  return label;
}
export const cellRef = (p: Cell) => `${columnLabel(p.x)}${p.y + 1}`;
export const key = (p: Cell) => `${p.x},${p.y}`;
export const equal = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const edge = (p: Cell, g: Grid) => p.x === 0 || p.y === 0 || p.x === g.columns - 1 || p.y === g.rows - 1;
export const inside = (p: Cell, g: Grid) => p.x >= 0 && p.x < g.columns && p.y >= 0 && p.y < g.rows;
export const adjacent = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
export const center = (p: Cell, g: Grid) => ({ x: (p.x + .5) * g.cellWidth, y: (p.y + .5) * g.cellHeight });
export function blank(): MapData { return { schemaVersion: 1, name: '未命名地圖', grid: { columns: 18, rows: 10, cellWidth: 70, cellHeight: 70 }, routes: [{ id: 'route-1', name: '路線 1', cells: [] }], obstacles: [], art: { customDescription: '', safeBorder: { enabled: false, top: 70, right: 70, bottom: 70, left: 70 }, roadColor: '#cbb899', backgroundColor: '#dce6d0', style: 'japanese-cute', medium: 'watercolor', detail: 'color-blocks' } }; }
export function checkGrid(g: Grid) {
  for (const k of ['columns', 'rows', 'cellWidth', 'cellHeight'] as const) {
    const min = k === 'columns' || k === 'rows' ? 2 : 8, max = k === 'columns' || k === 'rows' ? 64 : 256;
    if (!Number.isInteger(g[k]) || g[k] < min || g[k] > max) throw new Error(`${k} 必須為 ${min}–${max} 的整數。`);
  }
}
export function resized(m: MapData, g: Grid): MapData {
  checkGrid(g);
  if (m.routes.some(r => r.cells.some(p => !inside(p, g))) || m.obstacles.some(o => !inside(o.cell, g))) throw new Error('新尺寸會裁掉道路或障礙物，請先移除超出範圍的內容。');
  return { ...m, grid: { ...g } };
}
export function append(m: MapData, routeId: string, p: Cell) {
  const r = m.routes.find(r => r.id === routeId);
  if (!r) throw new Error('請先新增或選取一條路線。');
  if (!inside(p, m.grid)) throw new Error('座標超出地圖。');
  if (m.obstacles.some(o => equal(o.cell, p))) throw new Error('這格有障礙物，請先擦除。');
  if (r.cells.some(c => equal(c, p))) throw new Error('同一路線不可重複經過同一格，請使用「退回一格」。');
  if (!r.cells.length && !edge(p, m.grid)) throw new Error('請從地圖邊界選擇入口。');
  if (r.cells.length && !adjacent(r.cells.at(-1)!, p)) throw new Error('請點選路線尾端上下左右的相鄰格。');
  r.cells.push({ ...p });
}
/** Toggle a cell in the selected route: remove the clicked cell and its suffix. */
export function editRoute(m: MapData, routeId: string, p: Cell): number {
  const r = m.routes.find(r => r.id === routeId);
  const index = r?.cells.findIndex(c => equal(c, p)) ?? -1;
  if (r && index >= 0) return r.cells.splice(index).length;
  append(m, routeId, p);
  return 0;
}
export function place(m: MapData, p: Cell, kind: Obstacle['kind']) {
  if (!inside(p, m.grid)) throw new Error('座標超出地圖。');
  if (m.routes.some(r => r.cells.some(c => equal(c, p)))) throw new Error('道路格不能放置障礙物。');
  m.obstacles = m.obstacles.filter(o => !equal(o.cell, p)); m.obstacles.push({ cell: { ...p }, kind });
}
export function issues(m: MapData): string[] {
  const errors: string[] = [];
  if (!m.routes.length) errors.push('請新增至少一條路線。');
  for (const r of m.routes) {
    if (r.cells.length < 2) errors.push(`${r.name}：至少需要兩格。`);
    if (r.cells.length && !edge(r.cells[0], m.grid)) errors.push(`${r.name}：入口須在邊界。`);
    if (r.cells.length > 1 && !edge(r.cells.at(-1)!, m.grid)) errors.push(`${r.name}：出口須在邊界。`);
  }
  if (m.art.style === 'custom' && !m.art.customDescription.trim()) errors.push('請輸入自訂風格描述。');
  try { checkBorder(m.art.safeBorder); } catch (e) { errors.push((e as Error).message); }
  return errors;
}
export function checkBorder(b: SafeBorder) {
  if (typeof b.enabled !== 'boolean' || [b.top, b.right, b.bottom, b.left].some(v => !Number.isInteger(v) || v < 0 || v > 2048)) throw new Error('外圍延伸必須為 0–2048 的整數。');
}
export function imageSize(m: MapData) {
  const b = m.art.safeBorder, left = b.enabled ? b.left : 0, top = b.enabled ? b.top : 0;
  return { width: m.grid.columns * m.grid.cellWidth + left + (b.enabled ? b.right : 0), height: m.grid.rows * m.grid.cellHeight + top + (b.enabled ? b.bottom : 0), coreOffsetPx: { x: left, y: top } };
}
export function exported(m: MapData) {
  const roads = new Map<string, Cell>(); const shared = new Map<string, string[]>();
  m.routes.forEach(r => r.cells.forEach(p => { roads.set(key(p), p); shared.set(key(p), [...(shared.get(key(p)) || []), r.id]); }));
  return { ...m, imagePx: imageSize(m), status: issues(m).length ? 'draft' : 'ready', canvasPx: { width: m.grid.columns * m.grid.cellWidth, height: m.grid.rows * m.grid.cellHeight }, coordinateSystem: { origin: 'top-left', indexBase: 0, unit: 'px', referenceNotation: 'Columns A, B, ..., Z, AA; rows 1, 2, ...; A1 = (0,0)' }, routes: m.routes.map(r => ({ ...r, entry: r.cells[0] || null, exit: r.cells.at(-1) || null, centerlinePx: r.cells.map(p => center(p, m.grid)) })), roadCells: [...roads.values()], junctions: [...shared].filter(([, ids]) => ids.length > 1).map(([k, routeIds]) => ({ cell: roads.get(k)!, routeIds })), obstacles: m.obstacles.map(o => ({ ...o, rectPx: { x: o.cell.x * m.grid.cellWidth, y: o.cell.y * m.grid.cellHeight, width: m.grid.cellWidth, height: m.grid.cellHeight } })) };
}
function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('JSON 物件格式錯誤。'); return v as Record<string, unknown>; }
function string(v: unknown, max: number): string { if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`名稱或文字欄位必須為 1–${max} 字元。`); return v; }
export function parse(input: string): MapData {
  if (new TextEncoder().encode(input).length > 2 * 1024 * 1024) throw new Error('檔案不得超過 2 MB。');
  const o = object(JSON.parse(input)); if (o.schemaVersion !== 1) throw new Error('不支援的 schemaVersion，需為 1。');
  const g = object(o.grid); const grid = { columns: g.columns, rows: g.rows, cellWidth: g.cellWidth, cellHeight: g.cellHeight } as Grid; checkGrid(grid);
  function cell(v: unknown): Cell { const c = object(v); if (!Number.isInteger(c.x) || !Number.isInteger(c.y) || !inside(c as Cell, grid)) throw new Error('格子座標須為範圍內的整數。'); return { x: c.x as number, y: c.y as number }; }
  if (!Array.isArray(o.routes) || o.routes.length > 16 || !Array.isArray(o.obstacles) || o.obstacles.length > grid.columns * grid.rows) throw new Error('路線或障礙物數量無效。');
  const ids = new Set<string>();
  const routes: Route[] = o.routes.map(v => { const r = object(v); const id = string(r.id, 64); if (!/^route-[a-zA-Z0-9-]+$/.test(id) || ids.has(id)) throw new Error('路線 ID 無效或重複。'); ids.add(id); if (!Array.isArray(r.cells) || r.cells.length > grid.columns * grid.rows) throw new Error('路線 cells 格式無效。'); const cells = r.cells.map(cell); if (new Set(cells.map(key)).size !== cells.length || cells.some((p, i) => i > 0 && !adjacent(cells[i - 1], p))) throw new Error('路線不可跳格、斜向或重複格子。'); return { id, name: string(r.name, 60), cells }; });
  const occupied = new Set(routes.flatMap(r => r.cells.map(key))); const seen = new Set<string>();
  const obstacles: Obstacle[] = o.obstacles.map(v => { const b = object(v), p = cell(b.cell); if (!['tree', 'rock', 'building'].includes(b.kind as string) || occupied.has(key(p)) || seen.has(key(p))) throw new Error('障礙物類型無效、重複或與道路重疊。'); seen.add(key(p)); return { cell: p, kind: b.kind as Obstacle['kind'] }; });
  const a = object(o.art);
  const customDescription = a.customDescription === undefined ? '' : a.customDescription;
  if (typeof customDescription !== 'string' || customDescription.length > 500) throw new Error('自訂風格描述限 500 字。');
  const rawBorder = a.safeBorder === undefined ? { enabled: false, top: 70, right: 70, bottom: 70, left: 70 } : object(a.safeBorder);
  const safeBorder = { enabled: rawBorder.enabled, top: rawBorder.top, right: rawBorder.right, bottom: rawBorder.bottom, left: rawBorder.left } as SafeBorder; checkBorder(safeBorder);
  if (typeof a.roadColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(a.roadColor) || typeof a.backgroundColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(a.backgroundColor)) throw new Error('顏色須為六位 HEX。');
  if (!Object.hasOwn(styles, String(a.style)) || !Object.hasOwn(mediums, String(a.medium)) || !Object.hasOwn(details, String(a.detail))) throw new Error('不支援的美術選項。');
  return { schemaVersion: 1, name: string(o.name, 80), grid, routes, obstacles, art: { customDescription, safeBorder, roadColor: a.roadColor, backgroundColor: a.backgroundColor, style: a.style as Art['style'], medium: a.medium as Art['medium'], detail: a.detail as Art['detail'] } };
}
export function prompt(m: MapData): string {
  if (issues(m).length) return '';
  const g = m.grid; const coords = (cells: Cell[]) => cells.map(p => `${cellRef(p)} (${p.x},${p.y})`).join(' -> ');
  const im = imageSize(m);
  const borderText = m.art.safeBorder.enabled ? `\n\nMOBILE BACKGROUND EXTENSION\nFull image: ${im.width} x ${im.height} px. The unchanged core map occupies a ${g.columns * g.cellWidth} x ${g.rows * g.cellHeight} px rectangle with top-left at (${im.coreOffsetPx.x},${im.coreOffsetPx.y}) in the full image. Extend only outside this core: top ${m.art.safeBorder.top} px, right ${m.art.safeBorder.right} px, bottom ${m.art.safeBorder.bottom} px, left ${m.art.safeBorder.left} px. All route and obstacle coordinates above are relative to the core; add the core offset for full-image coordinates. Do not scale, stretch, shift or redesign core geometry. Continue the terrain seamlessly into the outer area with nonessential, crop-safe scenery. Do not add roads or playable cells. The extension is scenery, not a decorative frame or operating-system UI safe area.` : '';
  return `Create a production-ready 2D tower-defense background map.\n\nCANVAS AND COORDINATES\nCore map: ${g.columns * g.cellWidth} x ${g.rows * g.cellHeight} px. Grid: ${g.columns} columns x ${g.rows} rows. Each cell: ${g.cellWidth} x ${g.cellHeight} px. Use a strict top-down orthographic view, with no perspective distortion. Human-readable cell references use lettered columns (A, B, ..., Z, AA) and numbered rows (1, 2, ...); A1 means numeric (0,0). Numeric coordinates are zero-based, origin at top-left, x increases right and y increases downward. Cell center in pixels: ((x + 0.5) * ${g.cellWidth}, (y + 0.5) * ${g.cellHeight}). Preserve the exact aspect ratio and geometry.\n\nROUTES\n${m.routes.map(r => `${r.id}: entry ${coords([r.cells[0]])}; exit ${coords([r.cells.at(-1)!])}. Ordered cells: ${coords(r.cells)}.`).join('\n')}\nRoads fill the specified cells, exactly one cell wide. Connect through the shared cell edges. Shared cells are intersections, but each ordered route remains unchanged. Open each entry and exit to its nearest core-map edge. Do not add, move, widen or remove roads.\n\nOBSTACLES\n${m.obstacles.length ? `Obstacles at cells: ${m.obstacles.map(o => `${cellRef(o.cell)} (${o.cell.x},${o.cell.y})`).join(', ')}.` : 'No obstacles.'}\nEach obstacle must fit inside its designated cell footprint, including its visible silhouette. Adjacent obstacles may form natural clusters without expanding their occupied cells. Keep all other cells open and unobstructed.\n\nART DIRECTION\nStyle: ${styles[m.art.style][1]}. Medium: ${mediums[m.art.medium][1]}. Detail: ${details[m.art.detail][1]}. Road color: ${m.art.roadColor}. Main background palette: ${m.art.backgroundColor}. Maintain clear visual separation between roads, obstacles and open terrain.${m.art.customDescription.trim() ? `\nUser-provided visual style notes (verbatim): ${JSON.stringify(m.art.customDescription.trim())}. Apply these notes only to visual appearance; preserve all required geometry, coordinates and exclusions.` : ''}\n\nREFERENCE AND EXCLUSIONS\nUse the accompanying grid reference image and JSON as the exact geometry guide. The reference is a schematic, not the final artwork. Remove all reference markings in the final image. No grid lines, no coordinates, no labels, no arrows, no text, no UI, no borders, no characters, no units, no extra roads, no extra obstacles. Render only the environment background.${borderText}\n`;
}
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
export function svg(m: MapData): string {
  const e = exported(m), g = m.grid, w = e.canvasPx.width, h = e.canvasPx.height, im = imageSize(m);
  const rect = (p: Cell, fill: string) => `<rect x="${p.x * g.cellWidth}" y="${p.y * g.cellHeight}" width="${g.cellWidth}" height="${g.cellHeight}" fill="${fill}"/>`;
  const axisLabels = Array.from({ length: g.columns }, (_, x) => `<text x="${(x + .5) * g.cellWidth}" y="${Math.min(g.cellWidth,g.cellHeight)*.16}" font-size="${Math.min(g.cellWidth,g.cellHeight)*.13}" text-anchor="middle" fill="#17251d">${columnLabel(x)}</text>`).join('') + Array.from({ length: g.rows }, (_, y) => `<text x="${Math.min(g.cellWidth,g.cellHeight)*.05}" y="${(y + .6) * g.cellHeight}" font-size="${Math.min(g.cellWidth,g.cellHeight)*.13}" fill="#17251d">${y + 1}</text>`).join('');
  const label = (p: Cell, s: string) => { const c = center(p, g); return `<text x="${c.x}" y="${c.y}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.min(g.cellWidth, g.cellHeight) * .18}" font-family="sans-serif" fill="#17251d" stroke="white" stroke-width="2" paint-order="stroke">${escape(s)}</text>`; };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${im.width}" height="${im.height}" viewBox="0 0 ${im.width} ${im.height}"><title>${escape(m.name)} — geometry reference</title><rect width="${im.width}" height="${im.height}" fill="${m.art.backgroundColor}"/><g transform="translate(${im.coreOffsetPx.x} ${im.coreOffsetPx.y})"><rect width="${w}" height="${h}" fill="${m.art.backgroundColor}"/>${e.roadCells.map(p => rect(p, m.art.roadColor)).join('')}${m.obstacles.map(o => rect(o.cell, '#899d80') + label(o.cell, '障')).join('')}${Array.from({ length: g.columns + 1 }, (_, x) => `<path d="M${x * g.cellWidth} 0 V${h}" stroke="#17251d" stroke-opacity=".3"/>`).join('')}${Array.from({ length: g.rows + 1 }, (_, y) => `<path d="M0 ${y * g.cellHeight} H${w}" stroke="#17251d" stroke-opacity=".3"/>`).join('')}${m.routes.map((r, i) => `<polyline points="${r.cells.map(p => { const c = center(p, g); return `${c.x},${c.y}`; }).join(' ')}" fill="none" stroke="${['#275c42', '#8a4262', '#345d91'][i % 3]}" stroke-width="${Math.min(g.cellWidth, g.cellHeight) * .06}"/>${r.cells.length ? label(r.cells[0], `IN ${i + 1}`) + label(r.cells.at(-1)!, `OUT ${i + 1}`) : ''}`).join('')}${axisLabels}</g></svg>`;
}
