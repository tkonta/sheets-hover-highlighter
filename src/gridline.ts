// canvas から読み出したピクセルから、セルの境界となる罫線を探す (DOM に依存しない純粋な処理)

export type Pixels = {
  /** RGBA の並び (ImageData.data と同じ形式) */
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export type ScanOptions = {
  /** 線とみなす輝度差 */
  lumDiff: number;
  /** 線らしいピクセルが占める割合の下限 */
  minRatio: number;
  /** 線の両側として比較するピクセルの距離 */
  offset: number;
};

export type Edges = {
  /** 走査範囲の先頭が canvas の端に一致する */
  start: boolean;
  /** 走査範囲の末尾が canvas の端に一致する */
  end: boolean;
};

/** [手前側の境界, 向こう側の境界]。見つからない側は null */
export type Bounds = [number | null, number | null];

const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/**
 * 走査方向の位置 p に、走査方向と直交する線があるかを判定する。
 * direction = "x": 縦線 (列の境界) を探す。p は x 座標
 * direction = "y": 横線 (行の境界) を探す。p は y 座標
 */
export const isLine = (px: Pixels, p: number, direction: "x" | "y", opts: ScanOptions): boolean => {
  const { data, width, height } = px;
  const at = (x: number, y: number) => lum(data, (y * width + x) * 4);
  const off = opts.offset;
  const len = direction === "x" ? width : height;
  if (p - off < 0 || p + off >= len) return false;

  const cross = direction === "x" ? height : width;
  let hit = 0;
  for (let q = 0; q < cross; q++) {
    const [c, a, b] =
      direction === "x" ? [at(p, q), at(p - off, q), at(p + off, q)] : [at(q, p), at(q, p - off), at(q, p + off)];
    if (c < Math.max(a, b) - opts.lumDiff) hit++;
  }
  return cross > 0 && hit / cross >= opts.minRatio;
};

/**
 * start の位置から前後に走査し、最も近い罫線でセルの範囲を求める。
 * 戻り値は Pixels 内の座標で、[セルの先頭, セルの末尾 (排他)]。
 * 罫線が見つからず、走査範囲が canvas の端に達している側は端を境界とする。
 */
export const scanBounds = (
  px: Pixels,
  start: number,
  direction: "x" | "y",
  opts: ScanOptions,
  edges: Edges,
): Bounds => {
  const len = direction === "x" ? px.width : px.height;

  let lo: number | null = null;
  for (let p = start; p >= 0; p--) {
    if (isLine(px, p, direction, opts)) {
      lo = p + 1;
      break;
    }
  }
  let hi: number | null = null;
  for (let p = start + 1; p < len; p++) {
    if (isLine(px, p, direction, opts)) {
      hi = p;
      break;
    }
  }

  if (lo == null && edges.start) lo = 0;
  if (hi == null && edges.end) hi = len;
  return [lo, hi];
};
