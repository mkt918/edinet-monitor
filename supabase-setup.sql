-- EDINET Monitor用のSupabaseテーブル定義
-- このSQLをSupabaseのSQL Editorで実行してください

-- 1. reports テーブル（報告書）
CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    doc_id TEXT UNIQUE NOT NULL,
    edinet_code TEXT,
    sec_code TEXT,
    filer_name TEXT NOT NULL,
    submit_date_time TIMESTAMPTZ NOT NULL,
    doc_description TEXT,
    form_code TEXT,
    report_type TEXT,
    issuer_edinet_code TEXT,
    subject_edinet_code TEXT,
    parent_doc_id TEXT,
    pdf_flag BOOLEAN DEFAULT FALSE,
    csv_flag BOOLEAN DEFAULT FALSE,
    is_withdrawn BOOLEAN DEFAULT FALSE,
    is_notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. watchlist テーブル（監視対象）
CREATE TABLE IF NOT EXISTS watchlist (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, name)
);

-- 3. notifications テーブル（通知履歴）
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    doc_id TEXT NOT NULL,
    message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_reports_submit_date ON reports(submit_date_time DESC);
CREATE INDEX IF NOT EXISTS idx_reports_filer_name ON reports(filer_name);
CREATE INDEX IF NOT EXISTS idx_reports_doc_id ON reports(doc_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_type ON watchlist(type);
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON watchlist(is_active);

-- Row Level Security (RLS) を有効化
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 全てのユーザーに読み取り権限を付与
CREATE POLICY "Enable read access for all users" ON reports FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON watchlist FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON notifications FOR SELECT USING (true);

-- 全てのユーザーに書き込み権限を付与（anon keyで操作可能にする）
CREATE POLICY "Enable insert for all users" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON reports FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON reports FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON watchlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON watchlist FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON watchlist FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON notifications FOR DELETE USING (true);
