/**
 * iXBRL 財務諸表解析スクリプト
 * 財務諸表HTMLファイルから主要データを抽出
 */

const fs = require('fs');
const path = require('path');

async function extractFinancialData() {
    console.log('=== 財務データ抽出 ===\n');

    const extractPath = path.join(__dirname, '../data/xbrl/S100VWVY');
    const publicDocPath = path.join(extractPath, 'XBRL/PublicDoc');

    // 財務諸表セクションのファイル(0105で始まる)を探す
    const files = fs.readdirSync(publicDocPath);
    const financialFiles = files.filter(f => f.startsWith('0105') && f.includes('ixbrl.htm'));

    console.log('=== 財務諸表ファイル ===');
    financialFiles.forEach(f => console.log(`- ${f}`));

    // 各ファイルを解析
    const financialData = {
        revenue: [],
        operatingIncome: [],
        netIncome: [],
        totalAssets: [],
        netAssets: [],
        years: []
    };

    for (const file of financialFiles) {
        const filePath = path.join(publicDocPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        console.log(`\n=== ${file} ===`);
        console.log(`サイズ: ${(content.length / 1024).toFixed(2)} KB`);

        // iXBRLタグから数値データを抽出
        const extractValues = (tagPattern) => {
            const regex = new RegExp(`<ix:nonFraction[^>]*name="${tagPattern}"[^>]*>([^<]+)</ix:nonFraction>`, 'gi');
            const matches = content.matchAll(regex);
            const values = [];
            for (const match of matches) {
                const value = match[1].replace(/,/g, '').trim();
                if (value && !isNaN(value)) {
                    values.push(parseInt(value));
                }
            }
            return values;
        };

        // 主要な財務指標を抽出
        const revenue = extractValues('[^"]*NetSales[^"]*');
        const opIncome = extractValues('[^"]*OperatingIncome[^"]*');
        const netInc = extractValues('[^"]*(?:ProfitLoss|NetIncome)[^"]*');
        const assets = extractValues('[^"]*TotalAssets[^"]*');
        const equity = extractValues('[^"]*(?:NetAssets|TotalNetAssets)[^"]*');

        if (revenue.length > 0) {
            console.log(`売上高: ${revenue.length}件`);
            revenue.slice(0, 3).forEach((v, i) => console.log(`  ${i + 1}: ${v.toLocaleString()} 百万円`));
        }

        if (opIncome.length > 0) {
            console.log(`営業利益: ${opIncome.length}件`);
            opIncome.slice(0, 3).forEach((v, i) => console.log(`  ${i + 1}: ${v.toLocaleString()} 百万円`));
        }

        if (netInc.length > 0) {
            console.log(`当期純利益: ${netInc.length}件`);
            netInc.slice(0, 3).forEach((v, i) => console.log(`  ${i + 1}: ${v.toLocaleString()} 百万円`));
        }

        if (assets.length > 0) {
            console.log(`総資産: ${assets.length}件`);
            assets.slice(0, 3).forEach((v, i) => console.log(`  ${i + 1}: ${v.toLocaleString()} 百万円`));
        }

        if (equity.length > 0) {
            console.log(`純資産: ${equity.length}件`);
            equity.slice(0, 3).forEach((v, i) => console.log(`  ${i + 1}: ${v.toLocaleString()} 百万円`));
        }

        // データを保存
        if (revenue.length > 0) financialData.revenue.push(...revenue);
        if (opIncome.length > 0) financialData.operatingIncome.push(...opIncome);
        if (netInc.length > 0) financialData.netIncome.push(...netInc);
        if (assets.length > 0) financialData.totalAssets.push(...assets);
        if (equity.length > 0) financialData.netAssets.push(...equity);
    }

    // 結果をまとめて表示
    console.log('\n\n=== 抽出データサマリー ===');
    console.log(`売上高: ${financialData.revenue.length}件`);
    console.log(`営業利益: ${financialData.operatingIncome.length}件`);
    console.log(`当期純利益: ${financialData.netIncome.length}件`);
    console.log(`総資産: ${financialData.totalAssets.length}件`);
    console.log(`純資産: ${financialData.netAssets.length}件`);

    // JSONファイルに保存
    const outputPath = path.join(extractPath, 'extracted_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(financialData, null, 2));
    console.log(`\n✓ データを保存: ${outputPath}`);
}

extractFinancialData().catch(console.error);
