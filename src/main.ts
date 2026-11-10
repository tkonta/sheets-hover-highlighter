// Sheets Hover Highlighter
//
// Google スプレッドシートはセルを <canvas> に描画しているため、DOM からセルの位置を取れない。
// そこでポインタ位置の canvas のピクセルを読み、上下左右の罫線を探してセルの境界を求め、
// その行・列を半透明の帯で重ねて表示する。罫線が見つからないときは、ポインタを中心にした固定幅の帯を表示する。
//
// Alt+H で ON/OFF を切り替える。

import { config } from "./config";
import { locate } from "./locate";
import { createOverlay } from "./overlay";

const overlay = createOverlay();
let enabled = true;
let last: { x: number; y: number } | null = null;
let scheduled = false;

const update = () => {
  scheduled = false;
  if (!enabled || !last) return overlay.hide();
  const found = locate(last.x, last.y);
  if (!found) return overlay.hide();
  overlay.show(found.row, found.col);
};

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(update);
};

// スクロールや入力のあとは canvas の描き直しを待ってから再計算する
const scheduleLater = () => setTimeout(schedule, config.redrawDelayMs);

document.addEventListener(
  "mousemove",
  (e) => {
    last = { x: e.clientX, y: e.clientY };
    schedule();
  },
  { passive: true, capture: true },
);
document.addEventListener("wheel", scheduleLater, { passive: true, capture: true });
document.addEventListener("keyup", scheduleLater, { capture: true });
document.addEventListener("mouseleave", () => overlay.hide());
window.addEventListener("blur", () => overlay.hide());

document.addEventListener(
  "keydown",
  (e) => {
    if (e.altKey && e.code === "KeyH") {
      enabled = !enabled;
      e.preventDefault();
      e.stopPropagation();
      if (enabled) schedule();
      else overlay.hide();
    }
  },
  { capture: true },
);
