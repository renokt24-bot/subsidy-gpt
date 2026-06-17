/*
 * 助成金・補助金データベース（代表的な制度のサンプル）
 *
 * ※各制度の要件は申請の目安として簡略化しています。
 *   実際の支給可否・金額・募集状況は必ず公式の最新情報をご確認ください。
 *
 * 中小企業・小規模事業者の定義（中小企業基本法）を業種ごとに利用します。
 *   - 製造業その他: 資本金3億円以下 または 従業員300人以下
 *   - 卸売業:       資本金1億円以下 または 従業員100人以下
 *   - 小売業:       資本金5千万円以下 または 従業員50人以下
 *   - サービス業:   資本金5千万円以下 または 従業員100人以下
 *
 * 小規模事業者の定義
 *   - 製造業その他・宿泊・娯楽: 従業員20人以下
 *   - 商業・サービス業:        従業員5人以下
 */

// 業種カテゴリ（中小企業判定に使用）
const INDUSTRIES = [
  { id: "manufacturing", label: "製造業・建設業・運輸業その他" },
  { id: "wholesale", label: "卸売業" },
  { id: "retail", label: "小売業" },
  { id: "service", label: "サービス業" },
];

// 都道府県（自治体独自制度の判定に利用。サンプルでは全国制度が中心）
const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県",
  "埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県",
  "佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

// 「やりたいこと」の選択肢（複数選択可）
const PURPOSES = [
  { id: "hire", label: "採用・雇用を増やす" },
  { id: "regularize", label: "非正規社員を正社員化する" },
  { id: "training", label: "社員研修・人材育成をする" },
  { id: "wageup", label: "賃上げをする" },
  { id: "worklife", label: "働き方改革・両立支援を進める" },
  { id: "equipment", label: "設備投資・生産性向上をする" },
  { id: "it", label: "ITツール・DXを導入する" },
  { id: "sales", label: "販路開拓・新商品開発をする" },
  { id: "startup", label: "創業・起業する" },
  { id: "restructure", label: "新分野展開・事業転換をする" },
];

/*
 * 各助成金の定義
 *  match(c): 入力(c)を受け取り判定オブジェクトを返す
 *    eligible:  true=条件に合致 / false=対象外
 *    reasons:   合致した理由（ユーザーに表示）
 *    cautions:  満たすべき・要確認の条件
 */

// 中小企業かどうかの簡易判定
function isSME(c) {
  const cap = c.capital; // 万円
  const emp = c.employees;
  switch (c.industry) {
    case "wholesale":
      return cap <= 10000 || emp <= 100;
    case "retail":
      return cap <= 5000 || emp <= 50;
    case "service":
      return cap <= 5000 || emp <= 100;
    case "manufacturing":
    default:
      return cap <= 30000 || emp <= 300;
  }
}

// 小規模事業者かどうかの簡易判定
function isSmallBusiness(c) {
  if (c.industry === "retail" || c.industry === "service") {
    return c.employees <= 5;
  }
  return c.employees <= 20;
}

// 目的IDからラベルを引く
function purposeLabel(id) {
  const p = PURPOSES.find((x) => x.id === id);
  return p ? p.label : id;
}

