/**
 * EDINET統合モジュール
 * XBRLデータをダウンロードして既存ダッシュボードに統合
 */

const EDINET_API_KEY = '43f1d406817e4f3285ad3c3b9202c70b';
const EDINET_BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';

const EDINETIntegration = {
    /**
     * 企業コードから最新の有価証券報告書を検索
     * @param {string} edinetCode - EDINETコード
     * @returns {Promise<Object|null>} 書類情報
     */
    async findLatestReport(edinetCode) {
        const today = new Date();

        for (let i = 0; i < 365; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - i);

            // 土日をスキップ
            if (targetDate.getDay() === 0 || targetDate.getDay() === 6) continue;

            const dateStr = targetDate.toISOString().split('T')[0];

            try {
                const url = `${EDINET_BASE_URL}/documents.json?date=${dateStr}&type=2&Subscription-Key=${EDINET_API_KEY}`;
                const response = await fetch(url);

                if (!response.ok) continue;

                const data = await response.json();
                if (!data.results) continue;

                const report = data.results.find(doc =>
                    doc.edinetCode === edinetCode &&
                    doc.docTypeCode === '120'
                );

                if (report) {
                    return report;
                }
            } catch (error) {
                console.error(`${dateStr}の取得エラー:`, error.message);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return null;
    },

    /**
     * XBRLファイルをダウンロード
     * @param {string} docId - 書類ID
     * @returns {Promise<Blob>} ZIPファイル
     */
    async downloadXBRL(docId) {
        const url = `${EDINET_BASE_URL}/documents/${docId}?type=1&Subscription-Key=${EDINET_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.blob();
    },

    /**
     * iXBRL HTMLから財務データを抽出
     * @param {string} htmlContent - HTML内容
     * @returns {Object} 財務データ
     */
    extractFinancialData(htmlContent) {
        const extractValues = (tagPattern) => {
            const regex = new RegExp(`<ix:nonFraction[^>]*name="${tagPattern}"[^>]*>([^<]+)</ix:nonFraction>`, 'gi');
            const matches = htmlContent.matchAll(regex);
            const values = [];
            for (const match of matches) {
                const value = match[1].replace(/,/g, '').trim();
                if (value && !isNaN(value)) {
                    values.push(parseInt(value));
                }
            }
            return values;
        };

        return {
            revenue: extractValues('[^"]*NetSales[^"]*'),
            operatingIncome: extractValues('[^"]*OperatingIncome[^"]*'),
            netIncome: extractValues('[^"]*(?:ProfitLoss|NetIncome)[^"]*'),
            totalAssets: extractValues('[^"]*TotalAssets[^"]*'),
            netAssets: extractValues('[^"]*(?:NetAssets|TotalNetAssets)[^"]*'),
            dividendPerShare: extractValues('[^"]*DividendPaidPerShare[^"]*'),
            htmlContent: htmlContent // 後で株主抽出に使うため保持
        };
    },

    /**
     * 大株主データを抽出
     * @param {string} htmlContent - HTML内容
     * @returns {Array} 大株主リスト
     */
    extractShareholders(htmlContent) {
        // 大株主名のタグパターン (jpcrp_cor:NameMajorShareholders)
        const regex = /<ix:nonNumeric[^>]*name="[^"]*NameMajorShareholders[^"]*"[^>]*>([^<]+)<\/ix:nonNumeric>/gi;
        const matches = [...htmlContent.matchAll(regex)];

        const keywordsToExclude = [
            '信託', 'カストディ', '自社株', '持株会', 'GOVERNMENT', 'Custody', 'Trust'
        ];

        return matches
            .map(m => m[1].trim())
            .filter(name => {
                // 除外キーワードが含まれていないかチェック
                return !keywordsToExclude.some(keyword => name.includes(keyword));
            })
            .slice(0, 3); // Top 3
    },

    /**
     * 株主から属性（系列）を判定
     * @param {Array} shareholders - 大株主リスト
     * @returns {string} 属性（系列）
     */
    determineAttribute(shareholders) {
        if (!shareholders || shareholders.length === 0) return '';

        const rules = [
            { keyword: '日本製鉄', attribute: '日本製鉄系' },
            { keyword: '三菱電機', attribute: '三菱電機系' },
            { keyword: 'トヨタ', attribute: 'トヨタ系' },
            { keyword: 'ソフトバンク', attribute: 'ソフトバンク系' },
            { keyword: '日立', attribute: '日立系' },
            { keyword: '東芝', attribute: '東芝系' },
            { keyword: '伊藤忠', attribute: '伊藤忠系' },
            { keyword: '三菱商事', attribute: '三菱商事系' }
        ];

        for (const rule of rules) {
            if (shareholders.some(s => s.includes(rule.keyword))) {
                return rule.attribute;
            }
        }

        return '';
    },

    /**
     * companies.json形式に変換
     * @param {Object} edinetData - EDINETデータ
     * @param {Object} report - 書類情報
     * @returns {Object} companies.json形式のデータ
     */
    convertToCompanyFormat(edinetData, report) {
        // 最新の値を取得(重複を除去)
        const getLatest = (arr) => arr.length > 0 ? arr[0] : 0;

        return {
            code: report.secCode || '',
            name: report.filerName,
            industry: this.getIndustry(report.secCode, report.edinetCode),
            shareholders: this.extractShareholders(edinetData.htmlContent),
            attribute: this.determineAttribute(this.extractShareholders(edinetData.htmlContent)),
            fiscalYearEnd: report.periodEnd ? new Date(report.periodEnd).getMonth() + 1 + '月' : '',
            stockPrice: null,  // 別途取得が必要
            sharesOutstanding: null,  // XBRLから取得が必要
            financials: {
                years: [report.periodEnd ? report.periodEnd.substring(0, 4) : ''],
                revenue: [getLatest(edinetData.revenue)],
                operatingIncome: [getLatest(edinetData.operatingIncome)],
                netIncome: [getLatest(edinetData.netIncome)],
                totalAssets: [getLatest(edinetData.totalAssets)],
                netAssets: [getLatest(edinetData.netAssets)],
                dividendPerShare: [getLatest(edinetData.dividendPerShare)]
            },
            balanceSheet: {
                currentAssets: 0,  // XBRLから取得が必要
                investmentSecurities: 0,
                currentLiabilities: 0,
                fixedLiabilities: 0
            },
            source: 'EDINET',
            docId: report.docID,
            submitDate: report.submitDateTime
        };
    },

    /**
     * 業種を取得
     * @param {string} secCode - 証券コード
     * @param {string} edinetCode - EDINETコード
     * @returns {string} 業種名
     */
    getIndustry(secCode, edinetCode) {
        // App.industryData がある前提
        if (typeof App !== 'undefined' && App.industryData) {
            if (App.industryData.mapping && App.industryData.mapping[edinetCode]) {
                return App.industryData.mapping[edinetCode];
            }
        }
        return 'その他';
    }
};

// グローバルに公開
if (typeof window !== 'undefined') {
    window.EDINETIntegration = EDINETIntegration;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EDINETIntegration;
}
