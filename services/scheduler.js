import cron from 'node-cron';
import { edinetClient, EdinetClient } from './edinetClient.js';
import { database } from './database.js';
import { config } from '../config.js';

/**
 * 監視スケジューラー
 */
class Scheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
        this.lastRun = null;
        this.onNewReports = null; // 新規報告書検出時のコールバック
    }

    /**
     * 監視を開始
     * @param {Function} onNewReports - 新規報告書検出時のコールバック
     */
    start(onNewReports = null) {
        this.onNewReports = onNewReports;

        // 30分ごとに実行（0分と30分）
        const cronExpression = `*/${config.pollIntervalMinutes} * * * *`;

        this.job = cron.schedule(cronExpression, async () => {
            await this.checkForNewReports();
        });

        console.log(`Scheduler started: every ${config.pollIntervalMinutes} minutes`);

        // 起動時に即座に実行
        this.checkForNewReports();
    }

    /**
     * 監視を停止
     */
    stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            console.log('Scheduler stopped');
        }
    }

    /**
     * 新規報告書をチェック
     */
    async checkForNewReports() {
        if (this.isRunning) {
            console.log('Previous check still running, skipping...');
            return;
        }

        this.isRunning = true;
        this.lastRun = new Date();
        console.log(`[${this.lastRun.toISOString()}] Checking for new reports...`);

        try {
            // 今日と昨日の報告書を取得（時間差で漏れがないように）
            const today = EdinetClient.getToday();
            const yesterday = EdinetClient.getDaysAgo(1);

            const [todayReports, yesterdayReports] = await Promise.all([
                edinetClient.getLargeShareholdingReports(today),
                edinetClient.getLargeShareholdingReports(yesterday)
            ]);

            const allReports = [...todayReports, ...yesterdayReports];
            console.log(`Found ${allReports.length} large shareholding reports`);

            // データベースに保存（重複は無視）
            const newCount = database.saveReports(allReports);
            console.log(`${newCount} new reports saved`);

            // 新規報告があればコールバック実行
            if (newCount > 0 && this.onNewReports) {
                const newReports = database.getUnnotifiedReports();
                if (newReports.length > 0) {
                    this.onNewReports(newReports);
                }
            }

        } catch (error) {
            console.error('Error checking for new reports:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * 手動で即座にチェック
     */
    async checkNow() {
        await this.checkForNewReports();
    }

    /**
     * ステータスを取得
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            intervalMinutes: config.pollIntervalMinutes,
            isScheduled: this.job !== null
        };
    }
}

export const scheduler = new Scheduler();
