#!/usr/bin/env node
/*
 * jGrants（Jグランツ）公開APIから「募集中」の補助金（国・地方自治体）を取得し、
 * data/subsidies.json を生成する。
 *
 * 公式API: https://developers.digital.go.jp/documents/jgrants/api/
 *   一覧: GET /exp/v1/public/subsidies?keyword=...&sort=...&order=...&acceptance=1
 *
 * 依存パッケージなし（Node 18+ のグローバル fetch を使用）。
 * 実行: node scripts/fetch-jgrants.js
 */

const fs = require("fs");
const path = require("path");

const API = "https://api.jgrants-portal.go.jp/exp/v1/public/subsidies";
const PORTAL = "https://www.jgrants-portal.go.jp/subsidy"; // 公開ページ

// 補助金本文に含まれやすい語で網羅的に取得し、id で重複排除する
const KEYWORDS = ["補助", "助成", "支援金", "給付金", "事業"];

// 目的タグの抽出ルール（タイトル文字列に対するマッチ）
// app 側の「やりたいこと」(purposes) と対応させる
const PURPOSE_RULES = [
  { id: "equipment", re: /設備|生産性|機械|導入|省エネ|脱炭素|DX|デジタル/ },
  { id: "it", re: /IT|ＩＴ|デジタル|DX|ＤＸ|システム|ソフト/ },
  { id: "sales", re: /販路|展示会|商談|新商品|新製品|開発|マーケ|ブランド|海外展開|輸出/ },
  { id: "startup", re: /創業|起業|スタートアップ|開業/ },
  { id: "hire", re: /雇用|採用|人材確保|就職/ },
  { id: "training", re: /研修|人材育成|スキル|リスキリング|教育訓練/ },
  { id: "wageup", re: /賃上げ|賃金|処遇改善/ },
  { id: "worklife", re: /働き方|両立|育児|介護|テレワーク|福利厚生/ },
  { id: "restructure", re: /再構築|事業転換|新分野|業態転換|第二創業/ },
];

function derivePurposes(title) {
  const tags = [];
  for (const r of PURPOSE_RULES) {
    if (r.re.test(title)) tags.push(r.id);
  }
  return tags;
}

// "300名以下" → {max:300} / "901名以上" → {min:901} / "従業員数の制約なし" → {}
function parseEmployees(str) {
  if (!str) return {};
  const s = String(str);
  const max = s.match(/(\d+)\s*名以下/);
  const min = s.match(/(\d+)\s*名以上/);
  const out = {};
  if (max) out.max = Number(max[1]);
  if (min) out.min = Number(min[1]);
  return out;
}

async function fetchList(keyword) {
  const url =
    `${API}?keyword=${encodeURIComponent(keyword)}` +
    `&sort=acceptance_end_datetime&order=ASC&acceptance=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`API ${res.status} for keyword=${keyword}`);
  const json = await res.json();
  return Array.isArray(json.result) ? json.result : [];
}

async function main() {
  const byId = new Map();

  for (const kw of KEYWORDS) {
    try {
      const list = await fetchList(kw);
      for (const item of list) {
        if (!byId.has(item.id)) byId.set(item.id, item);
      }
      console.log(`  keyword="${kw}": ${list.length}件 (累計 ${byId.size}件)`);
    } catch (e) {
      console.warn(`  keyword="${kw}" 取得失敗: ${e.message}`);
    }
    // APIへの配慮として少し待つ
    await new Promise((r) => setTimeout(r, 400));
  }

  const now = Date.now();
  const subsidies = [];
  for (const item of byId.values()) {
    const end = item.acceptance_end_datetime ? Date.parse(item.acceptance_end_datetime) : null;
    // 念のため締切超過を除外
    if (end && end < now) continue;

    const emp = parseEmployees(item.target_number_of_employees);
    subsidies.push({
      id: item.id,
      title: item.title,
      institution: item.institution_name || null,
      prefecture: item.target_area_search || null, // "全国" or 都道府県名
      employeeMax: emp.max ?? null,
      employeeMin: emp.min ?? null,
      employeeLimitText: item.target_number_of_employees || null,
      maxAmount: typeof item.subsidy_max_limit === "number" ? item.subsidy_max_limit : null,
      acceptanceStart: item.acceptance_start_datetime || null,
      acceptanceEnd: item.acceptance_end_datetime || null,
      purposes: derivePurposes(item.title || ""),
      url: `${PORTAL}/${item.id}`,
    });
  }

  // 締切が近い順
  subsidies.sort((a, b) => {
    const ea = a.acceptanceEnd ? Date.parse(a.acceptanceEnd) : Infinity;
    const eb = b.acceptanceEnd ? Date.parse(b.acceptanceEnd) : Infinity;
    return ea - eb;
  });

  const out = {
    source: "jGrants (Jグランツ) 公開API",
    sourceUrl: "https://www.jgrants-portal.go.jp/",
    updatedAt: new Date().toISOString(),
    count: subsidies.length,
    subsidies,
  };

  const outDir = path.join(__dirname, "..", "data");
  fs.mkdirSync(outDir, { recursive: true });

  // 1) JSON（プログラム利用・可搬性のため）
  const jsonPath = path.join(outDir, "subsidies.json");
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2) + "\n", "utf8");

  // 2) JS（ブラウザが file:// で直接開いても fetch なしで読めるように）
  const jsPath = path.join(outDir, "subsidies.js");
  const jsBody =
    "/* 自動生成ファイル — 直接編集しないでください。`node scripts/fetch-jgrants.js` で再生成します。 */\n" +
    "window.JGRANTS_DATA = " +
    JSON.stringify(out) +
    ";\n";
  fs.writeFileSync(jsPath, jsBody, "utf8");

  console.log(
    `\n✓ ${subsidies.length}件を ${path.relative(process.cwd(), jsonPath)} と ` +
      `${path.relative(process.cwd(), jsPath)} に保存しました。`
  );
}

main().catch((e) => {
  console.error("取得に失敗しました:", e);
  process.exit(1);
});
