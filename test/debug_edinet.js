/**
 * EDINET API デバッグスクリプト
 * 特定の日付の書類一覧を取得して内容を確認
 */

const EDINET_API_KEY = '43f1d406817e4f3285ad3c3b9202c70b';
const EDINET_BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';

async function debugDocumentList() {
    // 2024年6月27日(木曜日)
    const testDate = '2024-06-27';
    const url = `${EDINET_BASE_URL}/documents.json?date=${testDate}&type=2&Subscription-Key=${EDINET_API_KEY}`;

    console.log(`${testDate}の書類一覧を取得中...`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        console.log(`\n取得件数: ${data.results.length}件\n`);

        // 有価証券報告書のみ抽出
        const securitiesReports = data.results.filter(doc =>
            doc.docTypeCode === '120'
        );

        console.log(`有価証券報告書: ${securitiesReports.length}件\n`);

        // トヨタ、ソニー、ソフトバンクGなどを検索
        const targetCompanies = ['トヨタ', 'ソニー', 'ソフトバンク', 'キーエンス', 'ファーストリテイリング', 'ユニクロ'];

        console.log('=== 対象企業の検索 ===');
        targetCompanies.forEach(keyword => {
            const found = securitiesReports.filter(doc =>
                doc.filerName.includes(keyword) || doc.docDescription.includes(keyword)
            );

            if (found.length > 0) {
                console.log(`\n【${keyword}】`);
                found.forEach(doc => {
                    console.log(`  企業名: ${doc.filerName}`);
                    console.log(`  EDINETコード: ${doc.edinetCode}`);
                    console.log(`  書類: ${doc.docDescription}`);
                    console.log(`  書類ID: ${doc.docID}`);
                    console.log(`  期間: ${doc.periodStart} 〜 ${doc.periodEnd}`);
                    console.log('  ---');
                });
            }
        });

        // 全有価証券報告書の最初の10件を表示
        console.log('\n=== 有価証券報告書サンプル(最初の10件) ===');
        securitiesReports.slice(0, 10).forEach((doc, index) => {
            console.log(`\n${index + 1}. ${doc.filerName}`);
            console.log(`   EDINETコード: ${doc.edinetCode}`);
            console.log(`   ${doc.docDescription}`);
        });

    } catch (error) {
        console.error('エラー:', error.message);
    }
}

debugDocumentList().catch(console.error);