const SUBSIDIES = [
  {
    id: "career-up",
    name: "キャリアアップ助成金（正社員化コース）",
    org: "厚生労働省",
    category: "雇用・人材",
    amount: "対象者1人あたり 40〜80万円程度",
    summary: "有期雇用・パート・派遣などの非正規社員を正社員に転換した事業主への助成。",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/part_haken/jigyounushi/career.html",
    match(c) {
      const reasons = [];
      const cautions = [];
      if (!c.purposes.includes("regularize")) {
        return { eligible: false };
      }
      reasons.push("非正規社員の正社員化を予定している");
      if (c.employees >= 1) reasons.push("雇用している従業員がいる");
      cautions.push("雇用保険の適用事業所であること");
      cautions.push("キャリアアップ計画を転換前までに労働局へ提出すること");
      cautions.push("転換後6か月分の賃金を支給し、賃金を3%以上増額していること");
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "jinzai-kaihatsu",
    name: "人材開発支援助成金",
    org: "厚生労働省",
    category: "雇用・人材",
    amount: "研修経費の45〜75% ＋ 賃金助成（1人1時間 数百円）",
    summary: "従業員に職業訓練・研修を実施した事業主に、経費と訓練中の賃金の一部を助成。",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/d01-1.html",
    match(c) {
      if (!c.purposes.includes("training")) return { eligible: false };
      const reasons = ["社員研修・人材育成を予定している"];
      const cautions = [
        "雇用保険の適用事業所であること",
        "訓練実施計画を訓練開始前に提出すること",
        "OFF-JT（業務を離れた座学等）を含む計画的な訓練であること",
      ];
      if (isSME(c)) reasons.push("中小企業のため助成率が優遇される");
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "trial",
    name: "トライアル雇用助成金（一般トライアルコース）",
    org: "厚生労働省",
    category: "雇用・人材",
    amount: "対象者1人あたり 月最大4万円（最長3か月）",
    summary: "就職が困難な求職者を試行的に雇用する事業主への助成。常用雇用への移行を支援。",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/kyufukin/trial_koyou.html",
    match(c) {
      if (!c.purposes.includes("hire")) return { eligible: false };
      const reasons = ["採用・雇用の予定がある"];
      const cautions = [
        "ハローワーク等の紹介で対象者を雇い入れること",
        "原則3か月の試行雇用を行うこと",
        "雇用保険の適用事業所であること",
      ];
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "ryoritsu",
    name: "両立支援等助成金",
    org: "厚生労働省",
    category: "働き方・両立支援",
    amount: "1事業主あたり 数十万円〜（コースにより異なる）",
    summary: "育児・介護と仕事の両立支援に取り組む事業主への助成（出生時両立支援・育児休業等）。",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/ryouritsu01/index.html",
    match(c) {
      if (!c.purposes.includes("worklife")) return { eligible: false };
      const reasons = ["働き方改革・両立支援に取り組む予定がある"];
      const cautions = [
        "中小企業事業主が主な対象",
        "育児休業や介護休業の取得実績・制度整備が必要",
        "一般事業主行動計画の策定・届出が必要な場合がある",
      ];
      if (!isSME(c)) cautions.push("⚠ 大企業は対象外または助成額が異なる場合があります");
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "hatarakikata",
    name: "働き方改革推進支援助成金",
    org: "厚生労働省",
    category: "働き方・両立支援",
    amount: "取組経費の3/4程度（上限あり）",
    summary: "労働時間短縮や年休取得促進など、生産性向上と労働環境改善に取り組む中小企業への助成。",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/jikan/index_00004.html",
    match(c) {
      if (!c.purposes.includes("worklife") && !c.purposes.includes("equipment")) {
        return { eligible: false };
      }
      if (!isSME(c)) {
        return { eligible: false };
      }
      const reasons = ["中小企業に該当する", "労働環境改善・生産性向上に取り組む予定がある"];
      const cautions = [
        "労働者災害補償保険の適用事業主であること",
        "交付決定後に取組（労働時間短縮・勤怠システム導入等）を実施すること",
        "成果目標（時間外労働の削減・年休取得促進等）の設定が必要",
      ];
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "gyomu-kaizen",
    name: "業務改善助成金",
    org: "厚生労働省",
    category: "賃上げ・設備",
    amount: "設備投資経費の最大9/10（賃上げ額・人数に応じ上限変動）",
    summary: "事業場内最低賃金を一定額以上引き上げ、設備投資等で生産性を向上させた中小企業への助成。",
    url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/zigyonushi/shienjigyou/03.html",
    match(c) {
      const wantsWage = c.purposes.includes("wageup");
      const wantsEquip = c.purposes.includes("equipment");
      if (!wantsWage) return { eligible: false };
      if (!isSME(c)) return { eligible: false };
      const reasons = ["中小企業に該当する", "賃上げを予定している"];
      if (wantsEquip) reasons.push("設備投資による生産性向上を予定している");
      const cautions = [
        "事業場内最低賃金と地域別最低賃金の差が一定額以内であること",
        "賃上げと併せて生産性向上に資する設備投資等を行うこと",
        "賃上げ後の状態を継続すること",
      ];
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "monozukuri",
    name: "ものづくり・商業・サービス生産性向上促進補助金",
    org: "中小企業庁",
    category: "設備投資・生産性向上",
    amount: "数百万円〜（補助率1/2〜2/3、類型により上限変動）",
    summary: "革新的な製品・サービス開発や生産プロセス改善のための設備投資を支援する補助金。",
    url: "https://portal.monodukuri-hojo.jp/",
    match(c) {
      if (!c.purposes.includes("equipment")) return { eligible: false };
      if (!isSME(c)) {
        return {
          eligible: false,
        };
      }
      const reasons = ["中小企業・小規模事業者に該当する", "設備投資・生産性向上を予定している"];
      const cautions = [
        "付加価値額の年率平均3%以上向上などの事業計画が必要",
        "認定経営革新等支援機関の確認を受けること",
        "公募期間内の電子申請（GビズID）が必要",
      ];
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "it-dounyu",
    name: "IT導入補助金",
    org: "中小企業庁",
    category: "IT・DX",
    amount: "ITツール導入費の1/2〜3/4（数十万〜数百万円）",
    summary: "業務効率化やDXに資するITツール（ソフト・クラウド等）の導入を支援する補助金。",
    url: "https://it-shien.smrj.go.jp/",
    match(c) {
      if (!c.purposes.includes("it")) return { eligible: false };
      if (!isSME(c)) return { eligible: false };
      const reasons = ["中小企業・小規模事業者に該当する", "ITツール・DX導入を予定している"];
      const cautions = [
        "IT導入支援事業者が登録した対象ITツールを導入すること",
        "GビズIDプライムの取得が必要",
        "SECURITY ACTIONの宣言が必要",
      ];
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "jizokuka",
    name: "小規模事業者持続化補助金",
    org: "中小企業庁／日本商工会議所",
    category: "販路開拓",
    amount: "補助率2/3、上限50〜200万円（枠により変動）",
    summary: "小規模事業者が販路開拓や業務効率化に取り組む際の経費を支援する補助金。",
    url: "https://r3.jizokukahojokin.info/",
    match(c) {
      const wantsSales = c.purposes.includes("sales");
      const wantsIt = c.purposes.includes("it");
      if (!wantsSales && !wantsIt) return { eligible: false };
      if (!isSmallBusiness(c)) {
        return { eligible: false };
      }
      const reasons = ["小規模事業者に該当する"];
      if (wantsSales) reasons.push("販路開拓・新商品開発を予定している");
      const cautions = [
        "商工会・商工会議所の支援（経営計画作成等）を受けること",
        "補助対象となる販路開拓等の取組であること",
        "公募期間内の申請が必要",
      ];
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "saikouchiku",
    name: "事業再構築補助金",
    org: "中小企業庁",
    category: "事業転換",
    amount: "数百万〜数千万円（補助率1/2〜2/3）",
    summary: "新分野展開・業態転換・事業再編など、思い切った事業再構築に挑戦する中小企業等を支援。",
    url: "https://jigyou-saikouchiku.go.jp/",
    match(c) {
      if (!c.purposes.includes("restructure")) return { eligible: false };
      if (!isSME(c)) return { eligible: false };
      const reasons = ["中小企業等に該当する", "新分野展開・事業転換を予定している"];
      const cautions = [
        "認定経営革新等支援機関と連携した事業計画の策定が必要",
        "付加価値額の向上等、公募要領の要件を満たすこと",
        "公募回ごとの締切までに電子申請（GビズID）すること",
      ];
      return { eligible: true, reasons, cautions };
    },
  },
  {
    id: "sougyou",
    name: "創業支援（自治体・日本政策金融公庫等）",
    org: "各自治体／日本政策金融公庫ほか",
    category: "創業",
    amount: "制度により異なる（補助金・低利融資・保証など）",
    summary: "創業・起業を予定する方向けの補助金・融資・専門家支援。自治体ごとに制度が異なります。",
    url: "https://www.jfc.go.jp/n/finance/search/02_zigyousyakaigyou_m.html",
    match(c) {
      if (!c.purposes.includes("startup") && c.yearsInBusiness > 5) {
        return { eligible: false };
      }
      const reasons = [];
      if (c.purposes.includes("startup")) reasons.push("創業・起業を予定している");
      if (c.yearsInBusiness <= 5) reasons.push("創業から間もない（5年以内）");
      const cautions = [
        `お住まい・所在地（${c.prefecture}）の自治体独自の創業支援制度を確認してください`,
        "認定特定創業支援等事業を受けると登録免許税軽減等の優遇あり",
        "事業計画書の作成が必要",
      ];
      return { eligible: reasons.length > 0, reasons, cautions };
    },
  },
  {
    id: "koureisha",
    name: "65歳超雇用推進助成金",
    org: "厚生労働省／高齢・障害・求職者雇用支援機構",
    category: "雇用・人材",
    amount: "定年引上げ等の内容に応じ 数十万〜百数十万円",
    summary: "65歳以上への定年引上げ・継続雇用制度の導入など、高年齢者の雇用環境整備への助成。",
    url: "https://www.jeed.go.jp/elderly/subsidy/index.html",
    match(c) {
      if (!c.purposes.includes("hire") && !c.purposes.includes("worklife")) {
        return { eligible: false };
      }
      const reasons = ["高年齢者の雇用環境整備に取り組む可能性がある"];
      const cautions = [
        "65歳以上への定年引上げ・継続雇用制度の導入等が必要",
        "就業規則の改定が必要",
        "雇用保険の適用事業主であること",
      ];
      return { eligible: true, reasons, cautions };
    },
  },
];

/*
 * 各制度の「目的タグ」と「採択率」のメタ情報を付与。
 *   - purposes:      AI診断の関連度スコアに利用
 *   - adoptionRate:  代表的な採択率（％。年度・公募回で変動する参考値）
 *   - nonCompetitive:true の制度は競争的採択ではなく「要件を満たせば支給」型（助成金）
 */
const SUBSIDY_META = {
  "career-up":      { purposes: ["regularize"],        nonCompetitive: true },
  "jinzai-kaihatsu":{ purposes: ["training"],          nonCompetitive: true },
  "trial":          { purposes: ["hire"],              nonCompetitive: true },
  "ryoritsu":       { purposes: ["worklife"],          nonCompetitive: true },
  "hatarakikata":   { purposes: ["worklife", "equipment"], nonCompetitive: true },
  "gyomu-kaizen":   { purposes: ["wageup", "equipment"],   nonCompetitive: true },
  "monozukuri":     { purposes: ["equipment"],         adoptionRate: 50 },
  "it-dounyu":      { purposes: ["it"],                adoptionRate: 70 },
  "jizokuka":       { purposes: ["sales", "it"],       adoptionRate: 65 },
  "saikouchiku":    { purposes: ["restructure"],       adoptionRate: 45 },
  "sougyou":        { purposes: ["startup"] },
  "koureisha":      { purposes: ["hire", "worklife"],  nonCompetitive: true },
};
SUBSIDIES.forEach((s) => {
  const m = SUBSIDY_META[s.id];
  if (m) Object.assign(s, m);
});

/* =========================================================
 * 管理画面で追加する独自の補助金データ（localStorageに保存）
 * ========================================================= */
const CUSTOM_STORE_KEY = "subsidy-admin-custom-v1";

function loadCustomSubsidies() {
  try {
    const raw = localStorage.getItem(CUSTOM_STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function saveCustomSubsidies(arr) {
  localStorage.setItem(CUSTOM_STORE_KEY, JSON.stringify(arr || []));
}

// 管理画面で作られた独自エントリ用の汎用マッチャ（条件ベース）
function matchCustomEntry(entry, c) {
  if (entry.prefectures && entry.prefectures.length) {
    if (!entry.prefectures.includes(c.prefecture)) return { eligible: false };
  }
  if (entry.employeeMax != null && c.employees > entry.employeeMax) return { eligible: false };
  if (entry.employeeMin != null && c.employees < entry.employeeMin) return { eligible: false };
  if (entry.purposes && entry.purposes.length) {
    const hit = entry.purposes.filter((p) => c.purposes.includes(p));
    if (!hit.length) return { eligible: false };
  }
  const reasons = [];
  if (entry.purposes && entry.purposes.length) {
    const labels = entry.purposes
      .filter((p) => c.purposes.includes(p))
      .map(purposeLabel);
    if (labels.length) reasons.push("選択した目的に合致：" + labels.join("・"));
  }
  if (entry.prefectures && entry.prefectures.length) {
    reasons.push(c.prefecture + " が対象地域に含まれる");
  }
  const cautions = ["公式の募集要領で最新の要件・締切・金額をご確認ください"];
  return { eligible: true, reasons, cautions };
}

// 独自エントリを SUBSIDIES と同じ形（match関数つき）に変換
function customSubsidiesAsRules() {
  return loadCustomSubsidies().map((e) => ({
    ...e,
    isCustom: true,
    match: (c) => matchCustomEntry(e, c),
  }));
}
