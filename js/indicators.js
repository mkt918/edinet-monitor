/**
 * 投資指標計算モジュール
 * 各種投資指標を計算し、高校生向けの説明を提供
 */

const IndicatorsModule = {
    /**
     * 指標の定義と説明
     */
    definitions: {
        revenue: {
            name: '売上高',
            icon: '💰',
            unit: '百万円',
            description: '会社が1年間で商品やサービスを売って得た総金額。お店なら「レジで受け取ったお金の合計」みたいなもの。',
            format: (value) => IndicatorsModule.formatNumber(value),
            colorClass: 'neutral'
        },
        operatingMargin: {
            name: '売上高営業利益率',
            icon: '📈',
            unit: '%',
            description: '売上のうち、本業で稼いだ利益の割合。100円売って10円残れば10%。高いほど「商売上手」な会社。',
            format: (value) => value.toFixed(1),
            colorClass: (value) => value >= 5 ? 'positive' : value >= 0 ? 'neutral' : 'negative'
        },
        pbr: {
            name: 'PBR',
            icon: '📊',
            unit: '倍',
            description: '株価が会社の資産価値（純資産）の何倍か。1倍未満なら「会社を解散して資産を売った方が儲かる」状態＝割安かも。',
            format: (value) => value.toFixed(2),
            colorClass: (value) => value < 1 ? 'positive' : value < 2 ? 'neutral' : 'negative'
        },
        roa: {
            name: 'ROA',
            icon: '🏦',
            unit: '%',
            description: '会社の全資産（工場、土地、現金など全部）でどれだけ稼いでいるか。高いほど資産を上手く活用している。5%以上で優秀。',
            format: (value) => value.toFixed(2),
            colorClass: (value) => value >= 5 ? 'positive' : value >= 2 ? 'neutral' : 'negative'
        },
        roe: {
            name: 'ROE',
            icon: '👥',
            unit: '%',
            description: '株主のお金（純資産）でどれだけ稼いでいるか。高いほど株主にとってお得。8%以上で合格ライン。',
            format: (value) => value.toFixed(2),
            colorClass: (value) => value >= 8 ? 'positive' : value >= 5 ? 'neutral' : 'negative'
        },
        equityRatio: {
            name: '自己資本比率',
            icon: '🛡️',
            unit: '%',
            description: '借金に頼らず自分のお金でどれだけ運営しているか。高いほど倒産しにくい安全な会社。40%以上で安心。',
            format: (value) => value.toFixed(1),
            colorClass: (value) => value >= 40 ? 'positive' : value >= 20 ? 'neutral' : 'negative'
        },
        dividendYield: {
            name: '配当利回り',
            icon: '🎁',
            unit: '%',
            description: '投資したお金に対して年間でもらえる配当の割合。銀行預金の利息みたいなもの。2%以上で魅力的。',
            format: (value) => value.toFixed(2),
            colorClass: (value) => value >= 3 ? 'positive' : value >= 1.5 ? 'neutral' : 'negative'
        },
        landGain: {
            name: '土地含み益',
            icon: '🏠',
            unit: '百万円',
            description: '土地の時価と帳簿価額の差。プラスなら「決算書に載ってない隠れた資産」がある状態。',
            format: (value) => IndicatorsModule.formatNumber(value),
            colorClass: (value) => value > 0 ? 'positive' : value === 0 ? 'neutral' : 'negative'
        },
        eps: {
            name: 'EPS',
            icon: '💵',
            unit: '円',
            description: '1株あたりの利益（1株でどれだけ稼いだか）。高いほど株主への還元余力がある。毎年増えていれば成長企業。',
            format: (value) => value.toFixed(2),
            colorClass: (value) => value > 0 ? 'positive' : value === 0 ? 'neutral' : 'negative'
        },
        payoutRatio: {
            name: '配当性向',
            icon: '🎯',
            unit: '%',
            description: '利益のうちどれだけ配当に回すか。30-50%が標準的。高すぎると成長投資余力がないかも。',
            format: (value) => value.toFixed(1),
            colorClass: (value) => value >= 30 && value <= 50 ? 'positive' : value > 0 ? 'neutral' : 'negative'
        },
        netCashRatio: {
            name: 'ネットキャッシュ比率',
            icon: '💎',
            unit: '',
            description: '(流動資産+投資有価証券×0.7-負債合計)÷時価総額。清原達郎式で1以上なら「割安株」の可能性大！',
            format: (value) => value.toFixed(2),
            colorClass: (value) => value >= 1 ? 'positive' : value >= 0.5 ? 'neutral' : 'negative',
            specialLabel: (value) => value >= 1 ? '✅ 清原チェックOK' : '❌ 清原チェックNG'
        }
    },

    /**
     * 数値をカンマ区切りでフォーマット
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return num.toLocaleString('ja-JP');
    },

    /**
     * 全指標を計算
     * @param {Object} company - 企業データ
     * @returns {Object} 計算済み指標
     */
    calculateAll(company) {
        const fin = company.financials;
        const latestYear = fin.years.length - 1;

        // 最新のデータを取得
        const revenue = fin.revenue[latestYear];
        const operatingIncome = fin.operatingIncome[latestYear];
        const netIncome = fin.netIncome[latestYear];
        const totalAssets = fin.totalAssets[latestYear];
        const netAssets = fin.netAssets[latestYear];
        const dividend = fin.dividendPerShare[latestYear];

        // 時価総額（株価 × 発行済株式数）
        const marketCap = company.stockPrice * company.sharesOutstanding;

        // 各指標を計算
        const indicators = {
            revenue: {
                value: revenue,
                ...this.definitions.revenue
            },
            operatingMargin: {
                value: (operatingIncome / revenue) * 100,
                ...this.definitions.operatingMargin
            },
            pbr: {
                value: marketCap / (netAssets * 1000000),
                ...this.definitions.pbr
            },
            roa: {
                value: (netIncome / totalAssets) * 100,
                ...this.definitions.roa
            },
            roe: {
                value: (netIncome / netAssets) * 100,
                ...this.definitions.roe
            },
            equityRatio: {
                value: (netAssets / totalAssets) * 100,
                ...this.definitions.equityRatio
            },
            dividendYield: {
                value: (dividend / company.stockPrice) * 100,
                ...this.definitions.dividendYield
            },
            landGain: {
                value: company.landValuation.marketValue - company.landValuation.bookValue,
                ...this.definitions.landGain
            },
            eps: {
                value: (netIncome * 1000000) / company.sharesOutstanding,
                ...this.definitions.eps
            },
            payoutRatio: {
                value: netIncome > 0 ? (dividend / ((netIncome * 1000000) / company.sharesOutstanding)) * 100 : 0,
                ...this.definitions.payoutRatio
            },
            netCashRatio: {
                value: this.calculateNetCashRatio(company),
                ...this.definitions.netCashRatio
            }
        };

        return indicators;
    },

    /**
     * ネットキャッシュ比率を計算
     * 計算式: (流動資産 + 投資有価証券×0.7 - 流動負債 - 固定負債) / 時価総額
     * @param {Object} company - 企業データ
     * @returns {number} ネットキャッシュ比率
     */
    calculateNetCashRatio(company) {
        // balanceSheetがない場合は0を返す
        if (!company.balanceSheet) return 0;

        const bs = company.balanceSheet;
        const currentAssets = bs.currentAssets || 0;
        const investmentSecurities = bs.investmentSecurities || 0;
        const currentLiabilities = bs.currentLiabilities || 0;
        const fixedLiabilities = bs.fixedLiabilities || 0;

        // 時価総額（億円）= 株価 × 発行済株式数 / 1億
        const marketCapOku = (company.stockPrice * company.sharesOutstanding) / 100000000;

        // ネットキャッシュ（億円）= (流動資産 + 投資有価証券×0.7 - 負債合計) / 100（百万円→億円）
        const netCashOku = (currentAssets + investmentSecurities * 0.7 - currentLiabilities - fixedLiabilities) / 100;

        // ネットキャッシュ比率 = ネットキャッシュ / 時価総額
        return marketCapOku > 0 ? netCashOku / marketCapOku : 0;
    },

    /**
     * 指標カードのHTMLを生成
     * @param {Object} indicator - 指標データ
     * @param {string} key - 指標キー
     * @returns {string} HTML文字列
     */
    createIndicatorCardHTML(indicator, key) {
        const colorClass = typeof indicator.colorClass === 'function'
            ? indicator.colorClass(indicator.value)
            : indicator.colorClass;

        // specialLabel（清原チェックなど）
        const specialLabel = indicator.specialLabel
            ? `<div class="indicator-special">${indicator.specialLabel(indicator.value)}</div>`
            : '';

        return `
            <div class="indicator-card ${colorClass}" data-indicator="${key}">
                <div class="indicator-header">
                    <span class="indicator-name">${indicator.name}</span>
                    <span class="indicator-icon">${indicator.icon}</span>
                </div>
                <div class="indicator-value">
                    ${indicator.format(indicator.value)}
                    <span class="indicator-unit">${indicator.unit}</span>
                </div>
                ${specialLabel}
                <div class="indicator-description">
                    ${indicator.description}
                </div>
            </div>
        `;
    },

    /**
     * 指標グリッドにカードを描画
     * @param {Object} company - 企業データ
     */
    renderIndicators(company) {
        const indicators = this.calculateAll(company);
        const grid = document.getElementById('indicators-grid');

        grid.innerHTML = Object.entries(indicators)
            .map(([key, indicator]) => this.createIndicatorCardHTML(indicator, key))
            .join('');
    }
};

// グローバルに公開
window.IndicatorsModule = IndicatorsModule;
