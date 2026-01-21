/**
 * XBRL ZIP解凍スクリプト
 * ZIPファイルを解凍してファイル一覧を表示
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function analyzeXBRL() {
    console.log('=== XBRL ファイル解析 ===\n');

    const zipPath = path.join(__dirname, '../data/xbrl/S100VWVY.zip');
    const extractPath = path.join(__dirname, '../data/xbrl/S100VWVY');

    try {
        // PowerShellでZIP解凍
        console.log('ZIP解凍中...');

        if (!fs.existsSync(extractPath)) {
            fs.mkdirSync(extractPath, { recursive: true });
        }

        const command = `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force"`;
        execSync(command, { stdio: 'inherit' });

        console.log(`✓ 解凍完了: ${extractPath}\n`);

        // ファイル一覧を取得
        function getFiles(dir, fileList = []) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    getFiles(filePath, fileList);
                } else {
                    fileList.push({
                        name: path.relative(extractPath, filePath),
                        size: stat.size,
                        ext: path.extname(file).toLowerCase()
                    });
                }
            });
            return fileList;
        }

        const allFiles = getFiles(extractPath);
        console.log(`総ファイル数: ${allFiles.length}\n`);

        // ファイルタイプ別に分類
        const fileTypes = {};
        allFiles.forEach(file => {
            if (!fileTypes[file.ext]) {
                fileTypes[file.ext] = [];
            }
            fileTypes[file.ext].push(file);
        });

        // ファイルタイプ別に表示
        console.log('=== ファイルタイプ別集計 ===');
        Object.keys(fileTypes).sort().forEach(ext => {
            const files = fileTypes[ext];
            const totalSize = files.reduce((sum, f) => sum + f.size, 0);
            console.log(`\n${ext || '(拡張子なし)'}: ${files.length}件 (合計: ${(totalSize / 1024).toFixed(2)} KB)`);

            // 最初の3件を表示
            files.slice(0, 3).forEach(f => {
                console.log(`  - ${f.name} (${(f.size / 1024).toFixed(2)} KB)`);
            });
            if (files.length > 3) {
                console.log(`  ... 他 ${files.length - 3}件`);
            }
        });

        // CSVファイルを探す
        const csvFiles = fileTypes['.csv'] || [];
        if (csvFiles.length > 0) {
            console.log('\n\n=== CSVファイル詳細 ===');
            csvFiles.forEach(f => {
                console.log(`${f.name} (${(f.size / 1024).toFixed(2)} KB)`);
            });

            // 最初のCSVファイルの内容を表示
            console.log('\n\n=== CSVファイルサンプル(最初のCSV) ===');
            const firstCsvPath = path.join(extractPath, csvFiles[0].name);
            const csvContent = fs.readFileSync(firstCsvPath, 'utf-8');
            const lines = csvContent.split('\n').slice(0, 10);
            lines.forEach((line, i) => {
                console.log(`${i + 1}: ${line.substring(0, 150)}${line.length > 150 ? '...' : ''}`);
            });
        }

        // XBRLファイルを探す
        const xbrlFiles = fileTypes['.xbrl'] || [];
        if (xbrlFiles.length > 0) {
            console.log('\n\n=== XBRLファイル詳細 ===');
            xbrlFiles.forEach(f => {
                console.log(`${f.name} (${(f.size / 1024).toFixed(2)} KB)`);
            });
        }

    } catch (error) {
        console.error('エラー:', error.message);
    }
}

analyzeXBRL().catch(console.error);
