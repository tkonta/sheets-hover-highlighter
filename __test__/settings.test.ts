import { describe, expect, it } from "vitest";
import { bookMode, savedEnabled, sheetMode } from "../src/settings";

const scope = { book: "book:example", sheet: "sheet:example:0" };

describe("ハイライト設定の適用", () => {
  it("拡張機能をオフにするとすべてのブックモードで無効になる", () => {
    for (const mode of ["all-on", "all-off", "by-sheet"]) {
      expect(savedEnabled({ enabled: false, [scope.book]: mode, [scope.sheet]: "on" }, scope)).toBe(false);
    }
  });

  it("ブック全体の指定では保存済みのシート設定を適用しない", () => {
    expect(savedEnabled({ [scope.book]: "all-on", [scope.sheet]: "off" }, scope)).toBe(true);
    expect(savedEnabled({ [scope.book]: "all-off", [scope.sheet]: "on" }, scope)).toBe(false);
  });

  it("シートごとの選択ではシート設定を適用し、未設定ならオンにする", () => {
    expect(savedEnabled({ [scope.book]: "by-sheet", [scope.sheet]: "off" }, scope)).toBe(false);
    expect(savedEnabled({ [scope.book]: "by-sheet", [scope.sheet]: "on" }, scope)).toBe(true);
    expect(savedEnabled({ [scope.book]: "by-sheet" }, scope)).toBe(true);
  });

  it("旧設定のシート別指定と、同じブックの未設定シートの動作を引き継ぐ", () => {
    const legacy = { [scope.book]: "off", [scope.sheet]: "on", "sheet:another:0": "off" };
    const otherSheet = { ...scope, sheet: "sheet:example:1" };
    expect(bookMode(legacy, scope)).toBe("by-sheet");
    expect(savedEnabled(legacy, scope)).toBe(true);
    expect(sheetMode(legacy, otherSheet)).toBe("off");
    expect(savedEnabled(legacy, otherSheet)).toBe(false);
    expect(bookMode(legacy, { book: "book:new", sheet: "sheet:new:0" })).toBe("all-on");
  });
});
