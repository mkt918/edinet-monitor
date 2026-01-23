/**
 * EDINET Monitor - Frontend Application
 */

const API_BASE = '';

// ===== State =====
let state = {
    reports: [],
    watchlist: [],
    stats: null,
    detailsCache: {}, // docId -> details のキャッシュ
    filters: {
        date: '',
        search: '',
        type: '',
        industry: '',
        watchedOnly: false,
        articlesOnly: false,
        dateStart: '',
        dateEnd: ''
    },
    pagination: {
        limit: 500,
        offset: 0,
        hasMore: false
    }
};

// ===== DOM Elements =====
const elements = {
    reportsList: document.getElementById('reportsList'),
    todayCount: document.getElementById('todayCount'),
    lastUpdated: document.getElementById('lastUpdated'),
    watchlistCount: document.getElementById('watchlistCount'),
    reportCount: document.getElementById('reportCount'),
    dateFilterStart: document.getElementById('dateFilterStart'),
    dateFilterEnd: document.getElementById('dateFilterEnd'),
    searchFilter: document.getElementById('searchFilter'),
    typeFilter: document.getElementById('typeFilter'),
    industryFilter: document.getElementById('industryFilter'),
    watchedOnlyFilter: document.getElementById('watchedOnlyFilter'),
    articlesOnlyFilter: document.getElementById('articlesOnlyFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    watchlistModalBtn: document.getElementById('watchlistModalBtn'),
    watchlistModal: document.getElementById('watchlistModal'),
    closeModal: document.getElementById('closeModal'),
    watchlistItems: document.getElementById('watchlistItems'),
    watchlistInput: document.getElementById('watchlistInput'),
    addWatchlistBtn: document.getElementById('addWatchlistBtn'),
    // ページネーション
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    dashboardModal: document.getElementById('dashboardModal'),
    closeDashboardModal: document.getElementById('closeDashboardModal'),
    dashboardTitle: document.getElementById('dashboardTitle'),
    dashboardDocsList: document.getElementById('dashboardDocsList'),
    linkGoogleFinance: document.getElementById('linkGoogleFinance'),
    linkGoogleFinance: document.getElementById('linkGoogleFinance'),
    linkYahooFinance: document.getElementById('linkYahooFinance'),
    // 詳細検索
    toggleAdvancedSearchBtn: document.getElementById('toggleAdvancedSearchBtn'),
    filterAdvanced: document.getElementById('filterAdvanced')
};

// ===== API Functions =====

async function fetchReports(options = {}) {
    const params = new URLSearchParams();
    if (options.date) params.append('date', options.date);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.search) params.append('search', options.search);
    if (options.industry) params.append('industry', options.industry);

    // ページネーション
    if (options.limit) params.append('limit', options.limit);
    if (options.offset) params.append('offset', options.offset);

    // limit未指定かつ日付指定がある場合はデフォルトを増やす（バックアップ）
    if (!options.limit && (options.startDate || options.endDate)) {
        params.append('limit', '500');
    }

    const response = await fetch(`${API_BASE}/api/reports?${params}`);
    const data = await response.json();
    return data.success ? data.data : [];
}

async function fetchLiveReports(date) {
    const response = await fetch(`${API_BASE}/api/reports/live?date=${date || ''}`);
    const data = await response.json();
    return data.success ? data : null;
}

async function fetchStats() {
    const response = await fetch(`${API_BASE}/api/stats`);
    const data = await response.json();
    return data.success ? data.data : null;
}

async function fetchWatchlist() {
    const response = await fetch(`${API_BASE}/api/watchlist`);
    const data = await response.json();
    return data.success ? data.data : [];
}

