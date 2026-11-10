import { describe, expect, it } from "vitest";
import { isLine, type Pixels, scanBounds } from "../src/gridline";

const opts = { lumDiff: 8, minRatio: 0.75, offset: 2 };

/** 白地に、指定した位置へ灰色の縦線・横線を引いた画像を作る */
const makeGrid = (width: number, height: number, vLines: number[], hLines: number[]): Pixels => {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const set = (x: number, y: number, v: number) => {
    const i = (y * width + x) * 4;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  };
  for (const x of vLines) for (let y = 0; y < height; y++) set(x, y, 191);
  for (const y of hLines) for (let x = 0; x < width; x++) set(x, y, 191);
  return { data, width, height };
};

describe("isLine", () => {
  it("縦線の位置を線と判定する", () => {
    const px = makeGrid(50, 9, [20], []);
    expect(isLine(px, 20, "x", opts)).toBe(true);
    expect(isLine(px, 19, "x", opts)).toBe(false);
  });

  it("横線が交差していても縦線と判定する", () => {
    const px = makeGrid(50, 17, [20], [8]);
    expect(isLine(px, 20, "x", opts)).toBe(true);
  });

  it("短い文字のストロークは線と判定しない", () => {
    const px = makeGrid(50, 17, [], []);
    for (let y = 5; y < 10; y++) px.data.fill(0, (y * 50 + 30) * 4, (y * 50 + 30) * 4 + 3);
    expect(isLine(px, 30, "x", opts)).toBe(false);
  });
});

describe("scanBounds", () => {
  it("前後の罫線からセルの範囲を求める", () => {
    const px = makeGrid(100, 9, [10, 40, 70], []);
    expect(scanBounds(px, 55, "x", opts, { start: false, end: false })).toEqual([41, 70]);
  });

  it("横方向にも同じく求める", () => {
    const px = makeGrid(9, 100, [], [21, 42]);
    expect(scanBounds(px, 30, "y", opts, { start: false, end: false })).toEqual([22, 42]);
  });

  it("罫線がなく canvas の端に達した側は端を境界にする", () => {
    const px = makeGrid(100, 9, [40], []);
    expect(scanBounds(px, 20, "x", opts, { start: true, end: false })).toEqual([0, 40]);
    expect(scanBounds(px, 60, "x", opts, { start: false, end: true })).toEqual([41, 100]);
  });

  it("罫線がなく端でもない側は null", () => {
    const px = makeGrid(100, 9, [], []);
    expect(scanBounds(px, 50, "x", opts, { start: false, end: false })).toEqual([null, null]);
  });
});
