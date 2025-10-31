# みんなで考える移民問題｜静的サイト要件定義

## プロジェクト概要
- GitHub Pages 公開用の静的サイト。
- ブランチは `main`、公開ディレクトリはルート直下の `docs/`。
- すべての HTML は `lang="ja"`。文字コードは UTF-8。
- GitHub Actions のビルドエラー回避のため `.nojekyll` を配置。

## ディレクトリ構成
```
docs/
├── index.html            # トップページ
├── contents.html         # 動画一覧＆フィルタ・ページネーション
├── contact.html          # お問い合わせフォーム埋め込み
├── privacy.html          # プライバシーポリシー
├── terms.html            # 利用規約
├── .nojekyll
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── config.js
│   │   ├── contents.js
│   │   └── x.js
│   └── img/
│       ├── logo.png
│       ├── logo.ico
│       └── placeholder.png
└── partials/
    └── footer.html
```

## データソース
### Google スプレッドシート（動画データ）
- CSV 公開 URL を `docs/assets/js/config.js` の `videosCsvUrl` に設定。
- 必須列
  | 列名候補 | 用途 |
  | --- | --- |
  | `title` | 動画タイトル（必須） |
  | `url` | 動画URL（YouTube推奨） |
  | `category` / `playlist` / `play_list1` | カテゴリ判定（移民問題 / 番外編 / 音楽） |
  | `description` | カードの概要文 |
  | `published_at` / `date` | 公開日（`YYYY-MM-DD`, `YYYY/MM/DD`, `YYYY年M月D日`, `YYYYMMDD` など対応） |
  | `duration` | 再生時間表示 |
  | `likes` / `likeCount` | いいね数 |
  | `views` / `viewCount` | 閲覧数 |
  | `thumbnail` | サムネイルURL（省略時は YouTube ID から自動生成） |
  | `id` | 任意。未指定時はタイトル等から自動生成 |

- 公開判定：公開日の「当日12:00」以前の動画のみ表示。
- 人気順ソート：`views` → `likes` → 公開日（降順）。

### Google スプレッドシート（X投稿データ）
- CSV 公開 URL を `docs/assets/js/config.js` の `xPostsCsvUrl` に設定。
- 推奨列
  | 列名候補 | 用途 |
  | --- | --- |
  | `published_at` / `date` | 投稿日時（`YYYYMMDD` など8桁 or ISO8601） |
  | `url` | 投稿URL（必須） |
  | `content` | 投稿本文（テキスト） |
  | `likeCountShort` / `likes` | いいね数（任意） |
  | `retweets` / `reposts` | リポスト数（任意） |

- 取得後は直近3件までをトップページに表示。データが無い場合はプレースホルダ表示。
- `xPostsFallbackUrl` を設定しておくと、CSV が空／取得エラー時にその投稿を1件だけウィジェットとして表示します。
- 複数シートを含むスプレッドシートを公開する際は、対象シートの `gid` を指定した CSV URL（例：`...?single=true&gid=XXXX&output=csv`）を使用することで、意図しないシートのデータ混在を防げます。

### Google フォーム（お問い合わせ）
- 埋め込みURLを `config.js` の `contactFormUrl` に設定。
- `contact.html` の `#form-embed` に iframe を自動挿入（高さ 1400px）。

## ページ仕様
### 共通
- フォント：Google Fonts「Noto Sans JP」。
- 色：背景 `#fff`、本文 `#222`, アクセント `#C62828`, ボーダー `#e5e7eb`。
- ヘッダー：ロゴ画像＋サイト名＋ナビ（トップ／コンテンツ／お問い合わせ）。
- フッター：`partials/footer.html` を JavaScript で読み込み共通化。
  - リンク：プライバシーポリシー／利用規約／お問い合わせ。
  - 年号は JS で自動挿入。
- ファビコン：`assets/img/logo.ico`。
- JavaScript：`app.js`（共通ユーティリティ）、`contents.js`（動画取得・描画・フィルタ）、`config.js`（設定）。

### index.html（トップ）
- ヒーローセクション：大見出し＋説明文。
- 最新動画ハイライト：最大6件。CSVから公開済み動画を抽出しカード表示。
- 「すべて見る」ボタンで `contents.html` へ。
- 最新のX投稿セクション：`xPostsCsvUrl` から取得した投稿の最新3件をカード表示。
- X投稿カード：本文抜粋・投稿日・任意のメトリクス（いいね/リポスト）・投稿リンクを表示。
- CSVが空の場合でも `xPostsFallbackUrl` の投稿を1件表示して見た目を保つ。

### contents.html（動画一覧）
- 見出し：動画一覧＋件数バッジ。
- タブ：移民問題／番外編／音楽／マスコミ（カテゴリ切り替え）。
- フィルタ：キーワード検索、並び順（公開日降順／公開日昇順／人気順）、表示件数（30件／50件／100件）。
- 検索はタイトルに対する部分一致（文字列小文字化）。
- ソートは JS 処理。ページサイズ変更（30/50/100件切替）やフィルタ変更でページネーションをリセット。
- ページネーション：総件数／表示範囲／前後ボタン／ページ番号（省略記号付き）。
- カード要素：
  - サムネイル（16:9, `object-fit: cover`）。
  - タイトル。
  - 概要（説明文がない場合は空）。
  - メタ情報：カテゴリラベル・公開日・再生時間（任意）。
  - ステータス行：❤いいね数（赤アイコン）／👁閲覧数／公開日。
  - アクションボタン：視聴する（赤系）・ショート（青系）を並列表示。`target="_blank"` `rel="noopener noreferrer"`。

### contact.html
- 説明文＋フォーム埋め込み（Googleフォーム）。
- iframe の高さ 1400px。

### privacy.html / terms.html
- カード型のセクションで標準的な内容を記載。
- 制定日を明記。

## JavaScript 概要
### `app.js`
- ナビの active クラス付与。
- フッターの年表示。
- フッター共通化（`data-footer-include` 属性で partial を読み込み）。
- 日付／数値フォーマット関数をエクスポート。

### `contents.js`
- CSV を取得 → パース → 動画配列を保持。
- カテゴリ推定に `category` 列＋プレイリスト列を使用。
- サムネイルは `thumbnail` 列優先、なければ YouTube ID から生成。
- ソート／フィルタ／ページネーションの状態管理。
- 公開判定は「公開日の正午」以前で表示。
- タブや検索変更時にページ番号を初期化。
- 人気順は `views` の降順 → `likes` の降順 → 公開日降順。
- CSV取得時に直接アクセスできない場合、`https://r.jina.ai/` 経由でのフォールバックに対応。
- `short_url` 列が正しい `