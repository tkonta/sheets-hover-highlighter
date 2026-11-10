// dist-<browser>/ を ZIP にまとめる。
// 出力: sheets-hover-highlighter-<browser>-<version>.zip (リポジトリ直下)
// 外部コマンドや依存パッケージを使わない最小限の ZIP 書き出し (ZIP64 非対応)。

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import pkg from "../package.json" with { type: "json" };

type Entry = { name: string; data: Buffer; mtime: Date };

const dosDateTime = (d: Date) => ({
  time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
  date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
});

const makeZip = (entries: Entry[]): Buffer => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const { name, data, mtime } of entries) {
    const nameBuf = Buffer.from(name, "utf-8");
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const compress = deflated.length < data.length;
    const body = compress ? deflated : data;
    const { time, date } = dosDateTime(mtime);
    const crc = zlib.crc32(data);

    // ローカルファイルヘッダとセントラルディレクトリで共通の 26 バイト
    const common = Buffer.alloc(26);
    common.writeUInt16LE(20, 0); // version needed to extract
    common.writeUInt16LE(0x0800, 2); // flags: UTF-8 のファイル名
    common.writeUInt16LE(compress ? 8 : 0, 4); // method: deflate / store
    common.writeUInt16LE(time, 6);
    common.writeUInt16LE(date, 8);
    common.writeUInt32LE(crc, 10);
    common.writeUInt32LE(body.length, 14);
    common.writeUInt32LE(data.length, 18);
    common.writeUInt16LE(nameBuf.length, 22);
    common.writeUInt16LE(0, 24); // extra field length

    const local = Buffer.alloc(4);
    local.writeUInt32LE(0x04034b50, 0);
    locals.push(local, common, nameBuf, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    common.copy(central, 6);
    // 32: comment length, 34: disk number, 36: internal attr, 38: external attr = 0
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += 4 + common.length + nameBuf.length + body.length;
  }

  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, ...centrals, end]);
};

const [browser] = process.argv.slice(2);
if (!browser) {
  console.error("Usage: node tools/archive.ts <browser>");
  process.exit(1);
}

const srcDir = `dist-${browser}`;
if (!fs.existsSync(srcDir)) {
  console.error(`Not found: ${srcDir}`);
  process.exit(1);
}

const entries: Entry[] = fs
  .readdirSync(srcDir, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => path.join(e.parentPath, e.name))
  .sort()
  .map((file) => ({
    name: path.relative(srcDir, file).replaceAll(path.sep, "/"),
    data: fs.readFileSync(file),
    mtime: fs.statSync(file).mtime,
  }));

const outFile = `${pkg.name}-${browser}-${pkg.version}.zip`;
fs.writeFileSync(outFile, makeZip(entries));
console.info(`${outFile}: ${(fs.statSync(outFile).size / 1024).toFixed(1)} KB`);