async function addWatchlistItem(name) {
    const response = await fetch(`${API_BASE}/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'filer', name })
    });
    return (await response.json()).success;
}

async function removeWatchlistItem(id) {
    const response = await fetch(`${API_BASE}/api/watchlist/${id}`, {
        method: 'DELETE'
    });
    return (await response.json()).success;
}

async function refreshData() {
    const response = await fetch(`${API_BASE}/api/refresh`, { method: 'POST' });
    return (await response.json()).success;
}

async function fetchReportDetails(docId) {
    try {
        const response = await fetch(`${API_BASE}/api/reports/${docId}/details`);
        const data = await response.json();
        return data.success ? data.data : null;
    } catch (e) {
        console.error('Error fetching details:', e);
        return null;
    }
}

async function fetchIssuerAttributes(edinetCode) {
    if (!edinetCode) return { success: false, message: 'EDINETコード不明' };

    try {
        const response = await fetch(`${API_BASE}/api/issuer/${encodeURIComponent(edinetCode)}/attributes`);
        if (!response.ok) {
            return { success: false, message: `取得エラー (${response.status})` };
        }
        const data = await response.json();
        return data;
    } catch (e) {
        console.error('Error fetching attributes:', e);
        return { success: false, message: '通信エラー' };
    }
}

// ===== Render Functions =====

function renderStats() {
    if (!state.stats) return;

    elements.todayCount.textContent = state.stats.todayCount || 0;
    elements.watchlistCount.textContent = state.watchlist.length || 0;

    if (state.stats.scheduler?.lastRun) {
        const time = new Date(state.stats.scheduler.lastRun);
        elements.lastUpdated.textContent = time.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

async function fetchIssuerDocuments(edinetCode) {
    try {
        const response = await fetch(`${API_BASE}/api/issuer/${edinetCode}/documents`);
        const data = await response.json();
        return data.success ? data.data : [];
    } catch (e) {
        console.error('Error fetching issuer documents:', e);
        return [];
    }
}

async function fetchFilerDocuments(edinetCode) {
    try {
        const response = await fetch(`${API_BASE}/api/filer/${edinetCode}/documents`);
        const data = await response.json();
        return data.success ? data.data : [];
    } catch (e) {
        console.error('Error fetching filer documents:', e);
        return [];
    }
}

function renderReports() {
    const filtered = filterReports();
    const filterText = state.filters.search || '';

    if (filtered.length === 0) {
        elements.reportsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">報告書が見つかりません</div>
      </div>
    `;
        elements.reportCount.textContent = '0件';
        return;
    }

    elements.reportCount.textContent = `${filtered.length}件`;

    elements.reportsList.innerHTML = filtered.map(report => {
        const isWatched = isInWatchlist(report.filer_name);
        const typeClass = getTypeClass(report.report_type);


        return `
      <div class="report-item ${isWatched ? 'watched' : ''}" data-doc-id="${report.doc_id}">
        <div class="report-main-info">
          <div class="report-header-row">
            <div class="report-filer-section">
              ${isWatched ? '<span class="watch-star">⭐</span>' : ''}
              <a href="#" class="report-filer issuer-link" 
                 data-edinet-code="${escapeHtml(report.edinet_code)}" 
                 data-issuer-name="${escapeHtml(report.filer_name)}"
                 data-type="filer">
                 ${highlightMatch(report.filer_name, filterText)}
              </a>
              <button class="action-btn action-watch ${isWatched ? 'watched' : ''} btn-filer-favorite" data-name="${escapeHtml(report.filer_name)}" title="${isWatched ? 'お気に入り' : 'お気に入りに追加'}">
                ${isWatched ? '⭐' : '☆'}
              </button>
              <span class="report-type ${typeClass}">${escapeHtml(report.report_type || '大量保有報告書')}</span>
            </div>
            <div class="report-meta-inline">
              <span class="meta-item">📅 ${formatDateTime(report.submit_date_time)}</span>
              ${report.sec_code ? `<span class="meta-item">🏷️ ${report.sec_code}</span>` : ''}
            </div>
          </div>
          <div class="report-description-row">${escapeHtml(report.doc_description || '')}</div>
        </div>
        <div class="report-details-compact" id="details-${report.doc_id}" data-doc-id="${report.doc_id}">
          <div class="details-loading-sm">📊</div>
        </div>
        <div class="report-actions-compact">
          ${report.pdf_flag ? `
            <button class="action-btn action-pdf-text" data-doc-id="${report.doc_id}" title="PDFを開く">
              PDF
            </button>
          ` : ''}
        </div>
      </div>
    `;
    }).join('');

    // 過建延込み読み込みをセットアップ（Intersection Observer）
    setupDetailsObserver();

    // もっと見るボタンの表示制御
    if (elements.loadMoreContainer) {
        if (state.pagination.hasMore) {
            elements.loadMoreContainer.style.display = 'block';
        } else {
            elements.loadMoreContainer.style.display = 'none';
        }
    }
}

