// 行と列を示す半透明の帯 (ポインタイベントを奪わない固定配置の div)

import { config } from "./config";

export type Rect = { left: number; top: number; width: number; height: number };

const createBand = (color: string): HTMLDivElement => {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483646",
    background: color,
    outline: config.outline,
    display: "none",
  });
  document.documentElement.appendChild(el);
  return el;
};

const place = (el: HTMLDivElement, r: Rect) => {
  Object.assign(el.style, {
    display: "block",
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${Math.max(0, r.width)}px`,
    height: `${Math.max(0, r.height)}px`,
  });
};

export const createOverlay = () => {
  const row = createBand(config.rowColor);
  const col = createBand(config.colColor);
  return {
    show(rowRect: Rect, colRect: Rect) {
      place(row, rowRect);
      place(col, colRect);
    },
    hide() {
      row.style.display = "none";
      col.style.display = "none";
    },
  };
};
