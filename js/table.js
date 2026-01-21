/**
 * テーブルモジュール
 * 資産一覧テーブルの表示と地図連動
 */

const TableModule = {
    assets: [],
    currentFilter: 'all',
    isCollapsed: true,  // 初期状態は閉じている

    /**
     * テーブルを初期化
     * @param {Array} assets - 資産配列
     */
    init(assets) {
        // 本社を先頭にソート
        this.assets = this.sortAssets(assets);
        this.renderTable(this.assets);
        this.setupFilterButtons();
        this.setupAccordion();
    },

    /**
     * 資産を本社優先でソート
     * @param {Array} assets - 資産配列
     * @returns {Array} ソート済み資産配列
     */
    sortAssets(assets) {
        return [...assets].sort((a, b) => {
            // 本社を最優先
            const aIsHQ = a.usage && (a.usage.includes('本社') || a.name.includes('本社'));
            const bIsHQ = b.usage && (b.usage.includes('本社') || b.name.includes('本社'));

            if (aIsHQ && !bIsHQ) return -1;
            if (!aIsHQ && bIsHQ) return 1;
            return 0;
        });
    },

    /**
     * アコーディオンを設定
     */
    setupAccordion() {
        const header = document.getElementById('assets-accordion-header');
        const content = document.getElementById('assets-accordion-content');

        if (!header || !content) return;

        // 二重登録防止
        if (header.dataset.initialized) return;
        header.dataset.initialized = 'true';

        // 初期状態で閉じる
        header.classList.add('collapsed');
        content.classList.add('collapsed');

        header.addEventListener('click', (e) => {
            // フィルターボタンのクリックは除外
            if (e.target.closest('.table-filters')) return;

            this.isCollapsed = !this.isCollapsed;
            header.classList.toggle('collapsed', this.isCollapsed);
            content.classList.toggle('collapsed', this.isCollapsed);
        });
    },

    /**
     * テーブルを描画
     * @param {Array} assets - 資産配列
     */
    renderTable(assets) {
        const tbody = document.getElementById('assets-tbody');

        tbody.innerHTML = assets.map((asset, index) => {
            const typeLabel = asset.type === 'land' ? '土地' : '建物';
            const typeClass = asset.type;
            const areaValue = asset.type === 'land'
                ? (asset.area ? asset.area.toLocaleString() : '-')
                : (asset.floorArea ? asset.floorArea.toLocaleString() : '-');

            // 本社はハイライト表示
            const isHQ = asset.usage && (asset.usage.includes('本社') || asset.name.includes('本社'));
            const hqClass = isHQ ? 'hq-row' : '';

            return `
                <tr data-index="${index}" data-type="${asset.type}" class="${hqClass}">
                    <td><span class="type-badge ${typeClass}">${typeLabel}</span></td>
                    <td>${asset.name}</td>
                    <td>${asset.address}</td>
                    <td>${areaValue}</td>
                    <td>${asset.bookValue ? asset.bookValue.toLocaleString() : '-'}</td>
                    <td>${asset.usage || '-'}</td>
                </tr>
            `;
        }).join('');

        // 行クリックイベントを設定
        this.setupRowClickEvents();
    },

    /**
     * 行クリックイベントを設定
     */
    setupRowClickEvents() {
        const rows = document.querySelectorAll('#assets-tbody tr');

        rows.forEach(row => {
            row.addEventListener('click', () => {
                const index = parseInt(row.dataset.index);
                const asset = this.assets[index];

                // 地図をズーム
                if (window.MapModule) {
                    window.MapModule.zoomToAsset(asset, index);
                }

                // ハイライト
                this.highlightRow(index);
            });
        });
    },

    /**
     * 特定の行をハイライト
     * @param {number} index - 行のインデックス
     */
    highlightRow(index) {
        // 既存のハイライトを解除
        document.querySelectorAll('#assets-tbody tr.highlighted').forEach(row => {
            row.classList.remove('highlighted');
        });

        // 新しいハイライトを追加
        const row = document.querySelector(`#assets-tbody tr[data-index="${index}"]`);
        if (row) {
            row.classList.add('highlighted');

            // スクロールして表示
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    /**
     * フィルターボタンを設定
     */
    setupFilterButtons() {
        const buttons = document.querySelectorAll('.filter-btn');

        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();  // アコーディオンのクリックを防ぐ

                const filter = button.dataset.filter;
                this.applyFilter(filter);

                // ボタンのアクティブ状態を更新
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    },

    /**
     * フィルターを適用
     * @param {string} filter - 'all', 'land', 'building'
     */
    applyFilter(filter) {
        this.currentFilter = filter;
        const rows = document.querySelectorAll('#assets-tbody tr');

        rows.forEach(row => {
            const type = row.dataset.type;
            if (filter === 'all' || type === filter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // 地図のマーカーもフィルタリング
        if (window.MapModule) {
            window.MapModule.filterMarkers(this.assets, filter);
        }
    },

    /**
     * アコーディオンを開く
     */
    expand() {
        const header = document.getElementById('assets-accordion-header');
        const content = document.getElementById('assets-accordion-content');

        if (header && content) {
            this.isCollapsed = false;
            header.classList.remove('collapsed');
            content.classList.remove('collapsed');
        }
    },

    /**
     * テーブル内容をリセット
     * @param {Array} assets - 新しい資産配列
     */
    reset(assets) {
        this.assets = this.sortAssets(assets);
        this.currentFilter = 'all';
        this.renderTable(this.assets);

        // フィルターボタンをリセット
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === 'all') {
                btn.classList.add('active');
            }
        });
    }
};

// グローバルに公開
window.TableModule = TableModule;