function renderWatchlist() {
    if (state.watchlist.length === 0) {
        elements.watchlistItems.innerHTML = '<p class="empty-state-text">お気に入り登録がありません</p>';
        return;
    }

    elements.watchlistItems.innerHTML = state.watchlist.map(item => `
    <div class="watchlist-item">
      <span class="watchlist-item-name">${escapeHtml(item.name)}</span>
      <button class="watchlist-item-remove" data-id="${item.id}">✕</button>
    </div>
  `).join('');

    elements.watchlistItems.querySelectorAll('.watchlist-item-remove').forEach(btn => {
        btn.addEventListener('click', async () => {
            await removeWatchlistItem(btn.dataset.id);
            await loadWatchlist();
            renderReports();
        });
    });
}

// ===== Filter Functions =====

function filterReports() {
    return state.reports.filter(report => {
        // 日付範囲フィルター
        if (state.filters.dateStart || state.filters.dateEnd) {
            const reportDate = report.submit_date_time?.split(' ')[0]; // YYYY-MM-DD部分を取得
            if (!reportDate) return false;

            if (state.filters.dateStart && reportDate < state.filters.dateStart) {
                return false;
            }
            if (state.filters.dateEnd && reportDate > state.filters.dateEnd) {
                return false;
            }
        }

        // 検索フィルター
        if (state.filters.search) {
            const search = state.filters.search.toLowerCase();
            if (!report.filer_name?.toLowerCase().includes(search)) {
                return false;
            }
        }

        // 種別フィルター
        if (state.filters.type) {
            if (!report.report_type?.includes(state.filters.type)) {
                return false;
            }
        }

        // 監視対象のみフィルター
        if (state.filters.watchedOnly) {
            if (!isInWatchlist(report.filer_name)) {
                return false;
            }
        }

        // 定款変更のみフィルター
        if (state.filters.articlesOnly) {
            const hasTeikanInType = report.report_type?.includes('定款');
            const hasTeikanInDesc = report.doc_description?.includes('定款');
            if (!hasTeikanInType && !hasTeikanInDesc) {
                return false;
            }
        }

        return true;
    });
}

function isInWatchlist(filerName) {
    if (!filerName) return false;
    return state.watchlist.some(w => filerName.includes(w.name));
}

/**
 * 詳細情報をHTMLにレンダリング
 */


/**
 * 詳細情報をHTMLにレンダリング
 */
function renderDetailsContent(details) {
    const changeClass = details.holdingRatioChange > 0 ? 'positive' :
        details.holdingRatioChange < 0 ? 'negative' : '';

    const isIssuerWatched = details.issuerName && isInWatchlist(details.issuerName);

    return `
        <div class="details-grid-custom">
            <!-- 1行目: 基本情報 -->
            <div class="details-group-basic">
                <div class="detail-item-inline">
                    <span class="detail-label">📈 対象銘柄</span>
                    <a href="https://www.google.com/search?q=${encodeURIComponent(details.issuerName)}%20${encodeURIComponent('有価証券報告書')}" 
                       class="detail-value issuer-link" 
                       data-edinet-code="${details.issuerEdinetCode || ''}"
                       data-issuer-name="${escapeHtml(details.issuerName)}"
                       data-sec-code="${escapeHtml(details.securityCode || '')}"
                       data-type="issuer">
                       ${escapeHtml(details.issuerName || '-')}
                    </a>
                    ${details.issuerName && !isIssuerWatched ? `
                        <button class="btn-add-issuer-watch" data-issuer="${escapeHtml(details.issuerName)}" title="発行者をお気に入りに追加">⭐</button>
                    ` : ''}
                </div>
                <div class="detail-item-inline">
                    <span class="detail-label">🏷️ 証券コード</span>
                    <span class="detail-value">${escapeHtml(details.securityCode || '-')}</span>
                </div>
            </div>
            
            <!-- 2行目: 数値情報 -->
            <div class="details-group-metrics">
                <div class="detail-item-inline">
                    <span class="detail-label">📊 保有割合</span>
                    <span class="detail-value ratio">${details.holdingRatioFormatted || '-'}</span>
                </div>
                <div class="detail-item-inline">
                    <span class="detail-label">📉 前回</span>
                    <span class="detail-value">${details.previousHoldingRatioFormatted || '-'}</span>
                </div>
                <div class="detail-item-inline">
                    <span class="detail-label">📈 変化</span>
                    <span class="detail-value change ${changeClass}">${details.holdingRatioChangeFormatted || '-'}</span>
                </div>
            </div>

            <!-- 3行目: 保有目的 -->
            ${details.purposeOfHolding ? `
            <div class="details-row-purpose">
                <div class="detail-item-full">
                    <span class="detail-label">🎯 保有目的</span>
                    <span class="detail-value purpose">${escapeHtml(details.purposeOfHolding)}</span>
                </div>
            </div>
            ` : ''}
        </div>
        
        <!-- 属性情報・大株主 -->
        <div class="attributes-container">
            <div class="loading-xs">属性確認中...</div>
        </div>
    `;
}

