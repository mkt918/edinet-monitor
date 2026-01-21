# クイックスタートガイド

DS224jでEDINET監視アプリケーションを公開するための簡易手順です。

## 📋 準備するもの

- DS224j NAS
- インターネット接続
- ルーターの管理者権限
- (オプション) 独自ドメイン

## 🚀 5ステップでデプロイ

### ステップ1: ファイルをDS224jにアップロード

1. DSMにログイン → File Stationを開く
2. `docker` フォルダを作成
3. `edinet-monitor` フォルダを作成
4. 以下のファイルをアップロード:
   - `Dockerfile`
   - `docker-compose.yml`
   - `.env`
   - `package.json`
   - `server.js`
   - `config.js`
   - `public/` フォルダ
   - `services/` フォルダ

### ステップ2: Container Managerでプロジェクト作成

1. Container Managerを開く
2. 「プロジェクト」→「作成」
3. プロジェクト名: `edinet-monitor`
4. パス: `/volume1/docker/edinet-monitor`
5. 「完了」をクリック

### ステップ3: ルーターでポートフォワーディング

ルーターの管理画面で以下を設定:

- ポート80 → DS224jのIPアドレス:80
- ポート443 → DS224jのIPアドレス:443
- ポート81 → DS224jのIPアドレス:81

### ステップ4: DDNS設定

1. DSM → コントロールパネル → 外部アクセス → DDNS
2. Synology DDNSを選択
3. ホスト名を入力(例: `myedinet`)
4. 完了!(`myedinet.synology.me` でアクセス可能)

### ステップ5: SSL証明書の取得

1. `http://DS224jのIP:81` にアクセス
2. 初期ログイン: `admin@example.com` / `changeme`
3. Proxy Hostsを追加:
   - Domain: `myedinet.synology.me`
   - Forward to: `edinet-app:3000`
   - SSL: Let's Encryptで自動取得

## ✅ 完了

`https://myedinet.synology.me` でアクセスできます!

---

## 📚 詳細ガイド

より詳しい手順は以下のドキュメントを参照してください:

1. [DS224jセットアップガイド](./docs/synology-setup.md)
2. [ネットワーク設定ガイド](./docs/network-setup.md)
3. [SSL証明書とドメイン設定ガイド](./docs/ssl-domain-setup.md)
4. [アクセス制限設定ガイド](./docs/access-control.md)

## 🆘 トラブルシューティング

問題が発生した場合は、各ガイドの「トラブルシューティング」セクションを参照してください。
