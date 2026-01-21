
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EDINET_API_KEY = '43f1d406817e4f3285ad3c3b9202c70b';
const EDINET_BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';

// Toyota
const TEST_CODE = 'E02144';

async function downloadAndInspect() {
    console.log('Searching for latest report for E02144 (Toyota)...');

    // 1. Find Report
    const today = new Date();
    let docId = null;

    // Search last 180 days
    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        const dateStr = d.toISOString().split('T')[0];
        try {
            const url = `${EDINET_BASE_URL}/documents.json?date=${dateStr}&type=2&Subscription-Key=${EDINET_API_KEY}`;
            const res = await fetch(url);
            if (!res.ok) continue;

            const data = await res.json();
            const report = data.results?.find(doc =>
                doc.edinetCode === TEST_CODE &&
                doc.docTypeCode === '120' // Yuho
            );

            if (report) {
                console.log(`Found report: ${report.docDescription} (${dateStr})`);
                docId = report.docID;
                break;
            }
        } catch (e) {
            // ignore
        }
        await new Promise(r => setTimeout(r, 200));
    }

    if (!docId) {
        console.error('Report not found');
        return;
    }

    // 2. Download
    console.log(`Downloading ${docId}...`);
    const zipPath = path.join(__dirname, 'temp_sh.zip');
    const extractPath = path.join(__dirname, 'temp_sh');

    const dlUrl = `${EDINET_BASE_URL}/documents/${docId}?type=1&Subscription-Key=${EDINET_API_KEY}`;
    const res = await fetch(dlUrl);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(zipPath, Buffer.from(buffer));

    // 3. Unzip
    console.log('Unzipping...');
    if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
    }
    fs.mkdirSync(extractPath);

    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`);

    // 4. Search text
    console.log('Searching files for Major Shareholders...');

    function searchFiles(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fp = path.join(dir, file);
            if (fs.statSync(fp).isDirectory()) {
                searchFiles(fp);
            } else if (file.endsWith('.htm') || file.endsWith('.html')) {
                const content = fs.readFileSync(fp, 'utf-8');
                // Look for Major Shareholders section or tag
                // Usually "大株主の状況"
                if (content.includes('大株主の状況') || content.includes('MajorShareholders')) {
                    console.log(`Match found in ${file}`);

                    // Extract a snippet around "大株主の状況"
                    const idx = content.indexOf('大株主の状況');
                    console.log('Snippet around "大株主の状況":');
                    console.log(content.substring(idx, idx + 500));

                    // Try to find ix:nonNumeric tags related to it
                    const matches = content.matchAll(/<ix:nonNumeric[^>]*name="([^"]+)"[^>]*>([^<]+)<\/ix:nonNumeric>/g);
                    let foundRelevant = false;
                    for (const m of matches) {
                        if (m[1].includes('MajorShareholders') || m[1].includes('ShareholderName')) {
                            console.log(`Tag: ${m[1]} -> ${m[2].substring(0, 50)}...`);
                            foundRelevant = true;
                        }
                    }
                    if (!foundRelevant) {
                        // Search for text block if individual tags aren't obvious
                        const blockMatches = content.matchAll(/<ix:nonNumeric[^>]*name="([^"]+)"[^>]*>/g);
                        for (const m of blockMatches) {
                            if (m[1].includes('MajorShareholders')) {
                                console.log(`Potential Block Tag: ${m[1]}`);
                            }
                        }
                    }
                }
            }
        }
    }

    searchFiles(extractPath);

    // Cleanup
    // fs.unlinkSync(zipPath);
    // fs.rmSync(extractPath, { recursive: true, force: true });
}

downloadAndInspect();