function renderAttributesContent(result) {
    if (!result) return '';

    let html = `<div class="attributes-box">`;

    if (!result.data && result.message) {
        html += `<span class="attr-message">${escapeHtml(result.message)}</span></div>`;
        return html;
    }

    const attrs = result.data;
    if (!attrs) return '';

    // 大株主の表示ロジック変更: 1位のみ表示、残りはアコーディオン
    if (attrs.shareholders && attrs.shareholders.length > 0) {
        // 1位を表示
        const top = attrs.shareholders[0];
        html += `
            <div class="shareholder-top-rank">
                <span class="sh-rank">1.</span>
                <span class="sh-name" title="${escapeHtml(top.name)}">${escapeHtml(top.name)}</span>
                <span class="sh-ratio">${(top.ratio * 100).toFixed(1)}%</span>
            </div>
        `;

        // 2位以下がある場合
        if (attrs.shareholders.length > 1) {
            html += `
                <button class="btn-toggle-shareholders" onclick="toggleShareholders(this)">
                    ▼ 他の大株主を見る (${attrs.shareholders.length - 1}件)
                </button>
                <div class="shareholders-hidden-list" style="display:none;">
            `;

            attrs.shareholders.slice(1).forEach(h => {
                html += `
                    <div class="shareholder-mini-item">
                        <span class="sh-rank">${h.rank}.</span>
                        <span class="sh-name" title="${escapeHtml(h.name)}">${escapeHtml(h.name)}</span>
                        <span class="sh-ratio">${(h.ratio * 100).toFixed(1)}%</span>
                    </div>
                `;
            });

            html += `</div>`;
        }
    } else {
        html += `<span class="attr-message">大株主情報なし</span>`;
    }

    html += `</div>`;
    return html;
}

// グローバルスコープに関数を公開（HTML内のonclickから呼ぶため）
window.toggleShareholders = function (btn) {
    const container = btn.nextElementSibling;
    if (!container) return;

    const isHidden = container.style.display === 'none';
    container.style.display = isHidden ? 'block' : 'none';
    btn.textContent = isHidden ? '▲ 閉じる' : `▼ 他の大株主を見る (${container.children.length}件)`;
    btn.classList.toggle('active', isHidden);
};

// ===== Helper Functions =====

function getTypeClass(type) {
    if (!type) return '';
    if (type.includes('変更')) return 'change';
    if (type.includes('訂正')) return 'correction';
    if (type.includes('定款')) return 'articles';
    return '';
}

function getReportIcon(type) {
    if (!type) return '📑';
    if (type.includes('変更')) return '🔄';
    if (type.includes('訂正')) return '✏️';
    if (type.includes('定款')) return '📜';
    return '📑';
}

