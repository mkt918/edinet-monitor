import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { IndustryMapper } from './industryMapper.js';

/**
 * データベース管理クラス（Supabase使用）
 */
class DatabaseService {
    constructor() {
        this.supabase = null;
    }

    /**
     * Supabase接続を初期化
     */
    async init() {
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error('Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
        }

        this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
        console.log('Database initialized (Supabase)');
    }

    /**
     * 報告書を保存（重複は無視）
     * @param {Object} report - 報告書データ
     * @returns {boolean} 新規追加されたかどうか
     */
    async saveReport(report) {
        try {
            const { error } = await this.supabase
                .from('reports')
                .upsert({
                    doc_id: report.docId,
                    edinet_code: report.edinetCode,
                    sec_code: report.secCode,
                    filer_name: report.filerName,
                    submit_date_time: report.submitDateTime,
                    doc_description: report.docDescription,
                    form_code: report.formCode,
                    report_type: report.reportType,
                    issuer_edinet_code: report.issuerEdinetCode,
                    subject_edinet_code: report.subjectEdinetCode,
                    parent_doc_id: report.parentDocId,
                    pdf_flag: report.pdfFlag,
                    csv_flag: report.csvFlag,
                    is_withdrawn: report.isWithdrawn
                }, {
                    onConflict: 'doc_id',
                    ignoreDuplicates: true
                });

            return !error;
        } catch (e) {
            console.error('Error saving report:', e);
            return false;
        }
    }

    /**
     * 複数の報告書を保存
     * @param {Array} reports - 報告書配列
     * @returns {number} 新規追加された件数
     */
    async saveReports(reports) {
        if (!reports || reports.length === 0) return 0;

        try {
            const { data, error } = await this.supabase
                .from('reports')
                .upsert(
                    reports.map(report => ({
                        doc_id: report.docId,
                        edinet_code: report.edinetCode,
                        sec_code: report.secCode,
                        filer_name: report.filerName,
                        submit_date_time: report.submitDateTime,
                        doc_description: report.docDescription,
                        form_code: report.formCode,
                        report_type: report.reportType,
                        issuer_edinet_code: report.issuerEdinetCode,
                        subject_edinet_code: report.subjectEdinetCode,
                        parent_doc_id: report.parentDocId,
                        pdf_flag: report.pdfFlag,
                        csv_flag: report.csvFlag,
                        is_withdrawn: report.isWithdrawn
                    })),
                    {
                        onConflict: 'doc_id',
                        ignoreDuplicates: true
                    }
                );

            if (error) {
                console.error('Error saving reports:', error);
                return 0;
            }

            return data ? data.length : 0;
        } catch (e) {
            console.error('Error in saveReports:', e);
            return 0;
        }
    }

    /**
     * 単一の報告書を取得
     * @param {string} docId - 書類管理番号
     * @returns {Object|null} 報告書データ
     */
    async getReport(docId) {
        try {
            const { data, error } = await this.supabase
                .from('reports')
                .select('*')
                .eq('doc_id', docId)
                .single();

            if (error) {
                // 見つからない場合はエラーではなくnullを返す
                if (error.code === 'PGRST116') return null;
                console.error('Error fetching report:', error);
                return null;
            }

            return data;
        } catch (e) {
            console.error('Error in getReport:', e);
            return null;
        }
    }

    /**
     * 発行者のEDINETコードに関連する報告書を取得
     * @param {string} edinetCode - 発行者のEDINETコード
     * @param {number} limit - 取得件数
     * @returns {Array} 報告書一覧
     */
    async getReportsByIssuer(edinetCode, limit = 20) {
        if (!edinetCode) return [];

        try {
            const { data, error } = await this.supabase
                .from('reports')
                .select('*')
                .or(`issuer_edinet_code.eq.${edinetCode},subject_edinet_code.eq.${edinetCode}`)
                .order('submit_date_time', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching issuer reports:', error);
                return [];
            }

            return data || [];
        } catch (e) {
            console.error('Error in getReportsByIssuer:', e);
            return [];
        }
    }

    /**
     * 最新の有価証券報告書を取得
     * @param {string} edinetCode - 発行者のEDINETコード
     * @returns {Object|null} 報告書データ
     */
    async getLatestAnnualReport(edinetCode) {
        if (!edinetCode) return null;
        try {
            // form_code = '030000' かつ doc_description に '有価証券報告書' (訂正除く)
            // Supabase filter: form_code.eq.030000, doc_description.not.ilike.%訂正%
            // Note: form_code check is usually enough for 030000 if filter logic in client is correct.
            const { data, error } = await this.supabase
                .from('reports')
                .select('*')
                .or(`issuer_edinet_code.eq.${edinetCode},edinet_code.eq.${edinetCode}`) // Annual Report is filed BY the issuer, so edinet_code matches
                .eq('form_code', '030000') // 有価証券報告書
                .not('doc_description', 'ilike', '%訂正%') // 訂正を除く
                .order('submit_date_time', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                console.error('Error fetching latest annual report:', error);
                return null;
            }
            return data;
        } catch (e) {
            console.error('Error in getLatestAnnualReport:', e);
            return null;
        }
    }

    /**
     * 提出者のEDINETコードに関連する報告書を取得
     * @param {string} edinetCode - 提出者のEDINETコード
     * @param {number} limit - 取得件数
     * @returns {Array} 報告書一覧
     */
    async getReportsByFiler(edinetCode, limit = 20) {
        if (!edinetCode) return [];

        try {
            const { data, error } = await this.supabase
                .from('reports')
                .select('*')
                .eq('edinet_code', edinetCode)
                .order('submit_date_time', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching filer reports:', error);
                return [];
            }

            return data || [];
        } catch (e) {
            console.error('Error in getReportsByFiler:', e);
            return [];
        }
    }

