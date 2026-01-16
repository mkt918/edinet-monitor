import { config } from '../config.js';

/**
 * EDINET API v2 クライアント
 */
export class EdinetClient {
    constructor() {
        this.baseUrl = config.edinetBaseUrl;
        this.apiKey = config.edinetApiKey;
    }

    /**
     * 指定日の書類一覧を取得
     * @param {string} date - YYYY-MM-DD形式の日付
     * @param {number} type - 1: メタデータのみ, 2: 書類一覧+メタデータ
     * @returns {Promise<Object>} 書類一覧
     */
    async getDocumentList(date, type = 2) {
        const url = `${this.baseUrl}/documents.json?date=${date}&type=${type}&Subscription-Key=${this.apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`EDINET API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch document list:', error);
            throw error;
        }
    }

    /**
     * 大量保有報告書のみをフィルタリングして取得
     * @param {string} date - YYYY-MM-DD形式の日付
     * @returns {Promise<Array>} 大量保有報告書一覧
     */
    async getLargeShareholdingReports(date) {
        const data = await this.getDocumentList(date);

        if (!data.results) {
            return [];
        }

        // 府令コード060（大量保有）でフィルタリング
        const reports = data.results.filter(doc =>
            doc.ordinanceCode === config.ordinanceCode
        );

        return reports.map(doc => this.formatReport(doc));
    }

    /**
     * 報告書データを整形
     * @param {Object} doc - EDINET書類データ
     * @returns {Object} 整形済みデータ
     */
    formatReport(doc) {
        return {
            docId: doc.docID,
            edinetCode: doc.edinetCode,
            secCode: doc.secCode,
            filerName: doc.filerName,
            submitDateTime: doc.submitDateTime,
            docDescription: doc.docDescription,
            formCode: doc.formCode,
            issuerEdinetCode: doc.issuerEdinetCode,
            subjectEdinetCode: doc.subjectEdinetCode,
            parentDocId: doc.parentDocID,
            pdfFlag: doc.pdfFlag === '1',
            csvFlag: doc.csvFlag === '1',
            reportType: this.getReportType(doc.formCode),
            isWithdrawn: doc.withdrawalStatus === '1'
        };
    }

    /**
     * 様式コードから報告書種別を判定
     * @param {string} formCode - 様式コード
     * @returns {string} 報告書種別
     */
    getReportType(formCode) {
        const types = {
            '010000': '大量保有報告書',
            '020000': '変更報告書',
            '030000': '変更報告書（短期大量譲渡）',
            '010001': '大量保有報告書（特例対象株券等）',
            '020001': '変更報告書（特例対象株券等）'
        };

        // 訂正報告書のチェック（末尾が10000など）
        if (formCode && formCode.endsWith('10000')) {
            return '訂正報告書';
        }

        return types[formCode] || '大量保有関連報告書';
    }

    /**
     * 書類PDFのダウンロードURLを取得
     * @param {string} docId - 書類管理番号
     * @returns {string} ダウンロードURL
     */
    getDocumentUrl(docId) {
        return `${this.baseUrl}/documents/${docId}?type=2&Subscription-Key=${this.apiKey}`;
    }

    /**
     * 今日の日付を取得（YYYY-MM-DD形式）
     * @returns {string} 日付文字列
     */
    static getToday() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * 指定日数前の日付を取得
     * @param {number} days - 遡る日数
     * @returns {string} 日付文字列
     */
    static getDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }
}

export const edinetClient = new EdinetClient();
