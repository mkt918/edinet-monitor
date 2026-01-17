# SSL証明書とドメイン設定ガイド

このガイドでは、Nginx Proxy Managerを使ってHTTPS(安全な通信)を有効化し、ドメイン名でアクセスできるようにする方法を説明します。

---

## 前提条件

- [ネットワーク設定ガイド](./network-setup.md)が完了していること
- DDNSまたは独自ドメインが設定済みであること
- 外部からNginx Proxy Manager管理画面にアクセスできること

---

## ステップ1: Nginx Proxy Manager管理画面にアクセス

1. Webブラウザを開く
2. 以下のいずれかのURLにアクセス:
   - 内部ネットワークから: `http://DS224jのIPアドレス:81`
   - 外部ネットワークから: `http://DDNSドメイン:81`

### 初回ログイン

- **Email**: `admin@example.com`
- **Password**: `changeme`

### パスワード変更(初回ログイン時)

1. ログイン後、自動的にパスワード変更画面が表示されます
2. 以下を入力:
   - **Name**: 任意の名前(例: 管理者)
   - **Email**: 新しいメールアドレス(実際に使用するもの)
   - **Password**: 新しいパスワード(強力なものを設定)
3. **「Save」** をクリック

---

## ステップ2: プロキシホストの追加(EDINET監視アプリ)

### 基本設定

1. Nginx Proxy Managerのダッシュボードで **「Proxy Hosts」** タブをクリック
2. **「Add Proxy Host」** ボタンをクリック
3. **「Details」** タブで以下を入力:

   - **Domain Names**: DDNSドメイン名を入力(例: `myedinet.synology.me`)
     - 複数のドメインを追加する場合は、Enterキーで追加
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `edinet-app` (Dockerコンテナ名)
   - **Forward Port**: `3000`
   - **Cache Assets**: チェックを入れる(推奨)
   - **Block Common Exploits**: チェックを入れる(推奨)
   - **Websockets Support**: チェックを入れる(推奨)

4. まだ **「Save」** はクリックしないでください!

### SSL証明書の設定

1. **「SSL」** タブをクリック
2. 以下を設定:
   - **SSL Certificate**: `Request a new SSL Certificate` を選択
   - **Force SSL**: チェックを入れる(HTTPSを強制)
   - **HTTP/2 Support**: チェックを入れる(推奨)
   - **HSTS Enabled**: チェックを入れる(推奨)
   - **Email Address for Let's Encrypt**: 有効なメールアドレスを入力
   - **I Agree to the Let's Encrypt Terms of Service**: チェックを入れる

3. **「Save」** ボタンをクリック

### SSL証明書の取得プロセス

- 数秒〜数分で自動的にSSL証明書が取得されます
- ステータスが **「Online」** になれば成功です
- 証明書は90日ごとに自動更新されます

---

## ステップ3: 動作確認

1. Webブラウザで `https://DDNSドメイン名` にアクセス(例: `https://myedinet.synology.me`)
2. EDINET監視アプリが表示されることを確認
3. ブラウザのアドレスバーに **鍵マーク🔒** が表示されることを確認

> **✅ 成功!** これで安全にアクセスできるようになりました!

---

## ステップ4: 将来のサイトを追加する方法

複数のWebサイトを運用する場合の手順です。

### 例: レシピサイトを追加する場合

#### 1. docker-compose.ymlに新しいサービスを追加

```yaml
  # レシピサイト
  recipe-app:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./recipe-site:/usr/share/nginx/html:ro
    networks:
      - web-network
    expose:
      - "80"
```

#### 2. Dockerコンテナを再起動

```bash
cd /volume1/docker/edinet-monitor
sudo docker-compose up -d
```

#### 3. サブドメインを追加(オプション)

Synology DDNSで複数のサブドメインを作成:

- `edinet.synology.me` → EDINET監視アプリ
- `recipe.synology.me` → レシピサイト

