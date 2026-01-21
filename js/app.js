/**
 * メインアプリケーション
 * 各モジュールを統合して動作させる
 */

const App = {
    data: null,
    currentCompanyIndex: 0,

    /**
     * アプリケーションを初期化
     */
    async init() {
        try {
            // JSONデータを読み込み
            await this.loadData();

            // 地図を初期化
            MapModule.init();

            // 企業セレクタを設定
            this.setupCompanySelector();

            // インポート機能を設定
            this.setupImportModal();

            // 最初の企業を表示
            this.displayCompany(0);

            console.log('アプリケーションの初期化が完了しました');
        } catch (error) {
            console.error('初期化エラー:', error);
            this.showError('データの読み込みに失敗しました。');
        }
    },

    /**
     * JSONデータを読み込み
     */
    async loadData() {
        const response = await fetch('data/companies.json');
        if (!response.ok) {
            throw new Error('データファイルが見つかりません');
        }
        this.data = await response.json();

        // 業種データを読み込み
        try {
            const industryResponse = await fetch('data/industry_codes.json');
            if (industryResponse.ok) {
                this.industryData = await industryResponse.json();
            }
        } catch (e) {
            console.error('業種データの読み込みに失敗:', e);
            this.industryData = { mapping: {}, industries: [] };
        }
    },

    /**
     * 企業タブを設定
     */
    setupCompanySelector() {
        // タブを描画
        // タブを描画
        this.renderTabs();

        // 業種検索を追加
        this.setupIndustrySearch();
    },

    /**
     * 業種検索を設定
     */
    setupIndustrySearch() {
        const header = document.querySelector('header');
        if (!header) return;

        // 既存の検索ボックスがあれば削除
        const existingSearch = document.getElementById('industry-search-container');
        if (existingSearch) existingSearch.remove();

        const searchContainer = document.createElement('div');
        searchContainer.id = 'industry-search-container';
        searchContainer.style.cssText = `
            margin-left: 20px;
            display: inline-block;
        `;

        const select = document.createElement('select');
        select.id = 'industry-search';
        select.style.cssText = `
            padding: 8px;
            border-radius: 4px;
            border: 1px solid #ccc;
            background: #1e293b;
            color: white;
        `;

        // オプションを追加
        select.innerHTML = '<option value="">全業種</option>';
        if (this.industryData && this.industryData.industries) {
            this.industryData.industries.forEach(industry => {
                select.innerHTML += `<option value="${industry}">${industry}</option>`;
            });
        }

        select.addEventListener('change', (e) => {
            this.filterByIndustry(e.target.value);
        });

        searchContainer.appendChild(select);

        // ヘッダーの適切な位置に挿入（タイトルの後など）
        const title = header.querySelector('h1');
        if (title) {
            title.parentNode.insertBefore(searchContainer, title.nextSibling);
        } else {
            header.appendChild(searchContainer);
        }
    },

    /**
     * 業種でフィルタリング
     * @param {string} industry - 業種名
     */
    filterByIndustry(industry) {
        const tabsContainer = document.getElementById('company-tabs');
        if (!industry) {
            // 全表示
            tabsContainer.querySelectorAll('.company-tab').forEach(tab => {
                tab.style.display = 'flex';
            });
            return;
        }

        this.data.companies.forEach((company, index) => {
            const tab = tabsContainer.querySelector(`.company-tab[data-index="${index}"]`);
            if (tab) {
                if (company.industry === industry) {
                    tab.style.display = 'flex';
                } else {
                    tab.style.display = 'none';
                }
            }
        });
    },

    /**
     * タブを描画
     */
    renderTabs() {
        const tabsContainer = document.getElementById('company-tabs');

        tabsContainer.innerHTML = this.data.companies.map((company, index) => `
            <button class="company-tab ${index === this.currentCompanyIndex ? 'active' : ''}" 
                    data-index="${index}">
                <span class="tab-label">${company.code} ${company.name}</span>
                <span class="tab-close" data-index="${index}" title="削除">×</span>
            </button>
        `).join('');

        // タブクリックイベント
        tabsContainer.querySelectorAll('.company-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // 削除ボタンのクリックは除外
                if (e.target.classList.contains('tab-close')) return;

                const index = parseInt(tab.dataset.index);
                this.displayCompany(index);
                this.updateActiveTab(index);
            });
        });

        // 削除ボタンクリックイベント
        tabsContainer.querySelectorAll('.tab-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(closeBtn.dataset.index);
                this.deleteCompany(index);
            });
        });
    },

    /**
     * アクティブタブを更新
     * @param {number} index - アクティブにするインデックス
     */
    updateActiveTab(index) {
        document.querySelectorAll('.company-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });
    },

    /**
     * 企業を削除
     * @param {number} index - 削除するインデックス
     */
    deleteCompany(index) {
        // 最後の1つは削除できない
        if (this.data.companies.length <= 1) {
            this.showToast('⚠️ 最後の企業は削除できません');
            return;
        }

        const company = this.data.companies[index];

        // 確認ダイアログ
        if (!confirm(`「${company.name}」を削除しますか？`)) {
            return;
        }

        // 削除
        this.data.companies.splice(index, 1);

        // 現在表示中の企業が削除された場合
        if (this.currentCompanyIndex === index) {
            // 前の企業を表示（なければ0）
            this.currentCompanyIndex = Math.max(0, index - 1);
        } else if (this.currentCompanyIndex > index) {
            // インデックスがずれるので調整
            this.currentCompanyIndex--;
        }

        // タブを再描画
        this.renderTabs();

        // 企業を表示
        this.displayCompany(this.currentCompanyIndex);

        this.showToast(`🗑️ ${company.name} を削除しました`);
    },

    /**
     * 企業オプションを更新（互換性のため残す）
     */
    updateCompanyOptions() {
        this.renderTabs();
    },

    /**
     * インポートモーダルを設定
     */
    setupImportModal() {
        const modal = document.getElementById('import-modal');
        const importBtn = document.getElementById('import-btn');
        const closeBtn = document.getElementById('modal-close');
        const cancelBtn = document.getElementById('import-cancel');
        const submitBtn = document.getElementById('import-submit');
        const jsonInput = document.getElementById('json-input');
        const errorDiv = document.getElementById('import-error');

        // モーダルを開く
        importBtn.addEventListener('click', () => {
            modal.classList.add('active');
            jsonInput.value = '';
            errorDiv.classList.remove('visible');
            jsonInput.focus();
        });

        // モーダルを閉じる
        const closeModal = () => {
            modal.classList.remove('active');
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // 背景クリックでも閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });

        // インポート実行
        submitBtn.addEventListener('click', () => {
            this.importJSON(jsonInput.value);
        });

        // Ctrl+Enterでもインポート
        jsonInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.importJSON(jsonInput.value);
            }
        });

        // EDINETボタン
        const edinetBtn = document.getElementById('edinet-btn');
        edinetBtn.addEventListener('click', () => {
            this.showEDINETDialog();
        });
    },

    /**
     * EDINETダイアログを表示
     */
    async showEDINETDialog() {
        const edinetCode = prompt('EDINETコードを入力してください\n\n例:\nE02144 (トヨタ自動車)\nE04425 (ソフトバンクグループ)\nE01967 (キーエンス)');

        if (!edinetCode) return;

        this.showToast('📡 EDINET APIから取得中...');

        try {
            // 最新の有価証券報告書を検索
            const report = await EDINETIntegration.findLatestReport(edinetCode.trim());

            if (!report) {
                this.showToast('❌ 有価証券報告書が見つかりませんでした');
                return;
            }

            this.showToast(`📄 ${report.filerName} の報告書を発見`);

            // XBRLダウンロード
            const xbrlBlob = await EDINETIntegration.downloadXBRL(report.docID);

            this.showToast('📦 XBRLファイルをダウンロード中...');

            // ZIPを解凍
            const zip = await JSZip.loadAsync(xbrlBlob);

            // iXBRL HTMLファイルを探す
            const htmlFiles = Object.keys(zip.files).filter(name =>
                name.includes('0105320') && name.endsWith('.htm')
            );

            if (htmlFiles.length === 0) {
                this.showToast('❌ 財務諸表ファイルが見つかりませんでした');
                return;
            }

            // HTMLファイルを読み込み
            const htmlContent = await zip.files[htmlFiles[0]].async('string');

            // 財務データを抽出
            const financialData = EDINETIntegration.extractFinancialData(htmlContent);

            // companies.json形式に変換
            const companyData = EDINETIntegration.convertToCompanyFormat(financialData, report);

            // データを追加
            const existingIndex = this.data.companies.findIndex(c => c.code === companyData.code);

            if (existingIndex >= 0) {
                this.data.companies[existingIndex] = companyData;
            } else {
                this.data.companies.push(companyData);
            }

            // 表示を更新
            this.currentCompanyIndex = existingIndex >= 0 ? existingIndex : this.data.companies.length - 1;
            this.renderTabs();
            this.displayCompany(this.currentCompanyIndex);

            this.showToast(`✅ ${companyData.name} を取得しました`);

        } catch (error) {
            console.error('EDINETエラー:', error);
            this.showToast(`❌ エラー: ${error.message}`);
        }
    },

    /**
     * JSONをインポート
     * @param {string} jsonString - JSON文字列
     */
    importJSON(jsonString) {
        const errorDiv = document.getElementById('import-error');
        const modal = document.getElementById('import-modal');

        try {
            // JSONをパース
            const companyData = JSON.parse(jsonString);

            // バリデーション
            if (!this.validateCompanyData(companyData)) {
                throw new Error('必須フィールドが不足しています（code, name, financials, assets）');
            }

            // 既存の企業かチェック
            const existingIndex = this.data.companies.findIndex(c => c.code === companyData.code);

            if (existingIndex >= 0) {
                // 既存の企業を更新
                this.data.companies[existingIndex] = companyData;
                console.log(`企業データを更新しました: ${companyData.name}`);
            } else {
                // 新しい企業を追加
                this.data.companies.push(companyData);
                console.log(`新しい企業を追加しました: ${companyData.name}`);
            }

            // タブを更新
            this.currentCompanyIndex = existingIndex >= 0 ? existingIndex : this.data.companies.length - 1;
            this.renderTabs();
            this.displayCompany(this.currentCompanyIndex);

            // モーダルを閉じる
            modal.classList.remove('active');

            // 成功メッセージ
            this.showToast(`✅ ${companyData.name} をインポートしました`);

        } catch (error) {
            console.error('インポートエラー:', error);
            errorDiv.textContent = `❌ エラー: ${error.message}`;
            errorDiv.classList.add('visible');
        }
    },

    /**
     * 企業データのバリデーション
     * @param {Object} data - 企業データ
     * @returns {boolean} 有効かどうか
     */
    validateCompanyData(data) {
        const requiredFields = ['code', 'name', 'financials', 'assets'];
        return requiredFields.every(field => data.hasOwnProperty(field));
    },

    /**
     * トースト通知を表示
     * @param {string} message - メッセージ
     */
    showToast(message) {
        // 既存のトーストを削除
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // トーストを作成
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e293b;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);

        // 3秒後に消す
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * 企業情報を表示
     * @param {number} index - 企業のインデックス
     */
    displayCompany(index) {
        this.currentCompanyIndex = index;
        const company = this.data.companies[index];

        // ヘッダー情報を更新
        this.updateHeader(company);

        // 地図マーカーを設定
        MapModule.setMarkers(company.assets);

        // 指標を表示
        IndicatorsModule.renderIndicators(company);

        // グラフを描画
        ChartModule.renderAll(company);

        // テーブルを初期化
        TableModule.init(company.assets);
    },

    /**
     * ヘッダー情報を更新
     * @param {Object} company - 企業データ
     */
    updateHeader(company) {
        // 企業名
        document.getElementById('company-name').textContent = company.name;

        // 証券コード
        document.getElementById('company-code').textContent = company.code;

        // 業種
        document.getElementById('company-industry').textContent = company.industry;

        // 決算月
        document.getElementById('fiscal-year').textContent = `決算: ${company.fiscalYearEnd}月`;

        // 大株主と属性を表示するエリアを作成/更新
        let shareholderInfo = document.getElementById('shareholder-info');
        if (!shareholderInfo) {
            shareholderInfo = document.createElement('div');
            shareholderInfo.id = 'shareholder-info';
            shareholderInfo.style.cssText = `
                margin-top: 10px;
                font-size: 14px;
                color: #e2e8f0;
                background: rgba(255, 255, 255, 0.1);
                padding: 10px;
                border-radius: 8px;
            `;
            // ヘッダー情報コンテナの下に追加
            const headerInfo = document.querySelector('.header-info'); // クラス名は推測、確認が必要
            if (headerInfo) {
                headerInfo.parentNode.insertBefore(shareholderInfo, headerInfo.nextSibling);
            } else {
                // なければ適当な場所（stock-priceの親など）に追加
                const stockPrice = document.getElementById('stock-price');
                if (stockPrice) stockPrice.parentNode.parentNode.appendChild(shareholderInfo);
            }
        }

        // 内容を更新
        let attributeHtml = '';
        if (company.attribute) {
            attributeHtml = `<span style="
                background: #3b82f6; 
                color: white; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 12px; 
                margin-right: 10px;
                font-weight: bold;
            ">${company.attribute}</span>`;
        }

        const shareholdersText = company.shareholders && company.shareholders.length > 0
            ? company.shareholders.join(', ')
            : '不明';

        shareholderInfo.innerHTML = `
            <div style="display: flex; align-items: center;">
                ${attributeHtml}
                <span><strong>筆頭株主等:</strong> ${shareholdersText}</span>
            </div>
        `;

        // 株価
        document.getElementById('stock-price').textContent =
            company.stockPrice.toLocaleString();

        // 時価総額（億円）
        const marketCap = (company.stockPrice * company.sharesOutstanding) / 100000000;
        document.getElementById('market-cap').textContent =
            Math.round(marketCap).toLocaleString();
    },

    /**
     * エラーメッセージを表示
     * @param {string} message - エラーメッセージ
     */
    showError(message) {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div style="
                text-align: center;
                padding: 60px 20px;
                background: #fff;
                border-radius: 12px;
                margin: 40px auto;
                max-width: 500px;
            ">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h2 style="margin-bottom: 12px; color: #1e293b;">エラーが発生しました</h2>
                <p style="color: #64748b;">${message}</p>
                <p style="color: #94a3b8; font-size: 13px; margin-top: 16px;">
                    data/companies.json ファイルが正しく配置されているか確認してください。
                </p>
            </div>
        `;
    }
};

// トーストアニメーション用のスタイルを追加
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// グローバルに公開
window.App = App;

