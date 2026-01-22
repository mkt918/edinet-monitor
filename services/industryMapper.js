
/**
 * 証券コードから業種を判定するヘルパー
 */
export class IndustryMapper {
    static getIndustry(secCode) {
        if (!secCode || secCode.length < 4) return 'その他';

        const code = parseInt(secCode.substring(0, 4), 10);

        if (code >= 1300 && code < 1400) return '水産・農林業';
        if (code >= 1400 && code < 1500) return '建設業'; // タマホーム(1419)等
        if (code >= 1500 && code < 1600) return '鉱業';
        if (code >= 1600 && code < 1700) return '鉱業'; // INPEX(1605)
        if (code >= 1700 && code < 2000) return '建設業';
        if (code >= 2000 && code < 3000) return '食料品';
        if (code >= 3000 && code < 3100) return '繊維製品';
        if (code >= 3100 && code < 3200) return 'その他製品'; // 31xxは一部その他? ウイルプラス(3538)とかは?
        if (code >= 3200 && code < 3300) return 'その他製品';
        if (code >= 3300 && code < 3400) return '不動産業'; // 32xx-33xx不動産多い
        if (code >= 3400 && code < 3500) return '繊維製品'; // 3402東レ
        if (code >= 3500 && code < 3600) return '繊維製品';
        if (code >= 3600 && code < 3700) return '情報・通信業'; // 36xx IT
        if (code >= 3700 && code < 3800) return '情報・通信業'; // 37xx IT
        if (code >= 3800 && code < 3900) return '情報・通信業';
        if (code >= 3900 && code < 4000) return '情報・通信業';

        if (code >= 4000 && code < 4100) return '化学';
        if (code >= 4100 && code < 4200) return '化学';
        if (code >= 4200 && code < 4300) return '化学';
        if (code >= 4300 && code < 4400) return '化学';
        if (code >= 4400 && code < 4500) return '化学'; // 44xx 花王とか
        if (code >= 4500 && code < 4600) return '医薬品';
        if (code >= 4600 && code < 4700) return 'サービス業'; // 46xx 
        if (code >= 4700 && code < 4800) return '情報・通信業'; // 47xx
        if (code >= 4800 && code < 4900) return '情報・通信業';
        if (code >= 4900 && code < 5000) return '化学'; // 49xx 化粧品等

        if (code >= 5000 && code < 5100) return '石油・石炭製品';
        if (code >= 5100 && code < 5200) return 'ゴム製品';
        if (code >= 5200 && code < 5300) return 'ガラス・土石製品';
        if (code >= 5300 && code < 5400) return 'ガラス・土石製品';
        if (code >= 5400 && code < 5500) return '鉄鋼';
        if (code >= 5500 && code < 5600) return '鉄鋼';
        if (code >= 5600 && code < 5700) return '鉄鋼';
        if (code >= 5700 && code < 5800) return '非鉄金属';
        if (code >= 5800 && code < 5900) return '非鉄金属';
        if (code >= 5900 && code < 6000) return '金属製品';

        if (code >= 6000 && code < 6100) return 'サービス業'; // 60xx
        if (code >= 6100 && code < 6200) return '機械';
        if (code >= 6200 && code < 6300) return '機械';
        if (code >= 6300 && code < 6400) return '機械';
        if (code >= 6400 && code < 6500) return '機械';
        if (code >= 6500 && code < 6600) return '電気機器';
        if (code >= 6600 && code < 6700) return '電気機器';
        if (code >= 6700 && code < 6800) return '電気機器';
        if (code >= 6800 && code < 6900) return '電気機器';
        if (code >= 6900 && code < 7000) return '電気機器';

        if (code >= 7000 && code < 7100) return '輸送用機器'; // 70xx 造船とか
        if (code >= 7100 && code < 7200) return '輸送用機器'; // 71xx ?
        if (code >= 7200 && code < 7300) return '輸送用機器'; // 72xx 自動車
        if (code >= 7300 && code < 7400) return '輸送用機器'; // 73xx ?
        if (code >= 7400 && code < 7500) return '小売業';
        if (code >= 7500 && code < 7600) return '小売業';
        if (code >= 7600 && code < 7700) return '小売業';
        if (code >= 7700 && code < 7800) return '精密機器';
        if (code >= 7800 && code < 7900) return 'その他製品';
        if (code >= 7900 && code < 8000) return 'その他製品'; // 7974 任天堂

        if (code >= 8000 && code < 8100) return '卸売業';
        if (code >= 8100 && code < 8200) return '卸売業';
        if (code >= 8200 && code < 8300) return '小売業';
        if (code >= 8300 && code < 8400) return '銀行業';
        if (code >= 8400 && code < 8500) return '銀行業'; // 84xx その他金融?
        if (code >= 8500 && code < 8600) return 'その他金融業'; // 85xx クレジット
        if (code >= 8600 && code < 8700) return '証券、商品先物取引業';
        if (code >= 8700 && code < 8800) return '保険業';
        if (code >= 8800 && code < 8900) return '不動産業';
        if (code >= 8900 && code < 9000) return '不動産業';

        if (code >= 9000 && code < 9100) return '陸運業'; // 902x JR
        if (code >= 9100 && code < 9200) return '海運業';
        if (code >= 9200 && code < 9300) return '空運業';
        if (code >= 9300 && code < 9400) return '倉庫・運輸関連業';
        if (code >= 9400 && code < 9500) return '情報・通信業'; // 9432 NTT
        if (code >= 9500 && code < 9600) return '電気・ガス業';
        if (code >= 9600 && code < 9700) return 'サービス業';
        if (code >= 9700 && code < 9800) return 'サービス業';
        if (code >= 9800 && code < 9900) return '卸売業'; // 98xx オートバックス? 小売？
        if (code >= 9900 && code < 10000) return '小売業';

        return 'その他';
    }

