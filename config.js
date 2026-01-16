// EDINET API設定
export const config = {
  // EDINET API
  edinetApiKey: '43f1d406817e4f3285ad3c3b9202c70b',
  edinetBaseUrl: 'https://disclosure.edinet-fsa.go.jp/api/v2',
  
  // サーバー設定
  port: 3000,
  
  // 監視設定
  pollIntervalMinutes: 30,
  
  // 大量保有報告書の府令コード
  ordinanceCode: '060',
  
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
