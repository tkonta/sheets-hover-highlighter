// ポインタ位置の canvas を読み、行と列の帯の位置を求める

import { config } from "./config";
import { type Bounds, scanBounds } from "./gridline";
import type { Highlight, Rect } from "./overlay";

/** グリッドを描いていると思われる、ある程度大きな canvas */
const gridCanvases = (): HTMLCanvasElement[] =>
  Array.from(document.querySelectorAll("canvas")).filter((c) => {
    const r = c.getBoundingClientRect();
    return (
      r.width > 150 && r.height > 80 && !c.closest(".row-header-wrapper, .column-header-wrapper, .col-header-wrapper")
    );
  });

const canvasAt = (canvases: HTMLCanvasElement[], x: number, y: number): HTMLCanvasElement | null => {
  // DOM で後ろにあるもの (上に重なっているもの) を優先する
  for (let i = canvases.length - 1; i >= 0; i--) {
    const r = canvases[i].getBoundingClientRect();
    if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return canvases[i];
  }
  return null;
};

const ctxCache = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D | null>();
const getCtx = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
  const cached = ctxCache.get(canvas);
  if (cached !== undefined) return cached;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    // 既に 2d で使われていれば同じコンテキストが返る。webgl 等で使われていれば null
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null;
  }
  ctxCache.set(canvas, ctx);
  return ctx;
};

/** canvas 上の (px, py) から direction 方向に走査した境界 (canvas の座標)。読み出せなければ null */
const findBounds = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  px: number,
  py: number,
  scale: number,
  direction: "x" | "y",
): Bounds | null => {
  const span = Math.max(2, Math.round(config.spanCss * scale));
  const maxScan = Math.round(config.maxScanCss * scale);
  const [pos, cross, len, crossLen] =
    direction === "x" ? [px, py, canvas.width, canvas.height] : [py, px, canvas.height, canvas.width];

  const s0 = Math.max(0, pos - maxScan);
  const s1 = Math.min(len, pos + maxScan + 1);
  const c0 = Math.max(0, cross - span);
  const c1 = Math.min(crossLen, cross + span + 1);
  if (s1 <= s0 || c1 <= c0) return [null, null];

  let image: ImageData;
  try {
    image = direction === "x" ? ctx.getImageData(s0, c0, s1 - s0, c1 - c0) : ctx.getImageData(c0, s0, c1 - c0, s1 - s0);
  } catch {
    return null; // 読み出し不可 (tainted canvas など)
  }

  const [lo, hi] = scanBounds(
    image,
    pos - s0,
    direction,
    { lumDiff: config.lumDiff, minRatio: config.minRatio, offset: Math.max(2, Math.round(1.5 * scale)) },
    { start: s0 === 0, end: s1 === len },
  );
  return [lo == null ? null : lo + s0, hi == null ? null : hi + s0];
};

// ヘッダー領域と帯の重なる部分だけを塗る。
const headerRect = (selector: string, band: Rect, direction: "row" | "col"): Rect | null => {
  for (const element of document.querySelectorAll(selector)) {
    const header = element.getBoundingClientRect();
    const left = direction === "row" ? header.left : Math.max(header.left, band.left);
    const top = direction === "col" ? header.top : Math.max(header.top, band.top);
    const right = direction === "row" ? header.right : Math.min(header.right, band.left + band.width);
    const bottom = direction === "col" ? header.bottom : Math.min(header.bottom, band.top + band.height);
    if (right > left && bottom > top) return { left, top, width: right - left, height: bottom - top };
  }
  return null;
};

/** ポインタ (CSS px) の下のセルについて、行と列の帯の矩形を返す。グリッド外なら null */
export const locate = (x: number, y: number): Highlight | null => {
  const canvases = gridCanvases();
  const canvas = canvasAt(canvases, x, y);
  if (!canvas) return null;

  // 帯を伸ばす範囲 = 表示中のグリッド canvas 全体
  let L = Number.POSITIVE_INFINITY;
  let T = Number.POSITIVE_INFINITY;
  let R = Number.NEGATIVE_INFINITY;
  let B = Number.NEGATIVE_INFINITY;
  for (const c of canvases) {
    const r = c.getBoundingClientRect();
    L = Math.min(L, r.left);
    T = Math.min(T, r.top);
    R = Math.max(R, r.right);
    B = Math.max(B, r.bottom);
  }

  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  const px = Math.floor((x - rect.left) * sx);
  const py = Math.floor((y - rect.top) * sy);

  const half = config.fallbackHalfCss;
  let colL = x - half;
  let colR = x + half;
  let rowT = y - half;
  let rowB = y + half;

  const ctx = getCtx(canvas);
  if (ctx) {
    const v = findBounds(ctx, canvas, px, py, sx, "x");
    const h = findBounds(ctx, canvas, px, py, sy, "y");
    if (v?.[0] != null) colL = rect.left + v[0] / sx;
    if (v?.[1] != null) colR = rect.left + v[1] / sx;
    if (h?.[0] != null) rowT = rect.top + h[0] / sy;
    if (h?.[1] != null) rowB = rect.top + h[1] / sy;
  }

  const row = { left: L, top: rowT, width: R - L, height: rowB - rowT };
  const col = { left: colL, top: T, width: colR - colL, height: B - T };
  return {
    row,
    col,
    rowHeader: headerRect(".row-header-wrapper", row, "row"),
    colHeader: headerRect(".column-header-wrapper, .col-header-wrapper", col, "col"),
  };
};
