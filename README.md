# Sheets Hover Highlighter

Google スプレッドシートで、**マウスポインタの下にあるセル**の行と列を半透明の帯で強調表示する、個人用の Chrome 拡張機能です。
セルをクリックして選択しなくても、ポインタを動かすだけで帯が追従します。

## 使い方

アドレスバー右側の拡張機能アイコンをクリックすると、ポップアップから設定を変更できます。
Chrome の拡張機能メニューでピン留めすると、ツールバーのバッジで現在のオン／オフを確認できます。

- **拡張機能を有効にする**スイッチはすべてのタブに適用されます。オフにするとハイライトが止まり、ほかの設定は操作できなくなります。オン／オフは Chrome の再起動後も維持されます。
- **ブック・シートごとの設定**は、ブックで「全シートでオン」「全シートでオフ」「シートごとに設定」から選びます。「シートごとに設定」の場合だけ、シート別にオン／オフを指定できます。未設定のブックとシートの既定値はオンです。設定は Chrome の同じプロファイルに保存され、ブラウザを閉じても残ります。
- **表示**では、行のみ・列のみ・両方、濃さ、行番号・列見出しの強調を設定できます。表示設定はすべてのブックに共通です。
- **すべての設定を初期化**すると、ブック・シートごとの設定を削除し、拡張機能と表示の設定を初期値に戻します。

動作対象は `https://docs.google.com/spreadsheets/*` です。`storage` 権限で拡張機能の設定を保存します。シートの内容は変更しません。

## 仕組み

Google スプレッドシートはセルを `<canvas>` に描画しているため、DOM からセルの位置を取得できません。
そこで、ポインタ位置の canvas のピクセルを読み出し、上下左右で最も近い罫線（グリッド線・枠線）を探してセルの境界を求めます。

- 罫線は「周囲より暗いピクセルが、直交方向に一定以上の割合で続くもの」として判定します。文字のストロークは短いため除外されます。
- 罫線が見つからない場合は、ポインタを中心にした固定幅（20px）の帯を表示します。
- 罫線を消したシートや、セル間で枠線のない塗りつぶし領域では境界を正しく取れないことがあります。

## ディレクトリ構成

```
.
├── src/                    # 拡張機能のソース (TypeScript)
│   ├── main.ts             # エントリ。イベント処理と ON/OFF
│   ├── locate.ts           # canvas の読み出しと帯の位置計算
│   ├── gridline.ts         # 罫線の判定 (DOM 非依存。テスト対象)
│   ├── overlay.ts          # 帯の表示
│   └── config.ts           # 色や判定のパラメータ
├── __test__/               # Vitest のテスト
├── data/manifest/          # manifest のテンプレート (version はビルド時に埋め込む)
├── static/base/            # そのまま dist にコピーするファイル (アイコンなど)
├── tools/                  # ビルド用スクリプト (Node.js で直接実行する TypeScript)
│   ├── make_manifest.ts    # manifest.json の生成
│   ├── build.ts            # Vite によるバンドル
│   ├── archive.ts          # ZIP 化
│   └── build.json          # ビルド対象とエントリの設定
└── .github/workflows/
    ├── build.yml           # push / PR ごとに lint・型チェック・テスト・ビルド
    └── release-chrome.yml  # v* タグの push で GitHub Release を作成
```

## ローカルでの開発

Node.js 26 以上を使用します。

```sh
npm install
npm run build        # 開発ビルド → dist-chrome/ (名前に "(Dev)" が付き、ソースマップ付き)
npm run watch        # 変更を監視して再ビルド
npm run release      # 本番ビルド (minify)
npm run package      # 本番ビルド + ZIP 化 → sheets-hover-highlighter-chrome-<version>.zip
npm run lint         # Biome
npm run format       # Biome で整形
npm run typecheck    # TypeScript
npm test             # Vitest
```

### Chrome への読み込み

1. `npm run build` を実行します。
2. `chrome://extensions` を開き、右上の「デベロッパー モード」をオンにします。
3. 「パッケージ化されていない拡張機能を読み込む」から、このリポジトリ内の `dist-chrome` を選択します。
4. スプレッドシートを開いている場合は再読み込みします。

ソースを変更したら再ビルドし、拡張機能管理画面で再読み込みしたあと、スプレッドシートも再読み込みしてください。

## リリース

`package.json` の `version` を更新してコミットし、同じバージョンの `v` 付きタグを push すると、
GitHub Actions が本番ビルドを行い、ZIP を添付した GitHub Release を作成します。

```sh
npm version patch --no-git-tag-version   # 例: 0.1.0 → 0.1.1
git commit -am "chore: release v0.1.1"
git push origin main
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

- タグと `package.json` のバージョンが一致しない場合、ワークフローはエラーで停止します。
- 成功すると「Releases」に `sheets-hover-highlighter-v0.1.1-chrome.zip` が添付されます。
  ZIP を展開し、上記と同じ手順で展開したフォルダーを読み込みます。