または、独自ドメインのDNS設定でサブドメインを追加:

- `edinet.example.com`
- `recipe.example.com`

#### 4. Nginx Proxy Managerで新しいプロキシホストを追加

1. **「Add Proxy Host」** をクリック
2. **Details** タブ:
   - **Domain Names**: `recipe.synology.me` (または `recipe.example.com`)
   - **Forward Hostname / IP**: `recipe-app`
   - **Forward Port**: `80`
3. **SSL** タブ:
   - **Request a new SSL Certificate** を選択
   - 必要な項目にチェック
4. **「Save」** をクリック

これで `https://recipe.synology.me` でレシピサイトにアクセスできます!

---

## ステップ5: 管理画面のセキュリティ強化(推奨)

### 方法1: ポート81を内部ネットワークのみに制限

ルーターのポートフォワーディング設定で、ポート81のルールを削除します。
これにより、外部からは管理画面にアクセスできなくなります。

### 方法2: 管理画面にもプロキシホストを設定

1. **「Add Proxy Host」** をクリック
2. **Details** タブ:
   - **Domain Names**: `npm-admin.synology.me` (管理用サブドメイン)
   - **Forward Hostname / IP**: `nginx-proxy-manager`
   - **Forward Port**: `81`
3. **SSL** タブ:
   - SSL証明書を取得
4. **Access List** タブ:
   - Basic認証を設定(後述)

---

## ステップ6: カスタムドメインの設定(オプション)

独自ドメインを取得した場合の設定方法です。

### ドメインの取得

おすすめのドメインレジストラ:

- **お名前.com**: <https://www.onamae.com/>
- **ムームードメイン**: <https://muumuu-domain.com/>
- **Cloudflare**: <https://www.cloudflare.com/> (DNS管理も含む)

### DNS設定

1. ドメインレジストラの管理画面にログイン
2. DNS設定を開く
3. Aレコードを追加:
   - **ホスト名**: `@` (ルートドメイン) または `edinet` (サブドメイン)
   - **タイプ**: `A`
   - **値**: 外部IPアドレス(固定IPの場合)
   - **TTL**: `3600` (1時間)

動的IPの場合は、DDNSサービスと連携するか、Cloudflareなどを使用します。

### Nginx Proxy Managerでドメインを追加

1. 既存のプロキシホストを編集
2. **Domain Names** に独自ドメインを追加(例: `edinet.example.com`)
3. **SSL** タブで新しい証明書を取得
4. **「Save」** をクリック

---

## トラブルシューティング

### SSL証明書の取得に失敗する

**原因1: ドメインが正しく設定されていない**

- DNS設定を確認
- `nslookup ドメイン名` コマンドで、正しいIPアドレスが返ってくるか確認

**原因2: ポート80/443が開いていない**

- ルーターのポートフォワーディング設定を確認
- ファイアウォール設定を確認

**原因3: Let's Encryptのレート制限**

- 同じドメインで1週間に5回以上失敗すると、一時的にブロックされます
- 数時間〜1日待ってから再試行

### 証明書の自動更新が失敗する

1. Nginx Proxy Managerのログを確認:

   ```bash
   sudo docker-compose logs nginx-proxy-manager
   ```

2. 手動で更新を試みる:
   - **「SSL Certificates」** タブを開く
   - 該当の証明書の **「...」** メニューから **「Renew」** をクリック

### サイトにアクセスできない

1. **プロキシホストの設定を確認**
   - Forward Hostname / IPが正しいか
   - Forward Portが正しいか

2. **バックエンドコンテナが起動しているか確認**

   ```bash
   sudo docker-compose ps
   ```

3. **ログを確認**

   ```bash
   sudo docker-compose logs edinet-app
   ```

---

## 次のステップ

SSL証明書の設定が完了したら、次のガイドに進んでください:

1. [アクセス制限設定ガイド](./access-control.md) - 自分と知人だけがアクセスできるように設定
