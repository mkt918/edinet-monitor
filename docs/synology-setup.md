# DS224j セットアップガイド

このガイドでは、DS224j上でEDINET監視アプリケーションを動かすための手順を説明します。

## 前提条件

- DS224jが正常に動作していること
- DSM(DiskStation Manager)にアクセスできること
- 管理者権限があること

---

## ステップ1: DSMへのログイン

1. Webブラウザを開きます
2. アドレスバーに以下のいずれかを入力:
   - `http://DS224jのIPアドレス:5000`
   - または `http://diskstation:5000`
3. ユーザー名とパスワードを入力してログイン

> **💡 ヒント**: DS224jのIPアドレスが分からない場合は、ルーターの管理画面から確認できます。

---

## ステップ2: Dockerパッケージのインストール

1. DSMのメインメニューから **「パッケージセンター」** を開く
2. 左側のメニューから **「すべてのパッケージ」** を選択
3. 検索ボックスに **「Docker」** と入力
4. **「Container Manager」** (または「Docker」)を見つけてクリック
5. **「インストール」** ボタンをクリック
6. インストールが完了するまで待つ(数分かかります)

> **📝 注意**: DSM 7.0以降では「Docker」が「Container Manager」という名前に変わっています。

---

## ステップ3: 共有フォルダの作成

1. DSMのメインメニューから **「コントロールパネル」** を開く
2. **「共有フォルダ」** をクリック
3. **「作成」** ボタンをクリック
4. 以下の設定で共有フォルダを作成:
   - **名前**: `docker`
   - **説明**: Dockerアプリケーション用
   - **ごみ箱を有効にする**: チェックを外す
5. **「OK」** をクリック

---

## ステップ4: アプリケーションファイルのアップロード

### 方法1: File Stationを使用(推奨)

1. DSMのメインメニューから **「File Station」** を開く
2. 左側のフォルダツリーから **「docker」** フォルダを開く
3. **「作成」** → **「フォルダを作成」** で `edinet-monitor` フォルダを作成
4. `edinet-monitor` フォルダを開く
5. **「アップロード」** ボタンをクリック
6. 以下のファイルとフォルダを選択してアップロード:

   ```
   ├── Dockerfile
   ├── docker-compose.yml
   ├── .dockerignore
   ├── .env
   ├── package.json
   ├── package-lock.json
   ├── server.js
   ├── config.js
   ├── public/ (フォルダごと)
   ├── services/ (フォルダごと)
   └── data/ (空フォルダを作成)
   ```

### 方法2: Windowsのネットワークドライブを使用

1. Windowsエクスプローラーを開く
2. アドレスバーに `\\DS224jのIPアドレス\docker` と入力
3. ユーザー名とパスワードを入力
4. `edinet-monitor` フォルダを作成
5. 必要なファイルをコピー&ペースト

---

## ステップ5: SSHでDS224jに接続(オプション)

コマンドラインでの操作が必要な場合:

1. DSMの **「コントロールパネル」** → **「端末とSNMP」** を開く
2. **「SSHサービスを有効化」** にチェック
3. ポート番号を確認(デフォルト: 22)
4. **「適用」** をクリック

Windowsから接続:

```powershell
ssh 管理者ユーザー名@DS224jのIPアドレス
```

---

## ステップ6: Dockerコンテナの起動

### Container Managerを使用する場合

1. DSMのメインメニューから **「Container Manager」** を開く
2. 左側のメニューから **「プロジェクト」** を選択
3. **「作成」** ボタンをクリック
4. 以下の設定を入力:
   - **プロジェクト名**: `edinet-monitor`
   - **パス**: `/volume1/docker/edinet-monitor`
   - **ソース**: `docker-compose.ymlファイルを使用`
5. **「次へ」** をクリック
6. 設定を確認して **「完了」** をクリック

### SSHを使用する場合

```bash
# edinet-monitorフォルダに移動
cd /volume1/docker/edinet-monitor

# Dockerコンテナをビルド&起動
sudo docker-compose up -d

# 起動状態を確認
sudo docker-compose ps

# ログを確認
sudo docker-compose logs -f edinet-app
```

---

## ステップ7: 動作確認

1. Webブラウザを開く
2. 以下のURLにアクセス:
   - **Nginx Proxy Manager管理画面**: `http://DS224jのIPアドレス:81`
   - **EDINETアプリ(直接アクセス)**: `http://DS224jのIPアドレス:3000`

### Nginx Proxy Managerの初期ログイン情報

- **Email**: `admin@example.com`
- **Password**: `changeme`

> **⚠️ 重要**: 初回ログイン後、必ずパスワードを変更してください!

---

## トラブルシューティング

### コンテナが起動しない場合

```bash
# ログを確認
sudo docker-compose logs

# コンテナを再起動
sudo docker-compose restart

# コンテナを完全に削除して再作成
sudo docker-compose down
sudo docker-compose up -d
```

### ポートが使用中のエラー

他のアプリケーションがポート80, 443, 81を使用している可能性があります。
DSMの **「コントロールパネル」** → **「ログインポータル」** で、
ポート80/443の使用を無効化してください。

### データベースエラー

```bash
# dataフォルダの権限を確認
sudo chmod -R 777 /volume1/docker/edinet-monitor/data
```

---

## 次のステップ

セットアップが完了したら、次のガイドに進んでください:

1. [ネットワーク設定ガイド](./network-setup.md) - ポートフォワーディングとDDNS設定
2. [SSL証明書とドメイン設定ガイド](./ssl-domain-setup.md) - HTTPS化
3. [アクセス制限設定ガイド](./access-control.md) - セキュリティ設定
