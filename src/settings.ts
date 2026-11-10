export const defaults = { mode: "both", strength: 50, headers: true } as const;

export type Appearance = {
  mode: "both" | "row" | "col";
  strength: number;
  headers: boolean;
};

export type BookMode = "all-on" | "all-off" | "by-sheet";
export type Scope = { book: string; sheet: string | null };

export const enabledKey = "enabled";
export const appearanceKey = "appearance";
export const bookPrefix = "book:";
export const sheetPrefix = "sheet:";

export const scopeFromUrl = (url: URL): Scope | null => {
  const book = /^\/spreadsheets\/(?:u\/\d+\/)?d\/([\w-]+)(?:\/|$)/.exec(url.pathname)?.[1];
  if (url.origin !== "https://docs.google.com" || !book) return null;
  const gid = new URLSearchParams(url.hash.slice(1)).get("gid") ?? url.searchParams.get("gid");
  return {
    book: bookPrefix + book,
    sheet: gid !== null && /^\d+$/.test(gid) ? `${sheetPrefix}${book}:${gid}` : null,
  };
};

export const bookMode = (settings: Record<string, unknown>, scope: Scope): BookMode => {
  const saved = settings[scope.book];
  if (saved === "all-on" || saved === "all-off" || saved === "by-sheet") return saved;
  // 旧バージョンでシート別の指定があれば、その指定を引き継ぐ。
  const prefix = `${sheetPrefix}${scope.book.slice(bookPrefix.length)}:`;
  if (Object.keys(settings).some((key) => key.startsWith(prefix) && settings[key] !== undefined)) return "by-sheet";
  return saved === "off" ? "all-off" : "all-on";
};

export const sheetMode = (settings: Record<string, unknown>, scope: Scope): "on" | "off" => {
  const saved = scope.sheet ? settings[scope.sheet] : undefined;
  if (saved === "on" || saved === "off") return saved;
  return settings[scope.book] === "off" ? "off" : "on";
};

export const savedEnabled = (settings: Record<string, unknown>, scope: Scope): boolean => {
  if (settings[enabledKey] === false) return false;
  const mode = bookMode(settings, scope);
  return mode === "by-sheet" ? sheetMode(settings, scope) === "on" : mode === "all-on";
};

export const appearance = (value: unknown): Appearance => {
  if (!value || typeof value !== "object") return defaults;
  const { mode, strength, headers } = value as Partial<Appearance>;
  return {
    mode: mode === "both" || mode === "row" || mode === "col" ? mode : defaults.mode,
    strength:
      typeof strength === "number" && Number.isFinite(strength) && strength >= 10 && strength <= 100
        ? strength
        : defaults.strength,
    headers: typeof headers === "boolean" ? headers : defaults.headers,
  };
};
