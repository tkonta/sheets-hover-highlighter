// 見た目と判定のパラメータ

export const config = {
  /** 罫線を探す最大距離 (CSS px) */
  maxScanCss: 800,
  /** 罫線の判定に使う、走査方向と直交する幅 (± CSS px) */
  spanCss: 8,
  /** 判定幅のうち、線らしいピクセルが占める割合の下限 */
  minRatio: 0.75,
  /** 周囲より暗いとみなす輝度差 */
  lumDiff: 8,
  /** 罫線が見つからないときの帯の半幅 (CSS px) */
  fallbackHalfCss: 10,
  /** スクロール後、canvas の描き直しを待つ時間 (ms) */
  redrawDelayMs: 60,
} as const;
