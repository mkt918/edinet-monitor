
const EDINETIntegration = require('../js/edinet_integration.js');

// Mock specific parts if needed, but EDINETIntegration is a plain object in the file
// We might need to handle the module export if it's not standard CommonJS (it seems to include module.exports)

const sampleHtml = `
<ix:nonNumeric name="jpcrp_cor:NameMajorShareholders" contextRef="FilingDateInstant">日本マスタートラスト信託銀行㈱（信託口）</ix:nonNumeric>
<ix:nonNumeric name="jpcrp_cor:NameMajorShareholders" contextRef="FilingDateInstant">日本製鉄株式会社</ix:nonNumeric>
<ix:nonNumeric name="jpcrp_cor:NameMajorShareholders" contextRef="FilingDateInstant">三菱電機株式会社</ix:nonNumeric>
<ix:nonNumeric name="jpcrp_cor:NameMajorShareholders" contextRef="FilingDateInstant">株式会社日本カストディ銀行（信託口）</ix:nonNumeric>
<ix:nonNumeric name="jpcrp_cor:NameMajorShareholders" contextRef="FilingDateInstant">トヨタ自動車株式会社</ix:nonNumeric>
`;

async function testLogic() {
    console.log('Testing extractShareholders...');
    const shareholders = EDINETIntegration.extractShareholders(sampleHtml);
    console.log('Extracted:', shareholders);

    // Expected: Master Trust and Custody should be filtered out
    // Should return Nippon Steel, Mitsubishi Electric, Toyota

    if (shareholders.includes('日本製鉄株式会社') &&
        shareholders.includes('三菱電機株式会社') &&
        shareholders.includes('トヨタ自動車株式会社')) {
        console.log('✓ Extraction and Filtering success');
    } else {
        console.error('✗ Extraction failed');
    }

    console.log('\nTesting determineAttribute...');

    const attr1 = EDINETIntegration.determineAttribute(['日本製鉄株式会社']);
    console.log(`['日本製鉄株式会社'] -> ${attr1}`);
    if (attr1 === '日本製鉄系') console.log('✓ Nippon Steel attr success');

    const attr2 = EDINETIntegration.determineAttribute(['ランダム株式会社', '三菱電機株式会社']);
    console.log(`['三菱電機株式会社'] -> ${attr2}`);
    if (attr2 === '三菱電機系') console.log('✓ Mitsubishi Electric attr success');

    const attr3 = EDINETIntegration.determineAttribute(['該当なし']);
    console.log(`['該当なし'] -> ${attr3}`);
    if (attr3 === '') console.log('✓ No attr success');

    console.log('\nTesting getIndustry...');
    // Mock window/App for getIndustry
    global.App = {
        industryData: {
            mapping: {
                'E01255': '鉄鋼'
            }
        }
    };

    const ind = EDINETIntegration.getIndustry('5444', 'E01255');
    console.log(`E01255 -> ${ind}`);
    if (ind === '鉄鋼') console.log('✓ Industry lookup success');
}

testLogic();
