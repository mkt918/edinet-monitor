import { config } from '../config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 大量保有報告書のCSVデータをパースするクラス
 */
export class CsvParser {

    /**
     * 書類IDからCSVデータを取得してパース
     * @param {string} docId - EDINET書類ID
     * @returns {Promise<Object|null>} パース結果
     */
    static async fetchAndParse(docId) {
        try {
            // CSVデータ（type=5）をダウンロード
            const url = `${config.edinetBaseUrl}/documents/${docId}?type=5&Subscription-Key=${config.edinetApiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`Failed to fetch CSV for ${docId}: ${response.status}`);
                return null;
            }

            // ZIPファイルを一時保存
            const buffer = Buffer.from(await response.arrayBuffer());
            const tempDir = join(__dirname, '..', 'temp');
            const zipPath = join(tempDir, `${docId}.zip`);
            const extractDir = join(tempDir, docId);

            // ディレクトリ作成
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // ZIPファイルを保存
            fs.writeFileSync(zipPath, buffer);

            // ZIPを展開（AdmZipを使用）
            const AdmZip = (await import('adm-zip')).default;
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractDir, true);

            // CSVファイルを検索
            const csvFile = this.findCsvFile(extractDir);
            if (!csvFile) {
                console.error(`No CSV file found for ${docId}`);
                this.cleanup(zipPath, extractDir);
                return null;
            }

            // CSVをパース（UTF-16LE）
            const csvContent = fs.readFileSync(csvFile, 'utf16le');
            const result = this.parseLargeHoldingCsv(csvContent);

            // クリーンアップ
            this.cleanup(zipPath, extractDir);

            return result;

        } catch (error) {
            console.error(`Error parsing CSV for ${docId}:`, error);
            return null;
        }
    }

    /**
     * CSVファイルを再帰的に検索
     * @param {string} dir - 検索ディレクトリ
     * @returns {string|null} CSVファイルパス
     */
    static findCsvFile(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                const found = this.findCsvFile(fullPath);
                if (found) return found;
            } else if (entry.name.endsWith('.csv')) {
                return fullPath;
            }
        }
        return null;
    }

    /**
     * 一時ファイルをクリーンアップ
     * @param {string} zipPath - ZIPファイルパス
     * @param {string} extractDir - 展開ディレクトリ
     */
    static cleanup(zipPath, extractDir) {
        try {
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }
            if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true, force: true });
            }
        } catch (e) {
            // クリーンアップ失敗は無視
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
}
