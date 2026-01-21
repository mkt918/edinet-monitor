/**
 * EDINET APIテストスクリプト (Node.js版)
 * CORSエラーを回避するため、Node.js環境で実行
 */

// EDINET API設定
const EDINET_API_KEY = '43f1d406817e4f3285ad3c3b9202c70b';
const EDINET_BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';

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
    // APIキーはクエリパラメータとして渡す
    const url = `${EDINET_BASE_URL}/documents.json?date=${date}&type=2&Subscription-Key=${EDINET_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            // 403エラーは休日や未来の日付の可能性が高いのでスキップ
            if (response.status === 403) {
                return { results: [] };
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        if (error.message.includes('403')) {
            return { results: [] };
        }
        console.error('書類一覧取得エラー:', error.message);
        throw error;
    }
}

/**
 * 営業日かどうかを簡易判定(土日を除外)
 * @param {Date} date - 判定する日付
 * @returns {boolean} 営業日ならtrue
 */
function isBusinessDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6; // 日曜(0)と土曜(6)を除外
}

/**
 * 特定企業の最新有価証券報告書を検索
 * @param {string} edinetCode - EDINETコード
 * @param {number} daysBack - 何日前まで遡るか
 * @returns {Promise<Object|null>} 書類情報
 */
async function findLatestSecuritiesReport(edinetCode, daysBack = 365) {
    const today = new Date();
    let checkedDays = 0;

    for (let i = 0; checkedDays < daysBack; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - i);

        // 営業日のみチェック(土日をスキップ)
        if (!isBusinessDay(targetDate)) {
            continue;
        }

        checkedDays++;
        const dateStr = targetDate.toISOString().split('T')[0];

        // 10日ごとに進捗表示
        if (checkedDays % 10 === 0) {
            console.log(`  ${checkedDays}営業日分検索済み...`);
        }

        try {
            const docList = await getDocumentList(dateStr);

            if (!docList.results || docList.results.length === 0) continue;

            // 有価証券報告書(docTypeCode: 120)を検索
            const report = docList.results.find(doc =>
                doc.edinetCode === edinetCode &&
                doc.docTypeCode === '120' &&
                doc.docDescription.includes('有価証券報告書')
            );

            if (report) {
                console.log(`  ✓ 発見: ${report.docDescription} (${dateStr})`);
                return report;
            }
        } catch (error) {
            console.error(`  ${dateStr}の取得エラー:`, error.message);
        }

        // APIレート制限対策(0.5秒待機)
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return null;
}

/**
 * XBRLファイルをダウンロード
 * @param {string} docId - 書類ID
 * @returns {Promise<Buffer>} ZIPファイル
 */
async function downloadXBRL(docId) {
    const url = `${EDINET_BASE_URL}/documents/${docId}?type=1&Subscription-Key=${EDINET_API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
    } catch (error) {
        console.error('XBRLダウンロードエラー:', error.message);
        throw error;
    }
}

/**
 * メイン処理
 */
async function main() {
    console.log('=== EDINET API テスト開始 ===\n');

    const results = [];

    for (const company of TEST_COMPANIES) {
        console.log(`\n【${company.name} (${company.code})】`);
        console.log(`EDINETコード: ${company.edinetCode}`);

        try {
            // 最新の有価証券報告書を検索(過去180営業日分)
            const report = await findLatestSecuritiesReport(company.edinetCode, 180);

            if (report) {
                const result = {
                    company: company.name,
                    code: company.code,
                    edinetCode: company.edinetCode,
                    docID: report.docID,
                    submitDate: report.submitDateTime,
                    periodStart: report.periodStart,
                    periodEnd: report.periodEnd,
                    docDescription: report.docDescription
                };

                console.log(`  書類ID: ${report.docID}`);
                console.log(`  提出日: ${report.submitDateTime}`);
                console.log(`  会計期間: ${report.periodStart} 〜 ${report.periodEnd}`);

                results.push(result);
            } else {
                console.log('  ⚠ 有価証券報告書が見つかりませんでした');
                results.push({
                    company: company.name,
                    code: company.code,
                    edinetCode: company.edinetCode,
                    error: '書類が見つかりませんでした'
                });
            }
        } catch (error) {
            console.error(`  ✗ エラー: ${error.message}`);
            results.push({
                company: company.name,
                code: company.code,
                edinetCode: company.edinetCode,
                error: error.message
            });
        }

        console.log('---');
    }

    console.log('\n=== テスト完了 ===');
    console.log('\n取得結果サマリー:');
    console.log(JSON.stringify(results, null, 2));

    return results;
}

// メイン処理を実行
main().catch(console.error);
