# みんなで考える移民問題（GitHub Pages 公開手順）

このリポジトリは、GitHub Pages を利用して静的サイト「みんなで考える移民問題」を `main` ブランチの `/doc` ディレクトリから公開する構成です。

## 公開手順

1. GitHub にリポジトリをプッシュする
   - `main` ブランチに最新の変更をコミットし、リモートへプッシュします。
2. GitHub Pages 設定を変更する
   - リポジトリの **Settings** を開きます。
   - 左メニューの **Pages** を選択します。
   - **Source** を `main` ブランチに設定し、フォルダーを `/doc` に変更します。
   - `Save` を押して設定を保存します。
3. 公開を確認する
   - 数分待つと GitHub Pages がビルドされ、指定の URL でサイトが公開されます。
   - 更新後にキャッシュが残る場合はブラウザのリロードやキャッシュクリアを行ってください。

## ディレクトリ構成

```
doc/
├── index.html
├── contents.html
├── contact.html
├── .nojekyll
└── assets/
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── app.js
    │   ├── config.js
    │   └── contents.js
    └── img/
        └── placeholder.png
```

コンテンツやフォーム URL を更新する場合は、`doc/assets/js/config.js` および関連するファイルを編集してください。

