import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

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
     * 報告書一覧を取得
     * @param {Object} options - 検索オプション
     * @returns {Array} 報告書一覧
     */
    async getReports(options = {}) {
        const { limit = 100, offset = 0, date, filerName, search } = options;

        try {
            let query = this.supabase
                .from('reports')
                .select('*')
                .order('submit_date_time', { ascending: false });

            if (date) {
                query = query.ilike('submit_date_time', `${date}%`);
            }

            if (filerName) {
                query = query.ilike('filer_name', `%${filerName}%`);
            }

            if (search) {
                query = query.or(`filer_name.ilike.%${search}%,doc_description.ilike.%${search}%`);
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
