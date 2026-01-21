/**
 * XBRLダウンロードテストスクリプト
 * トヨタ自動車のXBRLファイルをダウンロードして構造を確認
 */

const EDINET_API_KEY = '43f1d406817e4f3285ad3c3b9202c70b';
const EDINET_BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';
const fs = require('fs');
const path = require('path');

/**
 * XBRLファイルをダウンロード
 * @param {string} docId - 書類ID
 * @returns {Promise<Buffer>} ZIPファイル
 */
async function downloadXBRL(docId) {
    const url = `${EDINET_BASE_URL}/documents/${docId}?type=1&Subscription-Key=${EDINET_API_KEY}`;

    console.log(`XBRLファイルをダウンロード中: ${docId}`);

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
    console.log('=== XBRL ダウンロードテスト ===\n');

    // トヨタ自動車の書類ID
    const toyotaDocId = 'S100VWVY';

    try {
        // XBRLダウンロード
        const xbrlBuffer = await downloadXBRL(toyotaDocId);

        console.log(`✓ ダウンロード完了: ${(xbrlBuffer.length / 1024 / 1024).toFixed(2)} MB`);

        // ファイルに保存
        const outputDir = path.join(__dirname, '../data/xbrl');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, `${toyotaDocId}.zip`);
        fs.writeFileSync(outputPath, xbrlBuffer);

        console.log(`✓ 保存完了: ${outputPath}`);
        console.log('\n次のステップ:');
        console.log('1. ZIPファイルを手動で解凍');
        console.log('2. 含まれているファイルの種類を確認');
        console.log('3. CSVファイルまたはXBRLファイルの構造を分析');

    } catch (error) {
        console.error(`✗ エラー: ${error.message}`);
    }
}

main().catch(console.error);
