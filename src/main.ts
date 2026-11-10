// Google Sheets の canvas からセル位置を求め、行・列の帯を重ねる。
import { config } from "./config";
import { locate } from "./locate";
import { createOverlay } from "./overlay";
import { appearance, appearanceKey, savedEnabled, scopeFromUrl } from "./settings";

const overlay = createOverlay();
let scope = scopeFromUrl(new URL(location.href));
let settings: Record<string, unknown> = {};
let last: { x: number; y: number } | null = null;
let hovering = false;
let scheduled = false;
let badge: boolean | null = null;

let enabled = false;

const update = () => {
  scheduled = false;
  if (loading || !enabled) return overlay.hide();
  const found = hovering && last ? locate(last.x, last.y) : null;
  if (!found) return overlay.hide();
  overlay.show(found, appearance(settings[appearanceKey]));
};

const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(update);
};

const refresh = () => {
  enabled = scope !== null && savedEnabled(settings, scope);
  if (!enabled) overlay.hide();
  if (!loading && scope && enabled !== badge) {
    badge = enabled;
    void chrome.runtime.sendMessage(enabled ? "badge:on" : "badge:off").catch(console.error);
  }
  schedule();
};

// 先に監視を始め、読み込み中に変更された値は通知の内容を優先する。
const initialChanges: Record<string, unknown> = {};
let loading = true;
chrome.storage.local.onChanged.addListener((changes) => {
  for (const [key, change] of Object.entries(changes)) {
    if (loading) initialChanges[key] = change.newValue;
    settings[key] = change.newValue;
  }
  refresh();
});

void chrome.storage.local
  .get()
  .then((stored) => {
    settings = { ...stored, ...initialChanges };
  })
  .catch(console.error)
  .finally(() => {
    loading = false;
    refresh();
  });

const updateScope = () => {
  const next = scopeFromUrl(new URL(location.href));
  if (next?.book === scope?.book && next?.sheet === scope?.sheet) return;
  scope = next;
  last = null;
  refresh();
};

window.navigation.addEventListener("currententrychange", updateScope);
window.addEventListener("hashchange", updateScope);

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message !== "scope") return;
  updateScope();
  respond(scope);
});

const scheduleLater = () => setTimeout(schedule, config.redrawDelayMs);

const viewportChanged = () => {
  overlay.hide();
  scheduleLater();
};

document.addEventListener(
  "mousemove",
  (e) => {
    last = { x: e.clientX, y: e.clientY };
    hovering = true;
    schedule();
  },
  { passive: true, capture: true },
);
document.addEventListener("wheel", viewportChanged, { passive: true, capture: true });
document.addEventListener("scroll", viewportChanged, { passive: true, capture: true });
window.addEventListener("resize", viewportChanged);
document.addEventListener("keyup", scheduleLater, { capture: true });

const leave = () => {
  hovering = false;
  overlay.hide();
};
document.addEventListener("mouseleave", leave);
window.addEventListener("blur", leave);
