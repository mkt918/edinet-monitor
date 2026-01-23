// Script to list Annual Securities Reports in the DB
const API_BASE = 'http://localhost:3000';

async function main() {
    try {
        console.log('Fetching reports...');
        // Default limit is 100, let's fetch more to be sure we see recent ones, 
        // or loop if we need all (but user probably just wants a list of what's there now).
        // The DB seems to populate recent ones.
        const res = await fetch(`${API_BASE}/api/reports?limit=1000`);
        const data = await res.json();

        if (!data.success) {
            console.error('Failed to fetch reports:', data.error);
            return;
        }

        const reports = data.data;
        console.log(`Total reports fetched: ${reports.length}`);

        // Filter for "有価証券報告書" (Annual Securities Report)
        // Usually form checks are better, but description is good for display.
        const annualReports = reports.filter(r =>
            r.doc_description &&
            r.doc_description.includes('有価証券報告書') &&
            !r.doc_description.includes('訂正') // Optional: Exclude corrections if desired, but user asked for "what exists"
        );

        console.log(`\nFound ${annualReports.length} Annual Securities Reports:`);

        if (annualReports.length === 0) {
            console.log('(None found)');
        }

        // Group by filer for nicer output
        const byFiler = {};
        for (const r of annualReports) {
            if (!byFiler[r.filer_name]) {
                byFiler[r.filer_name] = [];
            }
            byFiler[r.filer_name].push(r);
        }

        for (const filer in byFiler) {
            console.log(`\n[${filer}]`);
            byFiler[filer].forEach(r => {
                console.log(`  - ${r.submit_date_time.substring(0, 10)}: ${r.doc_description} (DocID: ${r.doc_id})`);
            });
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

main();
