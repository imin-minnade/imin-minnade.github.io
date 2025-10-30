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
│   │   └── contents.js
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
- `short_url` 列が正しい `http(s)` リンクならショートボタンを追加表示。
- `play_list1` 等に「マスコミ」関連値がある場合はマスコミカテゴリとして分類。

## スタイル指針
- レスポンシブ：モバイル1列／タブレット2列／デスクトップ3列。
- `asset/css/style.css` で全ページ共通の設計。
- カード、タブ、バッジ、ページネーションなどの状態に応じたホバー／アクティブ／フォーカス指定。
- 追加ユーティリティクラス：`legal`（法務ページ）、`pagination` など。

## デプロイ手順
1. 変更を `main` ブランチへコミットし GitHub へプッシュ。
2. GitHub Pages 設定が `main` / `/docs` になっていることを確認。
3. 自動デプロイ完了後、公開 URL を確認。必要に応じてキャッシュクリア。

## 再利用ガイド（コピーサイト構築手順）
1. このリポジトリをテンプレートにするかクローンする。
2. `docs/assets/img/` のロゴなどブランド画像を差し替える。
3. `docs/assets/js/config.js` で `siteName`, `videosCsvUrl`, `contactFormUrl` を更新。
4. CSV の列・値が要件に合うよう整備し、公開設定（"ウェブに公開" または「リンクを知っている全員」）を確認。
5. Google フォームの埋め込みURLを取得し配置。
6. 必要に応じて `README` やプライバシー／利用規約ページの文言をカスタマイズ。
7. ローカル確認：簡易サーバー（`python -m http.server` 等）で `docs/` を配信し挙動確認。
8. `main` ブランチへプッシュし、Pages のデプロイを確認。

## メンテナンスのポイント
- CSV の日付や数値が不正だとソート／公開判定に影響するため注意。
- アイコンなど Unicode 文字は `style.css` が ASCII ベースのため、必要に応じて置換可。
- 新規ページを追加する場合は `footer.html` とナビゲーションのリンクを更新。
- 長期的なスプレッドシート変更に備え、列名が変わらないよう運用ルールを定める。

---
この README はサイト複製や保守担当者が仕様を把握しやすいよう、要件定義としてまとめています。コピーサイトを作成する際は本書を基に環境設定・データ整備を進めてください。