function formatDateTime(dt) {
    if (!dt) return '-';
    try {
        const date = new Date(dt);

        // DBにはJSTの時刻がUTCとして保存されているため（例: 17:12 JST -> 17:12 UTC）、
        // 表示時にJSTに変換されると+9時間されてしまう（17:12 UTC -> 02:12 JST）。
        // そのため、ここで9時間引いて元のJST時刻に戻す。
        date.setHours(date.getHours() - 9);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year} /${month}/${day} ${hour}:${minute} `;
    } catch (e) {
        return dt.replace('T', ' ').substring(0, 16);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function highlightMatch(text, query) {
    if (!text) return '';
    if (!query) return escapeHtml(text);

    // 単純な実装: クエリが含まれていれば太字にするなど
    // ここでは単純に文字列を返すだけにします（HTMLエスケープ済み）
    // 本来はマッチ箇所をspanで囲むなどの処理が必要ですが、
    // バグ修正優先のため、まずは正常動作させる実装にします。
    return escapeHtml(text);
}

// ===== Data Loading =====

async function loadStats() {
    state.stats = await fetchStats();
    renderStats();
}

async function loadReports() {
    elements.reportsList.innerHTML = '<div class="loading">読み込み中...</div>';

    // リセット
    state.pagination.offset = 0;
    state.pagination.hasMore = false;

    // 日付範囲指定時は1000件、それ以外は500件
    const limit = (state.filters.dateStart || state.filters.dateEnd) ? 1000 : state.pagination.limit;

    // 現在のフィルター条件でAPIから取得
    const reports = await fetchReports({
        startDate: state.filters.dateStart,
        endDate: state.filters.dateEnd,
        search: state.filters.search,
        industry: state.filters.industry,
        limit: limit,
        offset: 0
    });

    state.reports = reports;
    state.pagination.hasMore = reports.length >= limit;

    renderReports();
}

async function loadMoreReports() {
    elements.loadMoreBtn.disabled = true;
    elements.loadMoreBtn.textContent = '読み込み中...';

    try {
        state.pagination.offset += state.pagination.limit;

        const newReports = await fetchReports({
            startDate: state.filters.dateStart,
            endDate: state.filters.dateEnd,
            search: state.filters.search,
            limit: state.pagination.limit,
            offset: state.pagination.offset
        });

        if (newReports.length > 0) {
            state.reports = [...state.reports, ...newReports];
            state.pagination.hasMore = newReports.length >= state.pagination.limit;
        } else {
            state.pagination.hasMore = false;
        }

    } catch (e) {
        console.error('Error loading more reports:', e);
    } finally {
        elements.loadMoreBtn.disabled = false;
        elements.loadMoreBtn.textContent = 'もっと見る';
        renderReports();
    }
}

async function loadWatchlist() {
    state.watchlist = await fetchWatchlist();
    renderWatchlist();
    renderStats();
}

async function refreshAll() {
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.innerHTML = '<span class="btn-icon">⏳</span>更新中...';

    try {
        await refreshData();
        await Promise.all([loadStats(), loadReports(), loadWatchlist()]);
    } finally {
        elements.refreshBtn.disabled = false;
        elements.refreshBtn.innerHTML = '<span class="btn-icon">🔄</span>更新';
    }
}

// ===== Event Handlers =====

function setupEventListeners() {
    // 日付範囲フィルター
    elements.dateFilterStart.addEventListener('change', (e) => {
        state.filters.dateStart = e.target.value;
        loadReports(); // API再取得
    });

    elements.dateFilterEnd.addEventListener('change', (e) => {
        state.filters.dateEnd = e.target.value;
        loadReports(); // API再取得
    });

    elements.searchFilter.addEventListener('input', debounce((e) => {
        state.filters.search = e.target.value;
        loadReports(); // API再取得
    }, 500));

    elements.typeFilter.addEventListener('change', (e) => {
        state.filters.type = e.target.value;
        renderReports();
    });

    elements.industryFilter.addEventListener('change', (e) => {
        state.filters.industry = e.target.value;
        loadReports(); // APIから再取得が必要（サーバーサイドフィルタ）
    });

    // 監視対象のみフィルター
    elements.watchedOnlyFilter.addEventListener('change', (e) => {
        state.filters.watchedOnly = e.target.checked;
        renderReports();
    });

    // 定款変更のみフィルター
    elements.articlesOnlyFilter.addEventListener('change', (e) => {
        state.filters.articlesOnly = e.target.checked;
        renderReports();
    });

    // フィルタークリアボタン
    elements.clearFiltersBtn.addEventListener('click', () => {
        elements.dateFilterStart.value = '';
        elements.dateFilterEnd.value = '';
        elements.searchFilter.value = '';
        elements.typeFilter.value = '';
        elements.industryFilter.value = '';
        elements.watchedOnlyFilter.checked = false;
        elements.articlesOnlyFilter.checked = false;
        state.filters = {
            dateStart: '',
            dateEnd: '',
            search: '',
            type: '',
            industry: '',
            watchedOnly: false,
            articlesOnly: false
        };
        renderReports();
    });

    // 更新ボタン
    elements.refreshBtn.addEventListener('click', refreshAll);

    // 詳細検索トグル
    if (elements.toggleAdvancedSearchBtn) {
        elements.toggleAdvancedSearchBtn.addEventListener('click', () => {
            const isHidden = elements.filterAdvanced.style.display === 'none';
            elements.filterAdvanced.style.display = isHidden ? 'block' : 'none';
            // アイコン切り替え
            const icon = elements.toggleAdvancedSearchBtn.querySelector('.btn-icon');
            if (icon) icon.textContent = isHidden ? '🔼' : '⚙️';
        });
    }



    // クイックフィルター
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // アクティブ状態を切り替え
            document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const range = btn.dataset.range;
            const today = new Date();
            let startDate = '';
            let endDate = '';

            switch (range) {
                case 'today':
                    startDate = endDate = today.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    startDate = weekAgo.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case 'month':
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(today.getMonth() - 1);
                    startDate = monthAgo.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case 'all':
                default:
                    startDate = endDate = '';
                    break;
            }

            elements.dateFilterStart.value = startDate;
            elements.dateFilterEnd.value = endDate;
            state.filters.dateStart = startDate;
            state.filters.dateEnd = endDate;
            loadReports(); // API再取得
        });
    });

    // 監視設定モーダル
    elements.watchlistModalBtn.addEventListener('click', () => {
        elements.watchlistModal.classList.add('active');
    });

    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', () => {
            elements.watchlistModal.classList.remove('active');
        });
    }

    if (elements.closeDashboardModal) {
        elements.closeDashboardModal.addEventListener('click', () => {
            elements.dashboardModal.classList.remove('active');
        });
    }

    // Modal click outside
    window.addEventListener('click', (e) => {
        if (e.target === elements.watchlistModal) {
            elements.watchlistModal.classList.remove('active');
        }
        if (e.target === elements.dashboardModal) {
            elements.dashboardModal.classList.remove('active');
        }
    }); elements.watchlistModal.querySelector('.modal-overlay').addEventListener('click', () => {
        elements.watchlistModal.classList.remove('active');
    });

    // 監視対象追加
    elements.addWatchlistBtn.addEventListener('click', async () => {
        const name = elements.watchlistInput.value.trim();
        if (name) {
            await addWatchlistItem(name);
            elements.watchlistInput.value = '';
            await loadWatchlist();
            renderReports();
        }
    });

    elements.watchlistInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.addWatchlistBtn.click();
        }
    });

    // もっと見るボタン
    if (elements.loadMoreBtn) {
        elements.loadMoreBtn.addEventListener('click', loadMoreReports);
    }

    // --- レポートリスト内のイベント委譲 ---

    // レポート項目クリック（詳細の開閉）
    elements.reportsList.addEventListener('click', (e) => {
        const reportItem = e.target.closest('.report-item');
        if (!reportItem) return;

        // PDFボタンや削除ボタン、リンクなどは除外
        if (e.target.closest('.action-btn') || e.target.closest('.issuer-link')) {
            return;
        }

        const docId = reportItem.dataset.docId;
        const detailsItem = document.getElementById(`details-${docId}`);
        if (detailsItem) {
            detailsItem.classList.toggle('active');
            reportItem.classList.toggle('expanded');
        }
    });

    // リンク・ボタンの委譲
    elements.reportsList.addEventListener('click', async (e) => {
        // 1. お気に入りボタン
        const watchBtn = e.target.closest('.action-watch, .btn-add-issuer-watch');
        if (watchBtn) {
            e.preventDefault();
            e.stopPropagation();
            const name = watchBtn.dataset.name || watchBtn.dataset.issuer;
            if (name) {
                await addWatchlistItem(name);
                await loadWatchlist();
                renderReports();
            }
            return;
        }

        // 2. PDFボタン
        const pdfBtn = e.target.closest('.action-pdf-sm, .action-pdf-text');
        if (pdfBtn) {
            e.preventDefault();
            e.stopPropagation();
            const docId = pdfBtn.dataset.docId;
            if (docId) {
                window.open(`/api/document/${docId}`, '_blank');
            }
            return;
        }

        // 3. 発行者リンク (ダッシュボード)
        const issuerLink = e.target.closest('.issuer-link');
        if (issuerLink) {
            e.preventDefault();
            e.stopPropagation();
            const edinetCode = issuerLink.dataset.edinetCode;
            const issuerName = issuerLink.dataset.issuerName;
            const secCode = issuerLink.dataset.secCode;
            const type = issuerLink.dataset.type || 'filer';

            if (edinetCode) {
                openDashboardV2(edinetCode, issuerName, secCode, type);
            } else {
                window.open(`https://www.google.com/search?q=${encodeURIComponent(issuerName)}`, '_blank');
            }
            return;
        }
    });

    // リスト内の詳細自動読み込みは renderReports 直後に行う必要があるため
    // renderReports 内に一部ロジックを残すか、MutationObserver を使う
    // 現状は renderReports 内で非同期実行しているため、それを維持する（一部修正が必要）
}

