import { config } from '../config.js';

/**
 * 大量保有報告書のCSVデータをパースするクラス（メモリベース）
 * Vercel対応: ファイルシステムへの書き込みなし
 */
export class CsvParser {

    /**
     * 書類IDからCSVデータを取得してパース（メモリのみ）
     * @param {string} docId - EDINET書類ID
     * @param {string} type - 'largeHolding' or 'annualReport'
     * @returns {Promise<Object|null>} パース結果
     */
    static async fetchAndParse(docId, type = 'largeHolding') {
        try {
            // CSVデータ（type=5）をダウンロード
            const url = `${config.edinetBaseUrl}/documents/${docId}?type=5&Subscription-Key=${config.edinetApiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`Failed to fetch CSV for ${docId}: ${response.status}`);
                return null;
            }

            // ZIPファイルをメモリバッファで処理
            const buffer = Buffer.from(await response.arrayBuffer());

            // ZIPを展開（AdmZipを使用 - メモリのみ）
            const AdmZip = (await import('adm-zip')).default;
            const zip = new AdmZip(buffer);
            const zipEntries = zip.getEntries();

            // CSVファイルを検索
            let csvEntry;
            if (type === 'annualReport') {
                // 有価証券報告書の場合、jpcrp...csvを探す
                // 複数ある場合は大株主情報を含むものを優先的に探すが、
                // 通常は主要なCSVに含まれる。
                csvEntry = zipEntries.find(entry =>
                    !entry.isDirectory &&
                    entry.entryName.endsWith('.csv') &&
                    entry.entryName.includes('jpcrp') &&
                    entry.entryName.includes('asr') // Annual Securities Report
                );
            } else {
                csvEntry = zipEntries.find(entry =>
                    !entry.isDirectory && entry.entryName.endsWith('.csv')
                );
            }

            if (!csvEntry) {
                // 厳密な検索で見つからない場合、任意のCSVをフォールバックとして探す（サイズが大きいもの優先など）
                csvEntry = zipEntries.find(entry => !entry.isDirectory && entry.entryName.endsWith('.csv'));
            }

            if (!csvEntry) {
                console.error(`No CSV file found for ${docId}`);
                return null;
            }

            // CSVをパース（UTF-16LE）
            const csvContent = csvEntry.getData().toString('utf16le');

            if (type === 'annualReport') {
                return this.parseAnnualReportCsv(csvContent);
            } else {
                return this.parseLargeHoldingCsv(csvContent);
            }

        } catch (error) {
            console.error(`Error parsing CSV for ${docId}:`, error);
            return null;
        }
    }

    /**
     * 大量保有報告書CSVをパース
     * @param {string} content - CSVコンテンツ
     * @returns {Object} パース結果
     */
    static parseLargeHoldingCsv(content) {
        const lines = content.split('\n');
        const result = {
            issuerName: null,           // 発行者名
            securityCode: null,         // 証券コード
            holdingRatio: null,         // 保有割合
            previousHoldingRatio: null, // 前回保有割合
            holdingRatioChange: null,   // 保有割合変化
            totalShares: null,          // 保有株式数
            purposeOfHolding: null,     // 保有目的
            filerName: null,            // 提出者名
        };

        // 重要なフィールドのマッピング
        const fieldMapping = {
            'jplvh_cor:NameOfIssuer': 'issuerName',
            'jplvh_cor:SecurityCodeOfIssuer': 'securityCode',
            'jplvh_cor:HoldingRatioOfShareCertificatesEtc': 'holdingRatio',
            'jplvh_cor:HoldingRatioOfShareCertificatesEtcPerLastReport': 'previousHoldingRatio',
            'jplvh_cor:TotalNumberOfStocksEtcHeld': 'totalShares',
            'jplvh_cor:PurposeOfHolding': 'purposeOfHolding',
            'jplvh_cor:NameCoverPage': 'filerName',
        };

        for (const line of lines) {
            // タブ区切りでパース（クォート、キャリッジリターンを除去）
            const columns = line.split('\t').map(col =>
                col.replace(/"/g, '').replace(/\r/g, '').trim()
            );

            if (columns.length < 9) continue;

            const elementId = columns[0];
            const value = columns[8];

            // マッピングに該当するフィールドを抽出
            if (fieldMapping[elementId] && value && value !== '－' && value !== '―') {
                const fieldName = fieldMapping[elementId];

                // 数値の場合は変換
                if (fieldName === 'holdingRatio' || fieldName === 'previousHoldingRatio') {
                    result[fieldName] = parseFloat(value);
                } else if (fieldName === 'totalShares') {
                    result[fieldName] = parseInt(value, 10);
                } else {
                    result[fieldName] = value;
                }
            }
        }

        // 保有割合の変化を計算
        if (result.holdingRatio !== null && result.previousHoldingRatio !== null) {
            result.holdingRatioChange = result.holdingRatio - result.previousHoldingRatio;
        }

        return result;
    }

    /**
     * 保有割合をパーセント文字列に変換
     * @param {number} ratio - 比率（0.0〜1.0）
     * @returns {string} パーセント文字列
     */
    static formatRatioAsPercent(ratio) {
        if (ratio === null || ratio === undefined) return '-';
        return (ratio * 100).toFixed(2) + '%';
    }

    /**
     * 保有割合変化を符号付き文字列に変換
     * @param {number} change - 変化量
     * @returns {string} 符号付きパーセント文字列
     */
    static formatRatioChange(change) {
        if (change === null || change === undefined) return '-';
        const sign = change >= 0 ? '+' : '';
        return sign + (change * 100).toFixed(2) + '%';
    }
    /**
     * 有価証券報告書CSVから大株主データを抽出
     * @param {string} content - CSVコンテンツ
     * @returns {Object} 大株主データと属性
     */
    static parseAnnualReportCsv(content) {
        const lines = content.split('\n');
        const shareholders = [];

        // 列インデックスの特定用
        // "要素ID"	"項目名"	"コンテキストID" "相対年度" "連結・個別" "期間・時点" "ユニットID" "単位" "値"
        // 通常は要素ID=0, コンテキストID=2, 値=8

        for (const line of lines) {
            const columns = line.split('\t').map(col =>
                col.replace(/"/g, '').replace(/\r/g, '').trim()
            );
            if (columns.length < 9) continue;

            const elementId = columns[0];
            const label = columns[1];
            const contextId = columns[2];
            const value = columns[8];

            // 大株主データの抽出
            // コンテキストIDに 'MajorShareholdersMember' が含まれるものを対象
            // CurrentYearInstant_No1MajorShareholdersMember などを探す
            if (contextId && contextId.includes('CurrentYearInstant') && contextId.includes('MajorShareholdersMember')) {

                // メンバー番号を抽出 (No1, No2...)
                const match = contextId.match(/No(\d+)MajorShareholdersMember/);
                if (!match) continue;
                const rank = parseInt(match[1], 10);

                // 既存のオブジェクトを取得または作成
                let holder = shareholders.find(h => h.rank === rank);
                if (!holder) {
                    holder = { rank, name: '', shares: 0, ratio: 0 };
                    shareholders.push(holder);
                }

                if (elementId.includes('NameMajorShareholders')) {
                    holder.name = value;
                } else if (elementId.includes('NumberOfSharesHeld')) {
                    holder.shares = parseFloat(value) || 0;
                } else if (elementId.includes('ShareholdingRatio')) {
                    holder.ratio = parseFloat(value) || 0;
                }
            }
        }

        // ブラックリスト（除外キーワード）
        const blacklist = [
            '信託口', 'マスタートラスト', '日本カストディ', '資産管理サービス信託',
            '従業員持株会', '自社株', '自己株式',
            'STATE STREET BANK', 'THE BANK OF NEW YORK', 'JP MORGAN',
            'GOVERNMENT OF NORWAY', '日本証券金融'
        ];

        // フィルタリングとソート
        const validShareholders = shareholders
            .filter(h => h.name && h.shares > 0) // 名前があり株数がある
            .map(h => {
                // 名前から全角スペースを除去などの正規化
                h.name = h.name.replace(/　/g, ' ').trim();
                return h;
            })
            .sort((a, b) => b.ratio - a.ratio); // 比率降順

        // 属性判定用のクリーンな株主リスト（ブラックリスト除外）
        const attributeShareholders = validShareholders.filter(h => {
            return !blacklist.some(keyword => h.name.includes(keyword));
        });

        // 属性（筆頭株主の系列）
        let attribute = '独立系'; // デフォルト
        if (attributeShareholders.length > 0) {
            const top = attributeShareholders[0];
            // 「株式会社」などを除去して簡略化
            const simpleName = top.name
                .replace(/(株式会社|有限会社|一般社団法人|公益財団法人)/g, '')
                .trim();
            attribute = `${simpleName}系`;
        }

        // トップ3を返す（表示用はブラックリスト除外しない場合もありうるが、
        // ユーザー要望では「属性がわかる」のが重要なので、ブラックリスト除外後のトップ3を優先表示するか、
        // あるいは生のトップ3を表示しつつ属性は別途出すか。
        // 「大株主トップ3が即座に見える化」「マスター信託とか自社株会とかはいらん」とのことなので、
        // 除外後のトップ3を返す。

        return {
            shareholders: attributeShareholders.slice(0, 3), // 除外後のトップ3
            attribute: attribute
        };
    }
}

