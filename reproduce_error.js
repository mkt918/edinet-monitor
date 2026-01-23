// Native fetch is available in Node 24+

const API_BASE = 'http://localhost:3000';

async function checkAttributes(edinetCode, name) {
    console.log(`Checking ${name} (${edinetCode})...`);
    try {
        const res = await fetch(`${API_BASE}/api/issuer/${edinetCode}/attributes`);
        const data = await res.json();
        console.log(`Result for ${name}:`, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error fetching ${name}:`, e.message);
    }
}

async function main() {
    try {
        // 1. Fetch recent reports
        const reportsRes = await fetch(`${API_BASE}/api/reports?limit=50`);
        const reportsData = await reportsRes.json();

        if (!reportsData.success) {
            console.error('Failed to fetch reports');
            return;
        }

        const reports = reportsData.data;
        console.log(`Scanning ${reports.length} reports...`);

        for (const report of reports) {
            // Determine issuer code (logic from app.js expectation)
            // app.js uses details.issuerEdinetCode. 
            // In report list item, we only have `edinet_code` of the filer usually, 
            // but let's check what the API returns. The list item might not have issuer_edinet_code directly 
            // if it's not in the view_file output I saw earlier. 
            // But wait, the list endpoint returns db columns.

            // Actually, let's just fetch details for each report first like app.js does
            const detailsRes = await fetch(`${API_BASE}/api/reports/${report.doc_id}/details`);
            const detailsData = await detailsRes.json();

            if (!detailsData.success || !detailsData.data) {
                console.log(`[${report.doc_id}] Failed to get details`);
                continue;
            }

            const details = detailsData.data;
            if (details.issuerEdinetCode) {
                const attrRes = await fetch(`${API_BASE}/api/issuer/${details.issuerEdinetCode}/attributes`);
                const attrData = await attrRes.json();

                if (!attrData.success) {
                    console.error(`[FAIL] ${details.filerName} (Code: ${details.issuerEdinetCode}): Success=false, Error=${attrData.error}`);
                } else if (!attrData.data) {
                    // This is the "No Data" case (Message should be present)
                    console.log(`[NULL] ${details.filerName}: ${attrData.message}`);
                } else {
                    console.log(`[OK] ${details.filerName}: Data found`);
                }
            } else {
                console.log(`[SKIP] ${details.filerName}: No issuerEdinetCode`);
            }
        }

    } catch (e) {
        console.error('Script error:', e);
    }
}

main();
