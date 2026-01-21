/**
 * 地図モジュール
 * Leaflet + OpenStreetMapを使用した資産マップ
 */

const MapModule = {
    map: null,
    markers: [],
    markerGroup: null,

    /**
     * 地図を初期化
     */
    init() {
        // 日本の中心付近で初期化
        this.map = L.map('map').setView([36.5, 138.0], 5);

        // OpenStreetMapタイルを追加
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // マーカーグループを作成
        this.markerGroup = L.layerGroup().addTo(this.map);
    },

    /**
     * カスタムアイコンを作成
     * @param {string} type - 'land' または 'building'
     * @returns {L.DivIcon} カスタムアイコン
     */
    createIcon(type) {
        const color = type === 'land' ? '#10b981' : '#8b5cf6';
        const emoji = type === 'land' ? '🏞️' : '🏢';

        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div style="
                    background: ${color};
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    border: 2px solid white;
                    cursor: pointer;
                ">${emoji}</div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    },

    /**
     * ポップアップのHTMLを生成
     * @param {Object} asset - 資産データ
     * @returns {string} HTML文字列
     */
    createPopupHTML(asset) {
        const typeLabel = asset.type === 'land' ? '土地' : '建物';
        const areaLabel = asset.type === 'land' ? '面積' : '延床面積';
        const area = asset.type === 'land' ? asset.area : asset.floorArea;

        return `
            <div class="popup-content">
                <h3>${asset.name}</h3>
                <p>📍 ${asset.address}</p>
                <p>種別: <span class="value">${typeLabel}</span></p>
                <p>${areaLabel}: <span class="value">${area ? area.toLocaleString() : '-'} ㎡</span></p>
                <p>帳簿価額: <span class="value">${asset.bookValue ? asset.bookValue.toLocaleString() : '-'} 百万円</span></p>
                <p>用途: <span class="value">${asset.usage || '-'}</span></p>
            </div>
        `;
    },

    /**
     * 資産データからマーカーを設置
     * @param {Array} assets - 資産配列
     */
    setMarkers(assets) {
        // 既存のマーカーをクリア
        this.markerGroup.clearLayers();
        this.markers = [];

        // 各資産にマーカーを追加
        assets.forEach((asset, index) => {
            if (asset.lat && asset.lng) {
                const marker = L.marker([asset.lat, asset.lng], {
                    icon: this.createIcon(asset.type)
                });

                marker.bindPopup(this.createPopupHTML(asset));

                // クリック時にテーブルをハイライト
                marker.on('click', () => {
                    this.onMarkerClick(index);
                });

                marker.assetIndex = index;
                this.markers.push(marker);
                this.markerGroup.addLayer(marker);
            }
        });

        // 全マーカーが見える範囲にフィット
        if (this.markers.length > 0) {
            const group = L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    },

    /**
     * マーカークリック時のコールバック
     * @param {number} index - 資産のインデックス
     */
    onMarkerClick(index) {
        // TableModuleと連携してハイライト
        if (window.TableModule) {
            window.TableModule.highlightRow(index);
        }
    },

    /**
     * 特定の資産にズーム
     * @param {Object} asset - 資産データ
     * @param {number} index - 資産のインデックス
     */
    zoomToAsset(asset, index) {
        if (asset.lat && asset.lng) {
            this.map.setView([asset.lat, asset.lng], 15);

            // 対応するマーカーのポップアップを開く
            const marker = this.markers.find(m => m.assetIndex === index);
            if (marker) {
                marker.openPopup();
            }
        }
    },

    /**
     * フィルタリングされた資産のみ表示
     * @param {Array} assets - 全資産配列
     * @param {string} filter - 'all', 'land', 'building'
     */
    filterMarkers(assets, filter) {
        this.markerGroup.clearLayers();

        this.markers.forEach((marker, index) => {
            const asset = assets[index];
            if (filter === 'all' || asset.type === filter) {
                this.markerGroup.addLayer(marker);
            }
        });
    }
};

// グローバルに公開
window.MapModule = MapModule;
