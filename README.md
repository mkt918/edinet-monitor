# EDINET 大量保有報告書モニター

EDINET APIを活用して大量保有報告書をリアルタイムで監視するWebアプリケーションです。

## 機能

- 📊 **リアルタイム監視**: 30分間隔で自動的に新しい報告書を取得
- 🔍 **詳細情報表示**: CSV解析により発行者名、証券コード、保有割合などを表示
- 👁️ **監視対象設定**: 特定の企業や発行者を監視対象に追加
- 🎯 **絞り込み機能**: 日付範囲、提出者名、報告書種別でフィルタリング
- 📄 **PDFダウンロード**: 報告書PDFを直接ダウンロード可能

## 技術スタック

- **バックエンド**: Node.js, Express
- **データベース**: SQLite (sql.js)
- **フロントエンド**: HTML, CSS, JavaScript (Vanilla)
- **スケジューラー**: node-cron
- **API**: EDINET API v2

## セットアップ

### 前提条件

- Node.js (v14以上)
- npm

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/edinet-monitor.git
cd edinet-monitor

# 依存関係をインストール
npm install
```

### 設定

`config.js`でEDINET APIキーを設定してください：

```javascript
export const config = {
  edinetApiKey: 'YOUR_API_KEY_HERE',
  // ...
};
```

### 起動

```bash
npm start
```

ブラウザで <http://localhost:3000> にアクセスしてください。

## 使い方

### 監視対象の追加

1. 報告書一覧で「〇〇を監視対象とする」ボタンをクリック
2. または詳細情報の発行者名横の👁️ボタンをクリック
3. 監視対象に追加された企業の報告書は紫色で強調表示されます

### 絞り込み

- **日付範囲**: 開始日〜終了日で期間を指定
- **提出者名**: テキスト検索
- **報告書種別**: 大量保有報告書、変更報告書、訂正報告書
- **クリア**: 「✕ 絞り込みをクリア」ボタンで全てのフィルターを解除

### 詳細情報

各報告書の詳細情報（対象銘柄、証券コード、保有割合、変化率など）が自動的に表示されます。

## プロジェクト構造

```
edinet-monitor/
├── config.js           # 設定ファイル
├── server.js           # Expressサーバー
├── services/
│   ├── database.js     # データベース操作
│   ├── edinetClient.js # EDINET API クライアント
│   ├── scheduler.js    # 定期監視スケジューラー
│   └── csvParser.js    # CSV解析
├── public/
│   ├── index.html      # メインHTML
│   ├── css/
│   │   └── style.css   # スタイルシート
│   └── js/
│       └── app.js      # フロントエンドロジック
└── data/
    └── reports.db      # SQLiteデータベース
```

## ライセンス

MIT

## 作者

Created with ❤️ using EDINET API
