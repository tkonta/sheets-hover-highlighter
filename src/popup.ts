import { appearance, appearanceKey, bookMode, enabledKey, type Scope, savedEnabled, sheetMode } from "./settings";

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const status = element("status");
const notice = element("notice");
const scopeControls = element<HTMLFieldSetElement>("scope-controls");
const appearanceControls = element<HTMLFieldSetElement>("appearance-controls");
const resetControls = element<HTMLFieldSetElement>("reset-controls");
const master = element<HTMLInputElement>("enabled");
const book = element<HTMLSelectElement>("book");
const sheet = element<HTMLSelectElement>("sheet");
const scopeNote = element("scope-note");
const mode = element<HTMLSelectElement>("mode");
const strength = element<HTMLInputElement>("strength");
const strengthValue = element<HTMLOutputElement>("strength-value");
const headers = element<HTMLInputElement>("headers");
const confirmation = element<HTMLDialogElement>("confirmation");

let scope: Scope | null = null;
let highlightEnabled = false;
let busy = false;
let extensionEnabled = true;

const renderState = () => {
  master.disabled = busy;
  master.checked = extensionEnabled;
  scopeControls.disabled = busy || !extensionEnabled || !scope;
  appearanceControls.disabled = busy || !extensionEnabled;
  resetControls.disabled = busy || !extensionEnabled;
  status.textContent = !extensionEnabled
    ? "拡張機能はオフです。"
    : scope
      ? `このシートのハイライトは${highlightEnabled ? "オン" : "オフ"}です。`
      : "設定対象のスプレッドシートを開いてください。";
  sheet.disabled = book.value !== "by-sheet" || !scope?.sheet;
  scopeNote.hidden = !scope || book.value !== "by-sheet" || !!scope.sheet;
};

const loadState = async () => {
  const stored = await chrome.storage.local.get();
  extensionEnabled = stored[enabledKey] !== false;
  const savedAppearance = appearance(stored[appearanceKey]);
  mode.value = savedAppearance.mode;
  strength.value = String(savedAppearance.strength);
  strengthValue.value = `${strength.value}%`;
  headers.checked = savedAppearance.headers;
  if (scope) {
    highlightEnabled = savedEnabled(stored, scope);
    book.value = bookMode(stored, scope);
    sheet.value = sheetMode(stored, scope);
  }
};

const run = async (task: () => Promise<void>) => {
  if (busy) return;
  busy = true;
  notice.hidden = true;
  renderState();
  try {
    await task();
  } catch (error) {
    console.error(error);
    notice.textContent = "操作できませんでした。ポップアップを開き直して再度お試しください。";
    notice.hidden = false;
  } finally {
    busy = false;
    renderState();
  }
};

master.addEventListener("change", () => {
  const enabled = master.checked;
  void run(async () => {
    await chrome.storage.local.set({ [enabledKey]: enabled });
    extensionEnabled = enabled;
    await loadState();
  });
});

const savePreference = (key: string | null | undefined, value: string) => {
  if (!key) return;
  void run(async () => {
    await chrome.storage.local.set({ [key]: value });
    await loadState();
  });
};
book.addEventListener("change", () => savePreference(scope?.book, book.value));
sheet.addEventListener("change", () => savePreference(scope?.sheet, sheet.value));

const saveAppearance = () => {
  const value = appearance({ mode: mode.value, strength: strength.valueAsNumber, headers: headers.checked });
  void run(() => chrome.storage.local.set({ [appearanceKey]: value }));
};
mode.addEventListener("change", saveAppearance);
headers.addEventListener("change", saveAppearance);
strength.addEventListener("input", () => {
  strengthValue.value = `${strength.value}%`;
});
strength.addEventListener("change", saveAppearance);

element("reset").addEventListener("click", () => {
  confirmation.returnValue = "";
  confirmation.showModal();
});
confirmation.addEventListener("close", () => {
  if (confirmation.returnValue !== "apply") return;
  void run(async () => {
    await chrome.storage.local.clear();
    await loadState();
    notice.textContent = "すべての設定を初期化しました。";
    notice.hidden = false;
  });
});

void run(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id !== undefined) scope = await chrome.tabs.sendMessage(tab.id, "scope").catch(() => null);
  await loadState();
});
