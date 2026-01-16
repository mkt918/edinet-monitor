import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config.js';
import { edinetClient, EdinetClient } from './services/edinetClient.js';
import { database } from './services/database.js';
import { scheduler } from './services/scheduler.js';
import { CsvParser } from './services/csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ===== API Routes =====

/**
 * 報告書一覧を取得
 * GET /api/reports?date=2026-01-15&search=xxx&limit=100&offset=0
 */
app.get('/api/reports', async (req, res) => {
    try {
        const { date, search, filerName, limit = 100, offset = 0 } = req.query;
        const reports = await database.getReports({
            date,
            search,
            filerName,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        res.json({ success: true, data: reports });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * EDINET APIから直接取得（リアルタイム）
 * GET /api/reports/live?date=2026-01-15
 */
app.get('/api/reports/live', async (req, res) => {
    try {
        const date = req.query.date || EdinetClient.getToday();
        const reports = await edinetClient.getLargeShareholdingReports(date);

        // DBにも保存
        const newCount = database.saveReports(reports);

        res.json({
            success: true,
            data: reports,
            newCount,
            date
        });
    } catch (error) {
        console.error('Error fetching live reports:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * ダッシュボード統計
 * GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
    try {
        const today = EdinetClient.getToday();
        const todayCount = await database.getReportCountByDate(today);
        const schedulerStatus = scheduler.getStatus();

        res.json({
            success: true,
            data: {
                todayCount,
                scheduler: schedulerStatus,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 手動で即座に更新
 * POST /api/refresh
 */
app.post('/api/refresh', async (req, res) => {
    try {
        await scheduler.checkNow();
        res.json({ success: true, message: 'Refresh completed' });
    } catch (error) {
        console.error('Error refreshing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 監視対象一覧を取得
 * GET /api/watchlist
 */
app.get('/api/watchlist', async (req, res) => {
    try {
        const watchlist = await database.getWatchlist();
        res.json({ success: true, data: watchlist });
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 監視対象を追加
 * POST /api/watchlist
 */
app.post('/api/watchlist', async (req, res) => {
    try {
        const { type, name } = req.body;
        if (!type || !name) {
            return res.status(400).json({
                success: false,
                error: 'type and name are required'
            });
        }
        await database.addWatchlistItem(type, name);
        res.json({ success: true, message: 'Added to watchlist' });
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 監視対象を削除
 * DELETE /api/watchlist/:id
 */
app.delete('/api/watchlist/:id', async (req, res) => {
    try {
        await database.removeWatchlistItem(parseInt(req.params.id));
        res.json({ success: true, message: 'Removed from watchlist' });
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * プリセット監視対象を初期化
 * POST /api/watchlist/init-presets
 */
app.post('/api/watchlist/init-presets', (req, res) => {
    try {
        for (const name of config.watchlistPresets) {
            database.addWatchlistItem('filer', name);
        }
        res.json({
            success: true,
            message: `${config.watchlistPresets.length} presets initialized`
        });
    } catch (error) {
        console.error('Error initializing presets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 書類ダウンロードプロキシ（APIキーをサーバー側で付与）
 * GET /api/document/:docId
 */
app.get('/api/document/:docId', async (req, res) => {
    try {
        const { docId } = req.params;
        const type = req.query.type || '2'; // 2=PDF

        const url = `${config.edinetBaseUrl}/documents/${docId}?type=${type}&Subscription-Key=${config.edinetApiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: `EDINET API error: ${response.status}`
            });
        }

        // Content-Typeをそのまま転送
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Content-Dispositionをそのまま転送（ファイル名）
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
            res.setHeader('Content-Disposition', contentDisposition);
        }

        // バイナリデータを転送
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 報告書の詳細情報を取得（CSVを解析）
 * GET /api/reports/:docId/details
 */
app.get('/api/reports/:docId/details', async (req, res) => {
    try {
        const { docId } = req.params;

        console.log(`Fetching details for ${docId}...`);
        const details = await CsvParser.fetchAndParse(docId);

        if (!details) {
            return res.status(404).json({
                success: false,
                error: 'Could not parse document details'
            });
        }

        // 保有割合をフォーマット
        const formattedDetails = {
            ...details,
            holdingRatioFormatted: CsvParser.formatRatioAsPercent(details.holdingRatio),
            previousHoldingRatioFormatted: CsvParser.formatRatioAsPercent(details.previousHoldingRatio),
            holdingRatioChangeFormatted: CsvParser.formatRatioChange(details.holdingRatioChange)
        };

        res.json({
            success: true,
            data: formattedDetails
        });

    } catch (error) {
        console.error('Error fetching report details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== Server Start =====

async function startServer() {
    try {
        // データベース初期化
        await database.init();

        // プリセット監視対象を初期化
        for (const name of config.watchlistPresets) {
            database.addWatchlistItem('filer', name);
        }
        console.log('Watchlist presets initialized');

        // 過去180日分のデータを取得（初回起動時）
        console.log('Fetching historical data (past 180 days)...');
        await fetchHistoricalData(180);
        console.log('Historical data loaded');

        // スケジューラー開始
        scheduler.start((newReports) => {
            console.log(`New reports detected: ${newReports.length}`);
            // TODO: Web Push通知を送信
        });

        // サーバー起動
        app.listen(config.port, () => {
            console.log(`\n🚀 EDINET Monitor Server running at http://localhost:${config.port}`);
            console.log(`📊 API: http://localhost:${config.port}/api/reports`);
            console.log(`📅 Polling every ${config.pollIntervalMinutes} minutes\n`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

/**
 * 過去のデータを取得してDBに保存
 * @param {number} days - 遡る日数
 */
async function fetchHistoricalData(days) {
    const promises = [];

    for (let i = 0; i < days; i++) {
        const date = EdinetClient.getDaysAgo(i);
        promises.push(
            edinetClient.getLargeShareholdingReports(date)
                .then(reports => {
                    if (reports.length > 0) {
                        database.saveReports(reports);
                        console.log(`  ${date}: ${reports.length} reports`);
                    }
                })
                .catch(err => {
                    console.error(`  ${date}: Error - ${err.message}`);
                })
        );

        // API制限を考慮して100msの遅延を入れる
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    await Promise.all(promises);
}

startServer();