// Intersection Observerで画面に表示されたレポートのみ詳細を取得
let detailsObserver = null;

function setupDetailsObserver() {
    // 既存のObserverをクリア
    if (detailsObserver) {
        detailsObserver.disconnect();
    }

    detailsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const detailsDiv = entry.target;
                loadSingleReportDetails(detailsDiv);
                // 一度読み込んだら監視を解除
                detailsObserver.unobserve(detailsDiv);
            }
        });
    }, {
        root: null,
        rootMargin: '100px', // 画面の100px手前で読み込み開始
        threshold: 0.1
    });

    // 各レポートの詳細コンテナを監視
    elements.reportsList.querySelectorAll('.report-details-compact').forEach(detailsDiv => {
        if (detailsDiv.getAttribute('data-loaded') !== 'true') {
            detailsObserver.observe(detailsDiv);
        }
    });
}

async function loadSingleReportDetails(detailsDiv) {
    const docId = detailsDiv.dataset.docId;
    if (!docId || detailsDiv.getAttribute('data-loaded') === 'true') return;

    let details = state.detailsCache[docId];
    if (!details) {
        details = await fetchReportDetails(docId);
        if (details) state.detailsCache[docId] = details;
    }

    if (details) {
        detailsDiv.innerHTML = renderDetailsContent(details);
        detailsDiv.setAttribute('data-loaded', 'true');

        if (details.issuerName && isInWatchlist(details.issuerName)) {
            const reportItem = detailsDiv.closest('.report-item');
            if (reportItem) reportItem.classList.add('highlight');
        }

        // 属性情報
        if (details.issuerEdinetCode) {
            const attrContainer = detailsDiv.querySelector('.attributes-container');
            if (attrContainer) {
                const result = await fetchIssuerAttributes(details.issuerEdinetCode);
                if (result && result.success) {
                    attrContainer.innerHTML = renderAttributesContent(result);
                } else {
                    const msg = (result && result.message) ? result.message : '情報取得エラー';
                    attrContainer.innerHTML = `<span class="attr-message">${escapeHtml(msg)}</span>`;
                }
            }
        }
    }
}