    /**
     * 報告書一覧を取得
     * @param {Object} options - 検索オプション
     * @returns {Array} 報告書一覧
     */
    async getReports({ date, startDate, endDate, search, filerName, industry, limit = 100, offset = 0 } = {}) {
        try {
            let query = this.supabase
                .from('reports')
                .select('*')
                .order('submit_date_time', { ascending: false });

            if (date) {
                query = query.ilike('submit_date_time', `${date}%`);
            }
            if (startDate) {
                query = query.gte('submit_date_time', `${startDate}T00:00:00`);
            }
            if (endDate) {
                query = query.lte('submit_date_time', `${endDate}T23:59:59`);
            }

            if (filerName) {
                query = query.ilike('filer_name', `%${filerName}%`);
            }

            if (search) {
                // 提出者名、書類名、証券コード、EDINETコード、発行者/対象EDINETコードで検索
                query = query.or(`filer_name.ilike.%${search}%,doc_description.ilike.%${search}%,sec_code.ilike.%${search}%,edinet_code.ilike.%${search}%,issuer_edinet_code.ilike.%${search}%,subject_edinet_code.ilike.%${search}%`);
            }

            if (industry) {
                // 業種名から証券コード範囲を取得
                const ranges = IndustryMapper.getRanges(industry);
                if (ranges.length > 0) {
                    // (sec_code >= min AND sec_code <= max) OR ...
                    // Supabaseのフィルタで表現:
                    // or(and(sec_code.gte.A,sec_code.lte.B),and(...))
                    const conditions = ranges.map(r => {
                        const start = r[0] + '0'; // 1300 -> 13000
                        const end = r[1] + '9';   // 1399 -> 13999
                        return `and(sec_code.gte.${start},sec_code.lte.${end})`;
                    });
                    query = query.or(conditions.join(','));
                }
            }

            query = query.range(offset, offset + limit - 1);

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching reports:', error);
                return [];
            }

            return data || [];
        } catch (e) {
            console.error('Error in getReports:', e);
            return [];
        }
    }

    /**
     * 本日の報告書数を取得
     * @param {string} date - 日付
     * @returns {number} 件数
     */
    async getReportCountByDate(date) {
        try {
            const { count, error } = await this.supabase
                .from('reports')
                .select('*', { count: 'exact', head: true })
                .ilike('submit_date_time', `${date}%`);

            if (error) {
                console.error('Error counting reports:', error);
                return 0;
            }

            return count || 0;
        } catch (e) {
            console.error('Error in getReportCountByDate:', e);
            return 0;
        }
    }

    /**
     * 監視対象を追加
     * @param {string} type - タイプ（filer, issuer...）
     * @param {string} name - 名前
     */
    async addWatchlistItem(type, name) {
        try {
            await this.supabase
                .from('watchlist')
                .upsert({
                    type,
                    name,
                    is_active: true
                }, {
                    onConflict: 'type,name',
                    ignoreDuplicates: true
                });
        } catch (e) {
            console.error('Error adding watchlist item:', e);
        }
    }

    /**
     * 監視対象一覧を取得
     * @param {string} type - タイプ（省略時は全て）
     * @returns {Array} 監視対象一覧
     */
    async getWatchlist(type = null) {
        try {
            let query = this.supabase
                .from('watchlist')
                .select('*')
                .eq('is_active', true);

            if (type) {
                query = query.eq('type', type);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching watchlist:', error);
                return [];
            }

            return data || [];
        } catch (e) {
            console.error('Error in getWatchlist:', e);
            return [];
        }
    }

    /**
     * 監視対象を削除
     * @param {number} id - ID
     */
    async removeWatchlistItem(id) {
        try {
            await this.supabase
                .from('watchlist')
                .update({ is_active: false })
                .eq('id', id);
        } catch (e) {
            console.error('Error removing watchlist item:', e);
        }
    }

    /**
     * 未通知の報告書を取得（監視対象に該当するもの）
     * @returns {Array} 未通知報告書一覧
     */
    async getUnnotifiedReports() {
        try {
            const watchlist = await this.getWatchlist('filer');
            if (watchlist.length === 0) {
                return [];
            }

            const names = watchlist.map(w => w.name);

            const { data, error } = await this.supabase
                .from('reports')
                .select('*')
                .eq('is_notified', false)
                .order('submit_date_time', { ascending: false });

            if (error) {
                console.error('Error fetching unnotified reports:', error);
                return [];
            }

            // フィルタリング（Supabaseのクエリでは複雑なLIKE条件が難しいため、アプリ側で処理）
            return (data || []).filter(report =>
                names.some(name => report.filer_name && report.filer_name.includes(name))
            );
        } catch (e) {
            console.error('Error in getUnnotifiedReports:', e);
            return [];
        }
    }

    /**
     * 報告書を通知済みに更新
     * @param {string} docId - 書類管理番号
     */
    async markAsNotified(docId) {
        try {
            await this.supabase
                .from('reports')
                .update({ is_notified: true })
                .eq('doc_id', docId);
        } catch (e) {
            console.error('Error marking as notified:', e);
        }
    }

    /**
     * データベースを閉じる（Supabaseでは不要だが互換性のため残す）
     */
    close() {
        // Supabaseクライアントは自動的に管理されるため、明示的なクローズは不要
    }
}

export const database = new DatabaseService();
