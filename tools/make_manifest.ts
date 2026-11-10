// data/manifest/manifest-<browser>.json から、バージョンを埋め込んだ manifest.json を生成する。
// 出力先: static/gen-<browser>/manifest.json
// development ビルドでは名前に " (Dev)" を付け、本番版と並べて読み込んでも区別できるようにする。

import fs from "node:fs";
import path from "node:path";
import pkg from "../package.json" with { type: "json" };

const [browser, mode] = process.argv.slice(2);
if (!browser || (mode !== "development" && mode !== "production")) {
  console.error("Usage: node tools/make_manifest.ts <browser> <development|production>");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(`data/manifest/manifest-${browser}.json`, "utf-8"));
manifest.version = pkg.version;
if (mode === "development") {
  manifest.name += " (Dev)";
}

const outDir = `static/gen-${browser}`;
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "manifest.json");
fs.writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
console.info(`Generated: ${outFile}`);
