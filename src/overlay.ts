// ポインタイベントを奪わない固定配置の帯
import type { Appearance } from "./settings";

export type Rect = { left: number; top: number; width: number; height: number };

export type Highlight = {
  row: Rect;
  col: Rect;
  rowHeader: Rect | null;
  colHeader: Rect | null;
};

const createBand = () => {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483646",
    display: "none",
  });
  document.documentElement.appendChild(el);
  return el;
};

const place = (el: HTMLDivElement, rect: Rect | null, strength: number, header = false) => {
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    el.style.display = "none";
    return;
  }

  Object.assign(el.style, {
    display: "block",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    background: `rgba(255, 196, 0, ${strength * (header ? 0.007 : 0.0044)})`,
    boxShadow: `inset 0 0 0 1px rgba(230, 150, 0, ${Math.min(1, strength * 0.011)})`,
  });
};

export const createOverlay = () => {
  const row = createBand();
  const col = createBand();
  const rowHeader = createBand();
  const colHeader = createBand();
  return {
    show(rects: Highlight, settings: Appearance) {
      const showRow = settings.mode !== "col";
      const showCol = settings.mode !== "row";
      place(row, showRow ? rects.row : null, settings.strength);
      place(col, showCol ? rects.col : null, settings.strength);
      place(rowHeader, showRow && settings.headers ? rects.rowHeader : null, settings.strength, true);
      place(colHeader, showCol && settings.headers ? rects.colHeader : null, settings.strength, true);
    },
    hide() {
      for (const el of [row, col, rowHeader, colHeader]) el.style.display = "none";
    },
  };
};
