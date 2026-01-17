FROM node:18-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションファイルのコピー
COPY . .

# データディレクトリの作成
RUN mkdir -p /app/data

# ポート公開
EXPOSE 3000

# 起動コマンド
CMD ["node", "server.js"]
