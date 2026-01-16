/**
 * EDINET Monitor - Frontend Application
 */

const API_BASE = '';

// ===== State =====
let state = {
    reports: [],
    watchlist: [],
    stats: null,
    filters: {
        date: '',
        search: '',
        type: ''
    }
};

// ===== DOM Elements =====
const elements = {
    reportsList: document.getElementById('reportsList'),
    todayCount: document.getElementById('todayCount'),
    lastUpdated: document.getElementById('lastUpdated'),
    watchlistCount: document.getElementById('watchlistCount'),
    schedulerStatus: document.getElementById('schedulerStatus'),
    reportCount: document.getElementById('reportCount'),
    dateFilterStart: document.getElementById('dateFilterStart'),
    dateFilterEnd: document.getElementById('dateFilterEnd'),
    searchFilter: document.getElementById('searchFilter'),
    typeFilter: document.getElementById('typeFilter'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    notifyBtn: document.getElementById('notifyBtn'),
    watchlistModal: document.getElementById('watchlistModal'),
    closeModal: document.getElementById('closeModal'),
    watchlistItems: document.getElementById('watchlistItems'),
    watchlistInput: document.getElementById('watchlistInput'),
    addWatchlistBtn: document.getElementById('addWatchlistBtn')
};

// ===== API Functions =====

async function fetchReports(options = {}) {
    const params = new URLSearchParams();
    if (options.date) params.append('date', options.date);
    if (options.search) params.append('search', options.search);

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

    elements.schedulerStatus.textContent =
        state.stats.scheduler?.isScheduled ? '稼働中' : '停止中';
}

function renderReports() {
    const filtered = filterReports();

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
      <div class="report-item ${isWatched ? 'highlight' : ''}" data-doc-id="${report.doc_id}">
        <div class="report-icon">${getReportIcon(report.report_type)}</div>
        <div class="report-content">
          <div class="report-header">
            <span class="report-filer">${escapeHtml(report.filer_name)}</span>
            <span class="report-type ${typeClass}">${escapeHtml(report.report_type || '大量保有報告書')}</span>
          </div>
          <div class="report-main">
            <div class="report-description">${escapeHtml(report.doc_description || '')}</div>
            <div class="report-details" id="details-${report.doc_id}" data-doc-id="${report.doc_id}">
              <div class="details-loading">📊 詳細を読み込み中...</div>
            </div>
          </div>
          <div class="report-meta">
            <span>📅 ${formatDateTime(report.submit_date_time)}</span>
            ${report.sec_code ? `<span>🏷️ ${report.sec_code}</span>` : ''}
          </div>
        </div>
        <div class="report-actions">
          ${report.pdf_flag ? `
            <a href="/api/document/${report.doc_id}" 
               target="_blank" 
               class="report-action" 
               title="PDFを開く">📄</a>
          ` : ''}
          <button class="btn-add-watch" title="監視対象に追加" data-name="${escapeHtml(report.filer_name)}">
            ${escapeHtml(report.filer_name)}を監視対象とする
          </button>
        </div>
      </div>
    `;
    }).join('');

    // イベント登録
    elements.reportsList.querySelectorAll('.btn-add-watch').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const name = btn.dataset.name;
            await addWatchlistItem(name);
            await loadWatchlist();
            renderReports();
        });
    });

    // 詳細を自動で読み込み
    elements.reportsList.querySelectorAll('.report-details').forEach(async (detailsDiv) => {
        const docId = detailsDiv.dataset.docId;
        if (!docId) return;

        const details = await fetchReportDetails(docId);

        if (details) {
            detailsDiv.innerHTML = renderDetailsContent(details);

            // 発行者名が監視対象に含まれている場合、親要素を強調表示
            if (details.issuerName && isInWatchlist(details.issuerName)) {
                const reportItem = detailsDiv.closest('.report-item');
                if (reportItem && !reportItem.classList.contains('highlight')) {
                    reportItem.classList.add('highlight');
                    reportItem.setAttribute('data-watch-reason', '発行者が監視対象');
                }
            }

            // 発行者追加ボタンのイベントハンドラー
            const addIssuerBtn = detailsDiv.querySelector('.btn-add-issuer-watch');
            if (addIssuerBtn) {
                addIssuerBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const issuerName = addIssuerBtn.dataset.issuer;
                    if (issuerName) {
                        await addWatchlistItem(issuerName);
                        await loadWatchlist();
                        renderReports();
                    }
                });
            }
        } else {
            detailsDiv.innerHTML = '<div class="details-error">詳細情報を取得できませんでした</div>';
        }
    });
}

function renderWatchlist() {
    if (state.watchlist.length === 0) {
        elements.watchlistItems.innerHTML = '<p class="empty-state-text">監視対象がありません</p>';
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
function renderDetailsContent(details) {
    const changeClass = details.holdingRatioChange > 0 ? 'positive' :
        details.holdingRatioChange < 0 ? 'negative' : '';

    const isIssuerWatched = details.issuerName && isInWatchlist(details.issuerName);

    return `
        <div class="details-grid">
            <div class="detail-item full-width">
                <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: space-between;">
                    <div>
                        <span class="detail-label">📈 対象銘柄</span>
                        <span class="detail-value">${escapeHtml(details.issuerName || '-')}</span>
                    </div>
                    ${details.issuerName && !isIssuerWatched ? `
                        <button class="btn-add-issuer-watch" data-issuer="${escapeHtml(details.issuerName)}" title="発行者を監視対象に追加">👁️</button>
                    ` : ''}
                </div>
            </div>
            <div class="detail-item">
                <span class="detail-label">🏷️ 証券コード</span>
                <span class="detail-value">${escapeHtml(details.securityCode || '-')}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">📊 保有割合</span>
                <span class="detail-value ratio">${details.holdingRatioFormatted || '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">📉 前回</span>
                <span class="detail-value">${details.previousHoldingRatioFormatted || '-'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">📈 変化</span>
                <span class="detail-value change ${changeClass}">${details.holdingRatioChangeFormatted || '-'}</span>
            </div>
            ${details.purposeOfHolding ? `
            <div class="detail-item full-width">
                <span class="detail-label">🎯 保有目的</span>
                <span class="detail-value purpose">${escapeHtml(details.purposeOfHolding)}</span>
            </div>
            ` : ''}
        </div>
    `;
}

// ===== Helper Functions =====

function getTypeClass(type) {
    if (!type) return '';
    if (type.includes('変更')) return 'change';
    if (type.includes('訂正')) return 'correction';
    return '';
}

function getReportIcon(type) {
    if (!type) return '📑';
    if (type.includes('変更')) return '🔄';
    if (type.includes('訂正')) return '✏️';
    return '📑';
}

function formatDateTime(dt) {
    if (!dt) return '-';
    return dt.replace(' ', ' ');
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ===== Data Loading =====

async function loadStats() {
    state.stats = await fetchStats();
    renderStats();
}

async function loadReports() {
    elements.reportsList.innerHTML = '<div class="loading">読み込み中...</div>';
    state.reports = await fetchReports();
    renderReports();
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
        renderReports();
    });

    elements.dateFilterEnd.addEventListener('change', (e) => {
        state.filters.dateEnd = e.target.value;
        renderReports();
    });

    elements.searchFilter.addEventListener('input', debounce((e) => {
        state.filters.search = e.target.value;
        renderReports();
    }, 300));

    elements.typeFilter.addEventListener('change', (e) => {
        state.filters.type = e.target.value;
        renderReports();
    });

    // フィルタークリアボタン
    elements.clearFiltersBtn.addEventListener('click', () => {
        elements.dateFilterStart.value = '';
        elements.dateFilterEnd.value = '';
        elements.searchFilter.value = '';
        elements.typeFilter.value = '';
        state.filters = {
            dateStart: '',
            dateEnd: '',
            search: '',
            type: ''
        };
        renderReports();
    });

    // 更新ボタン
    elements.refreshBtn.addEventListener('click', refreshAll);

    // 監視設定モーダル
    elements.notifyBtn.addEventListener('click', () => {
        elements.watchlistModal.classList.add('active');
    });

    elements.closeModal.addEventListener('click', () => {
        elements.watchlistModal.classList.remove('active');
    });

    elements.watchlistModal.querySelector('.modal-overlay').addEventListener('click', () => {
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