    static getRanges(industryName) {
        const ranges = [];
        // Inverse mapping (manual for now)
        switch (industryName) {
            case '水産・農林業': ranges.push(['1300', '1399']); break;
            case '建設業':
                ranges.push(['1400', '1499']);
                ranges.push(['1700', '1999']);
                break;
            case '鉱業':
                ranges.push(['1500', '1599']);
                ranges.push(['1600', '1699']);
                break;
            case '食料品': ranges.push(['2000', '2999']); break;
            case '繊維製品':
                ranges.push(['3000', '3099']);
                ranges.push(['3400', '3599']); // Rough match
                break;
            case 'その他製品':
                ranges.push(['3100', '3199']);
                ranges.push(['3200', '3299']);
                ranges.push(['7800', '7999']);
                break;
            case '不動産業':
                ranges.push(['3300', '3399']); // ? 
                ranges.push(['8800', '8999']);
                ranges.push(['3200', '3299']); // REITs often here?
                break;
            case '情報・通信業':
                ranges.push(['3600', '3999']);
                ranges.push(['4700', '4899']);
                ranges.push(['9400', '9499']);
                break;
            case '化学':
                ranges.push(['4000', '4499']);
                ranges.push(['4900', '4999']);
                break;
            case '医薬品': ranges.push(['4500', '4599']); break;
            case '石油・石炭製品': ranges.push(['5000', '5099']); break;
            case 'ゴム製品': ranges.push(['5100', '5199']); break;
            case 'ガラス・土石製品': ranges.push(['5200', '5399']); break;
            case '鉄鋼': ranges.push(['5400', '5699']); break;
            case '非鉄金属': ranges.push(['5700', '5899']); break;
            case '金属製品': ranges.push(['5900', '5999']); break;
            case 'サービス業':
                ranges.push(['4600', '4699']);
                ranges.push(['6000', '6099']);
                ranges.push(['9600', '9799']);
                break;
            case '機械': ranges.push(['6100', '6499']); break;
            case '電気機器': ranges.push(['6500', '6999']); break;
            case '輸送用機器': ranges.push(['7000', '7399']); break;
            case '小売業':
                ranges.push(['2600', '2799']); // Some foods retail?
                ranges.push(['3000', '3099']); // Some fashion retail?
                ranges.push(['7400', '7699']);
                ranges.push(['8200', '8299']);
                ranges.push(['9900', '9999']);
                break;
            case '精密機器': ranges.push(['7700', '7799']); break;
            case '卸売業':
                ranges.push(['8000', '8199']);
                ranges.push(['9800', '9899']);
                break;
            case '銀行業': ranges.push(['8300', '8499']); break;
            case 'その他金融業': ranges.push(['8500', '8599']); break;
            case '証券、商品先物取引業': ranges.push(['8600', '8699']); break;
            case '保険業': ranges.push(['8700', '8799']); break;
            case '陸運業': ranges.push(['9000', '9099']); break;
            case '海運業': ranges.push(['9100', '9199']); break;
            case '空運業': ranges.push(['9200', '9299']); break;
            case '倉庫・運輸関連業': ranges.push(['9300', '9399']); break;
            case '電気・ガス業': ranges.push(['9500', '9599']); break;
        }
        return ranges;
    }
}