// 互換性のために古い関数も残す（使用しない）
async function autoLoadReportDetails() {
    // 新しい実装はsetupDetailsObserver()に移行
    setupDetailsObserver();
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ===== Notifications =====

async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
    }
}

// ===== Dashboard Functions =====

async function openDashboardV2(edinetCode, issuerName, secCode, type = 'issuer') {
    elements.dashboardTitle.textContent = `${issuerName} の企業ダッシュボード`;
    elements.dashboardModal.classList.add('active');

    // 外部リンク設定
    let linksHtml = '';

    // Google検索ボタン
    linksHtml += `<a href="https://www.google.com/search?q=${encodeURIComponent(issuerName)}" target="_blank" class="dashboard-link-btn">Google検索</a>`;

    if (type === 'issuer') {
        const code = secCode ? secCode.substring(0, 4) : null;
        if (code) {
            linksHtml += `<a href="https://finance.yahoo.co.jp/quote/${code}.T" target="_blank" class="dashboard-link-btn">Yahoo!ファイナンス</a>`;
            linksHtml += `<a href="https://irbank.net/${code}" target="_blank" class="dashboard-link-btn">IR BANK</a>`;
            linksHtml += `<a href="https://www.buffett-code.com/company/${code}/" target="_blank" class="dashboard-link-btn">バフェット・コード</a>`;
        }
    }

    // 既存のリンクコンテナの中身を書き換え
    const linksContainer = elements.dashboardModal.querySelector('.dashboard-links');
    if (linksContainer) {
        linksContainer.innerHTML = linksHtml;
    }

    // APIからデータ取得
    elements.dashboardDocsList.innerHTML = '<div class="loading">読み込み中...</div>';

    let docs = [];
    if (type === 'issuer') {
        docs = await fetchIssuerDocuments(edinetCode);
    } else {
        docs = await fetchFilerDocuments(edinetCode);
    }
    renderDashboardDocs(docs);
}

