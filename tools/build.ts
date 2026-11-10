// Vite で content script をバンドルし、dist-<browser>/ に拡張機能一式を出力する。
// Usage: node tools/build.ts <browser> <development|production> [watch]

import fs from "node:fs";
import path from "node:path";
import { build, type InlineConfig } from "vite";
import settings from "./build.json" with { type: "json" };

type Browser = keyof typeof settings.targets;
type Mode = "development" | "production";

const isBrowser = (b: string | undefined): b is Browser => b != null && Object.hasOwn(settings.targets, b);

const copyStaticFiles = (browser: Browser) => {
  for (const dir of ["base", `gen-${browser}`]) {
    const src = path.join("static", dir);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, `dist-${browser}`, {
      recursive: true,
      filter: (f) => !path.basename(f).startsWith("."),
    });
  }
};

const createConfig = (browser: Browser, mode: Mode, watch: boolean, entry: string, outfile: string): InlineConfig => {
  const isProd = mode === "production";
  return {
    configFile: false,
    publicDir: false,
    logLevel: "warn",
    mode,
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    build: {
      outDir: `dist-${browser}`,
      emptyOutDir: false,
      copyPublicDir: false,
      target: settings.targets[browser],
      minify: isProd,
      sourcemap: isProd ? false : "inline",
      reportCompressedSize: false,
      watch: watch ? {} : null,
      // content script は単一の classic script である必要があるため IIFE で出力する
      rolldownOptions: {
        input: entry,
        output: {
          format: "iife",
          strict: true,
          entryFileNames: outfile,
        },
      },
    },
  };
};

const main = async (browser: Browser, mode: Mode, watch: boolean) => {
  if (mode === "production") {
    // 古いファイルがリリースに混ざらないよう、空の状態から作る
    fs.rmSync(`dist-${browser}`, { recursive: true, force: true });
  }
  fs.mkdirSync(`dist-${browser}`, { recursive: true });
  copyStaticFiles(browser);

  for (const [entry, outfile] of Object.entries(settings.entries)) {
    const result = await build(createConfig(browser, mode, watch, entry, outfile));
    const outPath = path.join(`dist-${browser}`, outfile);
    if (watch && "on" in result) {
      result.on("event", (event) => {
        if (event.code === "BUNDLE_END") {
          console.info(`[${new Date().toLocaleTimeString()}] ✅ Generated: ${outPath}`);
          event.result?.close();
        } else if (event.code === "ERROR") {
          console.error(event.error);
          event.result?.close();
        }
      });
    } else {
      console.info(`✅ Generated: ${outPath}`);
    }
  }
};

const [browser, mode, watchArg] = process.argv.slice(2);
if (!isBrowser(browser) || (mode !== "development" && mode !== "production")) {
  console.error("Usage: node tools/build.ts <browser> <development|production> [watch]");
  process.exit(1);
}

main(browser, mode, watchArg === "watch").catch((e) => {
  console.error(e);
  process.exit(1);
});
