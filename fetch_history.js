import { edinetClient } from './services/edinetClient.js';
import { database } from './services/database.js';

// Configuration
const DEFAULT_DAYS = 365 * 3; // 3 years
const DELAY_MS = 100; // API rate limit protection

async function fetchHistory(days = DEFAULT_DAYS) {
    console.log(`Starting historical data fetch for the last ${days} days...`);

    // Initialize DB
    await database.init();

    let totalSaved = 0;

    for (let i = 0; i < days; i++) {
        const date = EdinetClient.getDaysAgo(i);
        try {
            process.stdout.write(`Fetching ${date} (${i + 1}/${days})... `);

            // Reuse the client's optimized filtering logic
            // getLargeShareholdingReports ALREADY filters for:
            // 1. Large Shareholding Reports (010000, etc)
            // 2. Annual Securities Reports (030000)
            const reports = await edinetClient.getLargeShareholdingReports(date);

            if (reports.length > 0) {
                const count = await database.saveReports(reports);
                totalSaved += count;
                console.log(`Found ${reports.length}, Saved ${count} new`);
            } else {
                console.log('No relevant reports');
            }

        } catch (e) {
            console.log(`Error: ${e.message}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`\nCompleted! Total new reports saved: ${totalSaved}`);
    console.log('Note: Only metadata is stored. Detailed content is fetched on demand.');

    // Force exit as Supabase client might keep connection open
    process.exit(0);
}

// Helper to calculate days ago (duplicate from client for standalone use if needed, 
// but we can just use the static method if imported)
class EdinetClient {
    static getDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }
}

// Parse args
const args = process.argv.slice(2);
const daysParam = args[0] ? parseInt(args[0]) : DEFAULT_DAYS;

fetchHistory(daysParam);
