/**
 * グラフモジュール
 * Chart.jsを使用した時系列グラフ
 */

const ChartModule = {
    revenueChart: null,
    assetsChart: null,
    dividendChart: null,

    /**
     * 共通のチャートオプション
     */
    commonOptions: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        family: "'Noto Sans JP', sans-serif",
                        size: 12
                    },
                    usePointStyle: true,
                    padding: 16
                }
            },
            tooltip: {
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                titleFont: {
                    family: "'Noto Sans JP', sans-serif",
                    size: 13
                },
                bodyFont: {
                    family: "'Noto Sans JP', sans-serif",
                    size: 12
                },
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toLocaleString() + ' 百万円';
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: "'Noto Sans JP', sans-serif",
                        size: 11
                    }
                }
            },
            y: {
                grid: {
                    color: 'rgba(226, 232, 240, 0.5)'
                },
                ticks: {
                    font: {
                        family: "'Noto Sans JP', sans-serif",
                        size: 11
                    },
                    callback: function (value) {
                        return value.toLocaleString();
                    }
                }
            }
        }
    },

    /**
     * 売上高・営業利益グラフを描画
     * @param {Object} financials - 財務データ
     */
    renderRevenueChart(financials) {
        const ctx = document.getElementById('revenue-chart').getContext('2d');

        // 既存のチャートを破棄
        if (this.revenueChart) {
            this.revenueChart.destroy();
        }

        this.revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: financials.years.map(y => y + '年'),
                datasets: [
                    {
                        label: '売上高',
                        data: financials.revenue,
                        backgroundColor: 'rgba(37, 99, 235, 0.7)',
                        borderColor: 'rgba(37, 99, 235, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: '営業利益',
                        data: financials.operatingIncome,
                        type: 'line',
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#10b981',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        fill: true,
                        tension: 0.3,
                        order: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                ...this.commonOptions,
                scales: {
                    ...this.commonOptions.scales,
                    y: {
                        ...this.commonOptions.scales.y,
                        position: 'left',
                        title: {
                            display: true,
                            text: '売上高（百万円）',
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 11
                            }
                        }
                    },
                    y1: {
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: '営業利益（百万円）',
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 11
                            }
                        },
                        ticks: {
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 11
                            },
                            callback: function (value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    },

    /**
     * 資産・純資産グラフを描画
     * @param {Object} financials - 財務データ
     */
    renderAssetsChart(financials) {
        const ctx = document.getElementById('assets-chart').getContext('2d');

        // 既存のチャートを破棄
        if (this.assetsChart) {
            this.assetsChart.destroy();
        }

        this.assetsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: financials.years.map(y => y + '年'),
                datasets: [
                    {
                        label: '総資産',
                        data: financials.totalAssets,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#8b5cf6',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: '純資産',
                        data: financials.netAssets,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#f59e0b',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: this.commonOptions
        });
    },

    /**
     * 配当・EPS推移グラフを描画
     * @param {Object} company - 企業データ
     */
    renderDividendChart(company) {
        const ctx = document.getElementById('dividend-chart').getContext('2d');
        const fin = company.financials;

        // 既存のチャートを破棄
        if (this.dividendChart) {
            this.dividendChart.destroy();
        }

        // EPS計算（各年度）
        const epsData = fin.netIncome.map(ni =>
            (ni * 1000000) / company.sharesOutstanding
        );

        // 配当性向計算（各年度）
        const payoutRatioData = fin.netIncome.map((ni, i) => {
            const eps = (ni * 1000000) / company.sharesOutstanding;
            const dividend = fin.dividendPerShare[i];
            return eps > 0 ? (dividend / eps) * 100 : 0;
        });

        this.dividendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: fin.years.map(y => y + '年'),
                datasets: [
                    {
                        label: '配当額（円）',
                        data: fin.dividendPerShare,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: '#10b981',
                        borderWidth: 1,
                        borderRadius: 4,
                        order: 3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'EPS（円）',
                        data: epsData,
                        type: 'line',
                        borderColor: '#8b5cf6',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        pointBackgroundColor: '#8b5cf6',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        tension: 0.3,
                        order: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '配当性向（%）',
                        data: payoutRatioData,
                        type: 'line',
                        borderColor: '#f59e0b',
                        backgroundColor: 'transparent',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        pointBackgroundColor: '#f59e0b',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        tension: 0.3,
                        order: 2,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 12
                            },
                            usePointStyle: true,
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        titleFont: {
                            family: "'Noto Sans JP', sans-serif",
                            size: 13
                        },
                        bodyFont: {
                            family: "'Noto Sans JP', sans-serif",
                            size: 12
                        },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.dataset.yAxisID === 'y1') {
                                        label += context.parsed.y.toFixed(1) + '%';
                                    } else {
                                        label += context.parsed.y.toFixed(2) + '円';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 11
                            }
                        }
                    },
                    y: {
                        position: 'left',
                        grid: {
                            color: 'rgba(226, 232, 240, 0.5)'
                        },
                        title: {
                            display: true,
                            text: '配当額・EPS（円）',
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 11
                            }
                        },
                        ticks: {
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 11
                            },
                            callback: function (value) {
                                return value.toFixed(0) + '円';
                            }
                        }
                    },
                    y1: {
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: '配当性向（%）',
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 11
                            }
                        },
                        ticks: {
                            font: {
                                family: "'Noto Sans JP', sans-serif",
                                size: 11
                            },
                            callback: function (value) {
                                return value.toFixed(0) + '%';
                            }
                        },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    },

    /**
     * 全グラフを描画
     * @param {Object} company - 企業データ
     */
    renderAll(company) {
        this.renderRevenueChart(company.financials);
        this.renderAssetsChart(company.financials);
        this.renderDividendChart(company);
    },

    /**
     * 全グラフを破棄
     */
    destroyAll() {
        if (this.revenueChart) {
            this.revenueChart.destroy();
            this.revenueChart = null;
        }
        if (this.assetsChart) {
            this.assetsChart.destroy();
            this.assetsChart = null;
        }
        if (this.dividendChart) {
            this.dividendChart.destroy();
            this.dividendChart = null;
        }
    }
};

// グローバルに公開
window.ChartModule = ChartModule;

