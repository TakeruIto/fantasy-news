# 異世界新聞

GitHub Actionsで毎週生成できる、架空ファンタジー新聞の自動生成プロジェクトです。

`npm run generate:newspaper` は紙面プラン生成、レイアウト選択、記事生成、トップ挿絵生成、A4縦1ページHTML生成、収まり検査、PDF化、metadata保存までを実行します。

## セットアップ

```bash
npm ci
cp .env.example .env
```

`.env` に必要な値を設定します。`.env` は `.gitignore` で除外されています。

```bash
OPENAI_API_KEY=sk-...
ENABLE_IMAGE_GENERATION=false
```

`OPENAI_API_KEY` は記事生成に必須です。不足している場合は分かりやすいエラーで停止します。

## 実行

```bash
npm run generate:newspaper
```

生成物は `dist/` に保存されます。

- `dist/isekai-newspaper-YYYY-MM-DD.html`
- `dist/index.html`
- `dist/isekai-newspaper-YYYY-MM-DD.pdf`
- `dist/isekai-newspaper-YYYY-MM-DD.json`
- `dist/images/isekai-newspaper-YYYY-MM-DD-top.png` または `.svg`

## 可変レイアウト

毎号、LLMが編集長として紙面テーマ、ニュース密度、トップ画像の重要度、市況欄の重要度、記事候補、広告候補をJSONで計画します。

コード側はその計画をもとに、以下のテンプレートから機械的にレイアウトを選びます。

- `feature_heavy`: トップ記事を大きく扱う号
- `lead_image_right`: トップ記事と画像のバランス型
- `dense_3col`: ニュース数が多い高密度号
- `banner_lead`: 横長トップ画像を使う号
- `market_ad_heavy`: 市況欄と広告を目立たせる号

記事本文の文字量は、選ばれたテンプレートの枠に合わせて記事生成前に予算化されます。HTMLレンダリング後にPuppeteerでA4紙面からのはみ出しを検査し、収まらない場合は記事・広告本文を短縮して再レンダリングします。

metadata JSONには、紙面プラン、選択されたレイアウト、文字量予算、収まり検査結果が保存されます。

## GitHub Actions

`.github/workflows/isekai-newspaper.yml` は以下で実行されます。

- 毎週月曜 07:00 JST
- `workflow_dispatch` による手動実行
- Node.js 22
- `npm ci`
- `npm run generate:newspaper`
- `dist/*.pdf`, `dist/*.html`, `dist/*.json`, `dist/images/*` をartifact保存
- `dist/` をGitHub Pagesへデプロイ

GitHub Secretsに以下を登録してください。

- `OPENAI_API_KEY`
- `ENABLE_IMAGE_GENERATION`

`ENABLE_IMAGE_GENERATION=true` の場合はOpenAI Images APIでトップ挿絵を生成します。`false` の場合は、文字を含まないローカルの新聞挿絵風SVGを生成します。

## GitHub Pages

workflowは生成後の `dist/` 全体をGitHub Pagesへデプロイします。`dist/index.html` は最新号HTMLのコピーなので、PagesのトップURLで最新号を表示できます。

リポジトリ側では、Settings -> Pages -> Build and deployment -> Source を `GitHub Actions` に設定してください。

## 新聞仕様

- タイトルは「異世界新聞」
- A4縦1ページ
- 古い新聞風
- 2〜3カラム
- トップ記事1本
- 短い記事3〜5本
- 市況欄1本
- 架空広告2〜3本
- 現実のニュース・人物・企業は扱わない
- 画像内に文字を入れない
