/*
 * 法人番号検索モジュール
 *
 * 会社名から法人情報（所在地など）を取得します。
 *  - APP_CONFIG.corporateApi.endpoint が設定されていれば、そのAPI（プロキシ）を利用。
 *  - 未設定の場合は、同梱のサンプル法人データ（デモ用）で検索します。
 *
 * ※サンプルの法人番号は動作確認用のダミーです。正式な法人番号は
 *   国税庁・法人番号公表サイト（https://www.houjin-bangou.nta.go.jp/）でご確認ください。
 * ※法人番号システムは「商号・所在地」を提供しますが、従業員数・資本金・業種は
 *   含まれないため、それらは引き続き手入力していただきます。
 */
(function () {
  "use strict";

  // デモ用サンプル法人データ（offline で動作確認できるようにするためのもの）
  const CORPORATE_SAMPLES = [
    { corporateNumber: "0000000000001", name: "株式会社サンプル商事", prefecture: "東京都", city: "千代田区", address: "東京都千代田区丸の内1-1-1" },
    { corporateNumber: "0000000000002", name: "サンプル製作所株式会社", prefecture: "愛知県", city: "名古屋市", address: "愛知県名古屋市中区栄2-2-2" },
    { corporateNumber: "0000000000003", name: "株式会社みらいテクノロジー", prefecture: "東京都", city: "渋谷区", address: "東京都渋谷区道玄坂3-3-3" },
    { corporateNumber: "0000000000004", name: "なにわフーズ株式会社", prefecture: "大阪府", city: "大阪市", address: "大阪府大阪市北区梅田4-4-4" },
    { corporateNumber: "0000000000005", name: "株式会社きたぐにサービス", prefecture: "北海道", city: "札幌市", address: "北海道札幌市中央区大通5-5-5" },
    { corporateNumber: "0000000000006", name: "九州ものづくり工業株式会社", prefecture: "福岡県", city: "福岡市", address: "福岡県福岡市博多区博多駅前6-6-6" },
    { corporateNumber: "0000000000007", name: "株式会社しずおか物流", prefecture: "静岡県", city: "静岡市", address: "静岡県静岡市葵区7-7-7" },
    { corporateNumber: "0000000000008", name: "京都クラフト株式会社", prefecture: "京都府", city: "京都市", address: "京都府京都市下京区8-8-8" },
    { corporateNumber: "0000000000009", name: "株式会社よこはまデザイン", prefecture: "神奈川県", city: "横浜市", address: "神奈川県横浜市西区みなとみらい9-9-9" },
    { corporateNumber: "0000000000010", name: "とうほく農業生産株式会社", prefecture: "宮城県", city: "仙台市", address: "宮城県仙台市青葉区10-10-10" },
  ];

  // サンプルデータ内を会社名で部分一致検索
  function searchSamples(name) {
    const q = String(name || "").trim();
    if (!q) return [];
    return CORPORATE_SAMPLES.filter((c) => c.name.includes(q));
  }

  // 国税庁API（プロキシ経由）を利用した検索
  async function searchViaApi(name) {
    const cfg = (window.APP_CONFIG && window.APP_CONFIG.corporateApi) || {};
    const url =
      cfg.endpoint +
      (cfg.endpoint.includes("?") ? "&" : "?") +
      "name=" +
      encodeURIComponent(name) +
      (cfg.appId ? "&id=" + encodeURIComponent(cfg.appId) : "");
    const res = await fetch(url);
    if (!res.ok) throw new Error("法人番号APIの応答エラー: " + res.status);
    const data = await res.json();
    // プロキシは [{corporateNumber, name, prefecture, city, address}] 形式で返す想定
    return Array.isArray(data) ? data : data.corporations || [];
  }

  // 公開API: 会社名から法人候補を取得
  async function lookupByName(name) {
    const cfg = (window.APP_CONFIG && window.APP_CONFIG.corporateApi) || {};
    if (cfg.endpoint) {
      try {
        return { source: "api", results: await searchViaApi(name) };
      } catch (e) {
        // API失敗時はサンプルにフォールバック
        return { source: "sample", results: searchSamples(name), error: e.message };
      }
    }
    return { source: "sample", results: searchSamples(name) };
  }

  window.CorporateLookup = { lookupByName, samples: CORPORATE_SAMPLES };
})();