// 古い関数は使用しない
// async function openDashboard...

async function openDashboard(edinetCode, issuerName, secCode, type = 'issuer') {
    elements.dashboardTitle.textContent = `${issuerName} の企業ダッシュボード`;
    elements.dashboardModal.classList.add('active');

    // 外部リンク設定
    // 証券コードがある場合のみリンクを有効化、なければ非表示にするか無効化
    const code = secCode ? secCode.substring(0, 4) : null;

    let linksHtml = '';
    if (code) {
        linksHtml += `<a href="https://finance.yahoo.co.jp/quote/${code}.T" target="_blank" class="dashboard-link-btn">Yahoo!ファイナンス</a>`;
        linksHtml += `<a href="https://irbank.net/${code}" target="_blank" class="dashboard-link-btn">IR BANK</a>`;
        linksHtml += `<a href="https://www.buffett-code.com/company/${code}/" target="_blank" class="dashboard-link-btn">バフェット・コード</a>`;
    } else {
        linksHtml = '<span class="text-muted">証券コード情報なし</span>';
    }

    // 既存のリンクコンテナの中身を書き換え
    const linksContainer = elements.dashboardModal.querySelector('.dashboard-links');
    if (linksContainer) {
        linksContainer.innerHTML = linksHtml;
    }

    // APIからデータ取得
    elements.dashboardDocsList.innerHTML = '<div class="loading">読み込み中...</div>';
    const docs = await fetchIssuerDocuments(edinetCode);
    renderDashboardDocs(docs);
}

function renderDashboardDocs(docs) {
    if (!docs || docs.length === 0) {
        elements.dashboardDocsList.innerHTML = '<div class="empty-state-text">書類が見つかりませんでした</div>';
        return;
    }

    elements.dashboardDocsList.innerHTML = docs.map(doc => `
        <div class="dashboard-doc-item">
            <div class="doc-main">
                <div class="doc-date">${formatDateTime(doc.submit_date_time)}</div>
                <div class="doc-desc">${escapeHtml(doc.doc_description)}</div>
                <div class="doc-type">${escapeHtml(doc.report_type || '報告書')}</div>
            </div>
            <div class="doc-actions">
                ${doc.pdf_flag ? `
                    <button class="action-btn action-pdf-sm" onclick="window.open('/api/document/${doc.doc_id}', '_blank')">
                        PDF
                    </button>
                ` : ''}
            </div>
        </div>
        `).join('');
}

// ===== Init =====

async function init() {
    console.log('EDINET Monitor starting...');

    // 日付フィルターは空（全ての日付を表示）
    // elements.dateFilter.value = new Date().toISOString().split('T')[0];
    // state.filters.date = elements.dateFilter.value;

    setupEventListeners();

    // 初期データ読み込み
    await Promise.all([loadStats(), loadReports(), loadWatchlist()]);

    // 通知許可をリクエスト
    requestNotificationPermission();

    // 定期更新（5分ごと）
    setInterval(() => {
        loadStats();
        loadReports();
    }, 5 * 60 * 1000);

    console.log('EDINET Monitor ready!');
}

// Start
init();
