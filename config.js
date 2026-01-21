import dotenv from 'dotenv';
dotenv.config();

// EDINET API設定
export const config = {
  // EDINET API
  edinetApiKey: process.env.EDINET_API_KEY || '43f1d406817e4f3285ad3c3b9202c70b',
  edinetBaseUrl: 'https://disclosure.edinet-fsa.go.jp/api/v2',

  // Supabase設定
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

  // サーバー設定
  port: 3000,

  // 監視設定
  pollIntervalMinutes: 30,

  // 大量保有報告書の府令コード
  ordinanceCode: '060',
  // 開示府令コード（有報、臨時報告書など）
  disclosureOrdinanceCode: '010',

  // 監視対象の資産運用会社（プリセット）
  watchlistPresets: [
    'ブラックロック',
    'バンガード',
    '野村アセットマネジメント',
    '三井住友DSアセットマネジメント',
    'アセットマネジメントOne',
    'オービス',
    'シティインデックスイレブンス',
    'レノ',
    '光通信',
    'エフィッシモ',
    'アクティビスト'
  ]
};
