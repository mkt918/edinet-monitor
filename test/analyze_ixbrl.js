/**
 * iXBRL HTML解析スクリプト
 * HTMLファイルから財務データを抽出
 */

const fs = require('fs');
const path = require('path');

async function analyzeIXBRL() {
    console.log('=== iXBRL HTML 解析 ===\n');

    const extractPath = path.join(__dirname, '../data/xbrl/S100VWVY');

    // 損益計算書のHTMLファイルを探す
    const publicDocPath = path.join(extractPath, 'XBRL/PublicDoc');
    const files = fs.readdirSync(publicDocPath);

    // 損益計算書(P/L)と貸借対照表(B/S)のファイルを探す
    const plFile = files.find(f => f.includes('jpcrp040300') && f.includes('ixbrl.htm'));
    const bsFile = files.find(f => f.includes('jpcrp040200') && f.includes('ixbrl.htm'));

    console.log('損益計算書ファイル:', plFile || '見つかりません');
    console.log('貸借対照表ファイル:', bsFile || '見つかりません');

    // メインの有価証券報告書HTMLを探す
    const mainFiles = files.filter(f => f.includes('ixbrl.htm'));
    console.log('\n=== iXBRL HTMLファイル一覧 ===');
    mainFiles.forEach(f => {
        console.log(`- ${f}`);
    });

    // 最初のHTMLファイルの内容を確認
    if (mainFiles.length > 0) {
        const firstFile = mainFiles[0];
        const filePath = path.join(publicDocPath, firstFile);
        const content = fs.readFileSync(filePath, 'utf-8');

        console.log(`\n=== ${firstFile} の構造分析 ===`);
        console.log(`ファイルサイズ: ${(content.length / 1024).toFixed(2)} KB`);

        // XBRLタグを探す
        const xbrlTags = content.match(/<ix:[^>]+>/g) || [];
        console.log(`\niXBRLタグ数: ${xbrlTags.length}`);

        // 売上高を探す
        const revenueMatches = content.match(/<ix:nonFraction[^>]*name="[^"]*NetSales[^"]*"[^>]*>([^<]+)<\/ix:nonFraction>/gi);
        if (revenueMatches) {
            console.log('\n=== 売上高データ ===');
            revenueMatches.slice(0, 5).forEach((match, i) => {
                console.log(`${i + 1}: ${match.substring(0, 200)}`);
            });
        }

        // 営業利益を探す
        const opIncomeMatches = content.match(/<ix:nonFraction[^>]*name="[^"]*OperatingIncome[^"]*"[^>]*>([^<]+)<\/ix:nonFraction>/gi);
        if (opIncomeMatches) {
            console.log('\n=== 営業利益データ ===');
            opIncomeMatches.slice(0, 5).forEach((match, i) => {
                console.log(`${i + 1}: ${match.substring(0, 200)}`);
            });
        }

        // すべてのiXBRLタグの名前を抽出
        const tagNames = new Set();
        const nameMatches = content.matchAll(/name="([^"]+)"/g);
        for (const match of nameMatches) {
            tagNames.add(match[1]);
        }

        console.log(`\n=== iXBRLタグ名の種類: ${tagNames.size}件 ===`);
        const sortedTags = Array.from(tagNames).sort();

        // 財務関連のタグを抽出
        const financialTags = sortedTags.filter(tag =>
            tag.includes('Sales') ||
            tag.includes('Income') ||
            tag.includes('Assets') ||
            tag.includes('Liabilities') ||
            tag.includes('Equity') ||
            tag.includes('Dividend')
        );

        console.log('\n=== 財務関連タグ(一部) ===');
        financialTags.slice(0, 30).forEach(tag => {
            console.log(`- ${tag}`);
        });
    }
}

analyzeIXBRL().catch(console.error);
