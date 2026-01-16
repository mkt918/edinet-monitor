import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * データベース管理クラス（sql.js使用）
 */
class DatabaseService {
    constructor() {
        this.dbPath = join(__dirname, '..', 'data', 'reports.db');
        this.db = null;
        this.SQL = null;
    }

    /**
     * データベース接続を初期化
     */
    async init() {
        // dataディレクトリがなければ作成
        const dataDir = join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // sql.js初期化
        this.SQL = await initSqlJs();

        // 既存DBがあれば読み込み
        if (fs.existsSync(this.dbPath)) {
            const buffer = fs.readFileSync(this.dbPath);
            this.db = new this.SQL.Database(buffer);
        } else {
            this.db = new this.SQL.Database();
        }

        this.createTables();
        this.saveToFile();
        console.log('Database initialized:', this.dbPath);
    }

    /**
     * DBをファイルに保存
     */
    saveToFile() {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.dbPath, buffer);
    }

    /**
     * テーブル作成
     */
    createTables() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT UNIQUE NOT NULL,
                edinet_code TEXT,
                sec_code TEXT,
                filer_name TEXT NOT NULL,
                submit_date_time TEXT NOT NULL,
                doc_description TEXT,
                form_code TEXT,
                report_type TEXT,
                issuer_edinet_code TEXT,
                subject_edinet_code TEXT,
                parent_doc_id TEXT,
                pdf_flag INTEGER DEFAULT 0,
                csv_flag INTEGER DEFAULT 0,
                is_withdrawn INTEGER DEFAULT 0,
                is_notified INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS watchlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(type, name)
            )
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                message TEXT,
                sent_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // インデックス作成
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_reports_submit_date ON reports(submit_date_time)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_reports_filer_name ON reports(filer_name)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_watchlist_type ON watchlist(type)`);
    }

    /**
     * 報告書を保存（重複は無視）
     * @param {Object} report - 報告書データ
     * @returns {boolean} 新規追加されたかどうか
     */
    saveReport(report) {
        try {
            this.db.run(`
                INSERT OR IGNORE INTO reports 
                (doc_id, edinet_code, sec_code, filer_name, submit_date_time, 
                 doc_description, form_code, report_type, issuer_edinet_code, 
                 subject_edinet_code, parent_doc_id, pdf_flag, csv_flag, is_withdrawn)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                report.docId,
                report.edinetCode,
                report.secCode,
                report.filerName,
                report.submitDateTime,
                report.docDescription,
                report.formCode,
                report.reportType,
                report.issuerEdinetCode,
                report.subjectEdinetCode,
                report.parentDocId,
                report.pdfFlag ? 1 : 0,
                report.csvFlag ? 1 : 0,
                report.isWithdrawn ? 1 : 0
            ]);
            return this.db.getRowsModified() > 0;
        } catch (e) {
            return false;
        }
    }

    /**
     * 複数の報告書を保存
     * @param {Array} reports - 報告書配列
     * @returns {number} 新規追加された件数
     */
    saveReports(reports) {
        let newCount = 0;
        for (const report of reports) {
            if (this.saveReport(report)) {
                newCount++;
            }
        }
        if (newCount > 0) {
            this.saveToFile();
        }
        return newCount;
    }

    /**
     * 報告書一覧を取得
     * @param {Object} options - 検索オプション
     * @returns {Array} 報告書一覧
     */
    getReports(options = {}) {
        const { limit = 100, offset = 0, date, filerName, search } = options;

        let sql = 'SELECT * FROM reports WHERE 1=1';
        const params = [];

        if (date) {
            sql += ' AND submit_date_time LIKE ?';
            params.push(`${date}%`);
        }

        if (filerName) {
            sql += ' AND filer_name LIKE ?';
            params.push(`%${filerName}%`);
        }

        if (search) {
            sql += ' AND (filer_name LIKE ? OR doc_description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY submit_date_time DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = this.db.prepare(sql);
        stmt.bind(params);

        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    /**
     * 本日の報告書数を取得
     * @param {string} date - 日付
     * @returns {number} 件数
     */
    getReportCountByDate(date) {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM reports WHERE submit_date_time LIKE ?');
        stmt.bind([`${date}%`]);
        stmt.step();
        const result = stmt.getAsObject();
        stmt.free();
        return result.count;
    }

    /**
     * 監視対象を追加
     * @param {string} type - タイプ（filer, issuer）
     * @param {string} name - 名前
     */
    addWatchlistItem(type, name) {
        try {
            this.db.run('INSERT OR IGNORE INTO watchlist (type, name) VALUES (?, ?)', [type, name]);
            this.saveToFile();
        } catch (e) {
            // 重複は無視
        }
    }

    /**
     * 監視対象一覧を取得
     * @param {string} type - タイプ（省略時は全て）
     * @returns {Array} 監視対象一覧
     */
    getWatchlist(type = null) {
        let sql = 'SELECT * FROM watchlist WHERE is_active = 1';
        const params = [];

        if (type) {
            sql += ' AND type = ?';
            params.push(type);
        }

        const stmt = this.db.prepare(sql);
        if (params.length) stmt.bind(params);

        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    /**
     * 監視対象を削除
     * @param {number} id - ID
     */
    removeWatchlistItem(id) {
        this.db.run('UPDATE watchlist SET is_active = 0 WHERE id = ?', [id]);
        this.saveToFile();
    }

    /**
     * 未通知の報告書を取得（監視対象に該当するもの）
     * @returns {Array} 未通知報告書一覧
     */
    getUnnotifiedReports() {
        const watchlist = this.getWatchlist('filer');
        if (watchlist.length === 0) {
            return [];
        }

        const conditions = watchlist.map(w =>
            `filer_name LIKE '%${w.name.replace(/'/g, "''")}%'`
        ).join(' OR ');

        const sql = `SELECT * FROM reports WHERE is_notified = 0 AND (${conditions}) ORDER BY submit_date_time DESC`;
        const stmt = this.db.prepare(sql);

        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }

    /**
     * 報告書を通知済みに更新
     * @param {string} docId - 書類管理番号
     */
    markAsNotified(docId) {
        this.db.run('UPDATE reports SET is_notified = 1 WHERE doc_id = ?', [docId]);
        this.saveToFile();
    }

    /**
     * データベースを閉じる
     */
    close() {
        if (this.db) {
            this.saveToFile();
            this.db.close();
        }
    }
}

export const database = new DatabaseService();
