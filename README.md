# 異世界新聞

GitHub Actionsで毎週、OpenAI Images APIから「異世界で発行されている新聞」のPNGを生成し、GitHub Pagesで発行日別に閲覧できる静的サイトです。

従来のHTML組版やPDF化は行いません。生成された新聞画像をそのまま紙面として扱います。

## セットアップ

```bash
npm ci
cp .env.example .env
```

`.env` に必要な値を設定します。`.env` は `.gitignore` で除外されています。

```bash
OPENAI_API_KEY=sk-...
OPENAI_IMAGE_MODEL=gpt-image-1
NEWSPAPER_IMAGE_PROMPT=異世界で発行されている新聞を作って。
ISSUE_TIME_ZONE=Asia/Tokyo
```

`OPENAI_IMAGE_MODEL` は利用したい画像生成モデル名に差し替えられます。

## 実行

```bash
npm run generate:newspaper
```

生成物は `dist/` に保存されます。

- `dist/newspapers/YYYY-MM-DD.png`: 発行日の新聞PNG
- `dist/issues/YYYY-MM-DD.json`: 生成メタデータ
- `dist/index.html`: 左側の日付メニューで新聞PNGを切り替える閲覧ページ
- `dist/manifest.json`: 公開中の号一覧

## GitHub Actions

`.github/workflows/isekai-newspaper.yml` は以下で実行されます。

- 毎週月曜 07:00 JST
- `workflow_dispatch` による手動実行
- Node.js 22
- `npm ci`
- `npm run generate:newspaper`
- `dist/` をGitHub Pagesへデプロイ

GitHub Secrets / Variables:

- Secret: `OPENAI_API_KEY`
- Variable: `OPENAI_IMAGE_MODEL` 任意
- Variable: `NEWSPAPER_IMAGE_PROMPT` 任意

workflowは `dist/newspapers` と `dist/issues` をGitHub Actions cacheから復元してから新号を追加します。これにより、Pagesの左メニューに過去号の日付が並びます。

## GitHub Pages

リポジトリ側では、Settings -> Pages -> Build and deployment -> Source を `GitHub Actions` に設定してください。
