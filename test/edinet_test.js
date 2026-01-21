/**
 * EDINET APIテストスクリプト
 * 有名企業5社の有価証券報告書を取得し、XBRLデータを解析する
 */

// EDINET API設定
const EDINET_API_KEY = '43f1d406817e4f3285ad3c3b9202c70b';
const EDINET_BASE_URL = 'https://disclosure.edinet-fsa.go.jp/api/v1';

// テスト対象企業
const TEST_COMPANIES = [
    { code: '7203', name: 'トヨタ自動車', edinetCode: 'E02144' },
    { code: '6758', name: 'ソニーグループ', edinetCode: 'E02463' },
    { code: '9984', name: 'ソフトバンクグループ', edinetCode: 'E04425' },
    { code: '6861', name: 'キーエンス', edinetCode: 'E01967' },
    { code: '9983', name: 'ファーストリテイリング', edinetCode: 'E03412' }
];

/**
 * 書類一覧を取得
 * @param {string} date - 取得日(YYYY-MM-DD形式)
 * @returns {Promise<Object>} 書類一覧
 */
async function getDocumentList(date) {
    const url = `${EDINET_BASE_URL}/documents.json?date=${date}&type=2&Subscription-Key=${EDINET_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('書類一覧取得エラー:', error);
        throw error;
    }
}

/**
 * 特定企業の最新有価証券報告書を検索
 * @param {string} edinetCode - EDINETコード
 * @param {number} daysBack - 何日前まで遡るか
 * @returns {Promise<Object|null>} 書類情報
 */
async function findLatestSecuritiesReport(edinetCode, daysBack = 365) {
    const today = new Date();

    for (let i = 0; i < daysBack; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);
        const dateStr = targetDate.toISOString().split('T')[0];

        console.log(`${dateStr}の書類を検索中...`);

        try {
            const docList = await getDocumentList(dateStr);

            if (!docList.results) continue;

            // 有価証券報告書(docTypeCode: 120)を検索
            const report = docList.results.find(doc =>
                doc.edinetCode === edinetCode &&
                doc.docTypeCode === '120' &&
                doc.docDescription.includes('有価証券報告書')
            );

            if (report) {
                console.log(`✓ 発見: ${report.docDescription} (${dateStr})`);
                return report;
            }
        } catch (error) {
            console.error(`${dateStr}の取得エラー:`, error);
        }

        // APIレート制限対策(1秒待機)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return null;
}

/**
 * XBRLファイルをダウンロード
 * @param {string} docId - 書類ID
 * @returns {Promise<Blob>} ZIPファイル
 */
async function downloadXBRL(docId) {
    const url = `${EDINET_BASE_URL}/documents/${docId}?type=1&Subscription-Key=${EDINET_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error('XBRLダウンロードエラー:', error);
        throw error;
    }
}

/**
 * メイン処理
 */
async function main() {
    console.log('=== EDINET API テスト開始 ===\n');

    for (const company of TEST_COMPANIES) {
        console.log(`\n【${company.name} (${company.code})】`);
        console.log(`EDINETコード: ${company.edinetCode}`);

        try {
            // 最新の有価証券報告書を検索
            const report = await findLatestSecuritiesReport(company.edinetCode);

            if (report) {
                console.log(`書類ID: ${report.docID}`);
                console.log(`提出日: ${report.submitDateTime}`);
                console.log(`会計期間: ${report.periodStart} 〜 ${report.periodEnd}`);

                // XBRLダウンロード(テストのため最初の1社のみ)
                if (company === TEST_COMPANIES[0]) {
                    console.log('\nXBRLファイルをダウンロード中...');
                    const xbrlBlob = await downloadXBRL(report.docID);
                    console.log(`✓ ダウンロード完了: ${(xbrlBlob.size / 1024 / 1024).toFixed(2)} MB`);

                    // TODO: ZIPを解凍してXBRLを解析
                }
            } else {
                console.log('⚠ 有価証券報告書が見つかりませんでした');
            }
        } catch (error) {
            console.error(`✗ エラー: ${error.message}`);
        }

        console.log('---');
    }

    console.log('\n=== テスト完了 ===');
}

// ブラウザ環境で実行
if (typeof window !== 'undefined') {
    window.EDINETTest = { main, getDocumentList, findLatestSecuritiesReport, downloadXBRL };
}

// Node.js環境で実行
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { main, getDocumentList, findLatestSecuritiesReport, downloadXBRL };
}
