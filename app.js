/* 会社情報から利用できる助成金・補助金を診断・表示するメインロジック */

(function () {
  "use strict";

  // ====== 状態 ======
  let lastCompany = null;
  let lastCandidates = [];
  let currentSort = "ai";
  let adminEditingId = null;

  // ====== 小さなDOMヘルパー ======
  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ====== フォーム生成 ======
  function buildForm() {
    const industrySel = document.getElementById("industry");
    INDUSTRIES.forEach((i) => {
      const opt = document.createElement("option");
      opt.value = i.id;
      opt.textContent = i.label;
      industrySel.appendChild(opt);
    });

    const prefSel = document.getElementById("prefecture");
    PREFECTURES.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      prefSel.appendChild(opt);
    });

    const purposeWrap = document.getElementById("purposes");
    PURPOSES.forEach((p) => {
      const label = el("label", "chip");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = p.id;
      cb.name = "purpose";
      label.appendChild(cb);
      label.appendChild(el("span", null, p.label));
      purposeWrap.appendChild(label);
    });
  }

  // ====== 1. 法人番号検索 ======
  function setupCorporateSearch() {
    const btn = document.getElementById("corp-search");
    const input = document.getElementById("company-name");
    const box = document.getElementById("corp-results");
    if (!btn) return;

    async function run() {
      const name = input.value.trim();
      box.innerHTML = "";
      if (!name) {
        box.appendChild(el("div", "corp-note", "会社名を入力してください。"));
        return;
      }
      box.appendChild(el("div", "corp-note", "検索中…"));
      const { source, results, error } = await window.CorporateLookup.lookupByName(name);
      box.innerHTML = "";
      if (error) box.appendChild(el("div", "corp-note", "APIに接続できずサンプルデータで検索しました。"));
      if (!results.length) {
        box.appendChild(el("div", "corp-note", "該当する法人が見つかりませんでした（手入力でも続行できます）。"));
        if (source === "sample") {
          box.appendChild(el("div", "corp-note", "※ 既定ではデモ用サンプル法人で検索します（例：「サンプル」「テクノロジー」等で試せます）。"));
        }
        return;
      }
      results.slice(0, 8).forEach((r) => {
        const item = el("button", "corp-item");
        item.type = "button";
        item.innerHTML =
          `<strong>${escapeHtml(r.name)}</strong>` +
          `<span>${escapeHtml(r.prefecture || "")} ${escapeHtml(r.address || "")}` +
          (r.corporateNumber ? `（法人番号: ${escapeHtml(r.corporateNumber)}）` : "") +
          `</span>`;
        item.addEventListener("click", () => applyCorporate(r));
        box.appendChild(item);
      });
      if (source === "sample") {
        box.appendChild(el("div", "corp-note", "※ デモ用サンプルデータです。本番の法人情報はAPI設定後に取得されます。"));
      }
    }

    btn.addEventListener("click", run);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        run();
      }
    });
  }

  // 法人検索結果をフォームに反映（所在地を自動入力）
  function applyCorporate(r) {
    const box = document.getElementById("corp-results");
    if (r.prefecture && PREFECTURES.includes(r.prefecture)) {
      document.getElementById("prefecture").value = r.prefecture;
    }
    box.innerHTML = "";
    const msg = el(
      "div",
      "corp-applied",
      `「${r.name}」を反映しました。所在地を自動入力済みです。従業員数・資本金・業種・やりたいことを入力してください。`
    );
    box.appendChild(msg);
  }

  // ====== 入力読み取り・検証 ======
  function readCompany() {
    const purposes = Array.from(
      document.querySelectorAll('input[name="purpose"]:checked')
    ).map((e) => e.value);
    return {
      companyName: document.getElementById("company-name").value.trim(),
      prefecture: document.getElementById("prefecture").value,
      industry: document.getElementById("industry").value,
      employees: Number(document.getElementById("employees").value) || 0,
      capital: Number(document.getElementById("capital").value) || 0,
      yearsInBusiness: Number(document.getElementById("years").value) || 0,
      purposes,
    };
  }
  function validate() {
    const required = ["prefecture", "industry", "employees", "capital", "years"];
    for (const id of required) {
      const e = document.getElementById(id);
      if (!e.value) {
        e.focus();
        return "所在地・業種・従業員数・資本金・創業からの年数をすべて入力してください。";
      }
    }
    return null;
  }

  // ====== 画面遷移 ======
  function showScreen(name) {
    const screens = ["form", "results", "agent", "admin"];
    screens.forEach((s) => {
      const node = document.getElementById("screen-" + s);
      const active = s === name;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-hidden", String(!active));
    });
    document.querySelectorAll(".nav-link").forEach((a) => {
      a.classList.toggle("current", a.dataset.target === name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ====== マッチング ======
  function allRuleSubsidies() {
    return SUBSIDIES.concat(customSubsidiesAsRules());
  }
  function evaluate(company) {
    const out = [];
    allRuleSubsidies().forEach((s) => {
      const r = s.match(company);
      if (r && r.eligible) {
        out.push({ subsidy: s, reasons: r.reasons || [], cautions: r.cautions || [] });
      }
    });
    return out;
  }
  function filterJgrants(company) {
    const data = window.JGRANTS_DATA;
    if (!data || !Array.isArray(data.subsidies)) return [];
    const now = Date.now();
    return data.subsidies.filter((s) => {
      if (s.prefecture && s.prefecture !== "全国" && s.prefecture !== company.prefecture) return false;
      if (s.employeeMax != null && company.employees > s.employeeMax) return false;
      if (s.employeeMin != null && company.employees < s.employeeMin) return false;
      if (s.acceptanceEnd && Date.parse(s.acceptanceEnd) < now) return false;
      if (company.purposes.length && s.purposes && s.purposes.length) {
        if (!s.purposes.some((p) => company.purposes.includes(p))) return false;
      }
      return true;
    });
  }

  // ====== 統合候補モデル ======
  function parseAmountText(text) {
    if (!text) return null;
    const m = String(text).match(/([\d,]+)\s*万円/g);
    if (m && m.length) {
      const nums = m.map((x) => Number(x.replace(/[^\d]/g, "")) * 10000);
      return Math.max.apply(null, nums);
    }
    return null;
  }
  function ruleToCandidate(res) {
    const s = res.subsidy;
    return {
      source: s.isCustom ? "custom" : "rule",
      id: s.id,
      name: s.name,
      org: s.org,
      category: s.category,
      summary: s.summary || "",
      url: s.url,
      amountText: s.amount,
      amountValue: parseAmountText(s.amount),
      prefecture: null,
      acceptanceEnd: null,
      adoptionRate: s.nonCompetitive ? null : s.adoptionRate != null ? s.adoptionRate : null,
      nonCompetitive: !!s.nonCompetitive,
      purposes: s.purposes || [],
      reasons: res.reasons,
      cautions: res.cautions,
      empText: null,
      linkText: "公式の詳細を見る →",
    };
  }
  function jgrantsToCandidate(s) {
    return {
      source: "jgrants",
      id: s.id,
      name: s.title,
      org: s.institution || "",
      category: "募集中の補助金",
      summary: "",
      url: s.url,
      amountText: formatAmount(s.maxAmount),
      amountValue: s.maxAmount || null,
      prefecture: s.prefecture || "全国",
      acceptanceStart: s.acceptanceStart || null,
      acceptanceEnd: s.acceptanceEnd || null,
      adoptionRate: null,
      nonCompetitive: false,
      purposes: s.purposes || [],
      reasons: [],
      cautions: [],
      empText: s.employeeLimitText || null,
      linkText: "jGrantsで詳細・申請する →",
    };
  }

  function buildCandidates(company) {
    const list = [];
    evaluate(company).forEach((res) => list.push(ruleToCandidate(res)));
    filterJgrants(company).forEach((s) => list.push(jgrantsToCandidate(s)));
    list.forEach((c) => Object.assign(c, diagnose(c, company)));
    return list;
  }

  // ====== 2. AI補助金診断（スコアリング） ======
  function diagnose(cand, company) {
    let score = 0;
    const why = [];

    // 目的一致（最大35点）
    const pm = cand.purposes.filter((p) => company.purposes.includes(p)).length;
    score += Math.min(35, pm * 18);
    if (pm > 0) why.push(`やりたいことが${pm}件一致`);

    // 採択率・支給型（最大25点）
    if (cand.nonCompetitive) {
      score += 23;
      why.push("要件を満たせば支給");
    } else if (cand.adoptionRate != null) {
      score += Math.round((cand.adoptionRate / 100) * 25);
      why.push(`採択率 約${cand.adoptionRate}%`);
    } else {
      score += 12;
    }

    // 締切の近さ（最大20点）
    const ts = cand.acceptanceEnd ? Date.parse(cand.acceptanceEnd) : null;
    if (ts) {
      const days = Math.ceil((ts - Date.now()) / 86400000);
      if (days <= 14) score += 20;
      else if (days <= 30) score += 16;
      else if (days <= 60) score += 12;
      else if (days <= 90) score += 9;
      else score += 6;
      why.push(`締切まで約${days}日`);
    } else {
      score += 6;
    }

    // 補助額の大きさ（最大12点）
    const a = cand.amountValue;
    if (a != null) {
      if (a >= 10000000) score += 12;
      else if (a >= 3000000) score += 9;
      else if (a >= 1000000) score += 6;
      else score += 3;
    } else {
      score += 4;
    }

    // 地域密着（最大8点）
    if (cand.source === "jgrants") {
      score += cand.prefecture && cand.prefecture !== "全国" ? 8 : 4;
    } else {
      score += 5;
    }

    score = Math.min(100, Math.round(score));
    let priority, priorityLabel;
    if (score >= 70) {
      priority = "high";
      priorityLabel = "優先度 高";
    } else if (score >= 48) {
      priority = "mid";
      priorityLabel = "優先度 中";
    } else {
      priority = "low";
      priorityLabel = "優先度 低";
    }
    return { score, priority, priorityLabel, reasonText: why.slice(0, 3).join(" ／ ") };
  }

  // ====== フォーマッタ ======
  function formatAmount(n) {
    if (!n || n <= 0) return "公募要領を確認";
    if (n >= 10000) return "上限 約" + Math.round(n / 10000).toLocaleString() + "万円";
    return "上限 " + n.toLocaleString() + "円";
  }
  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return "—";
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }

  // ====== 4. 並び替え ======
  function sortCandidates(list) {
    const byScore = (a, b) => b.score - a.score;
    const dl = (c) => (c.acceptanceEnd ? Date.parse(c.acceptanceEnd) : Infinity);
    const arr = list.slice();
    if (currentSort === "deadline") return arr.sort((a, b) => dl(a) - dl(b) || byScore(a, b));
    if (currentSort === "adoption") {
      const r = (c) => (c.nonCompetitive ? 100 : c.adoptionRate != null ? c.adoptionRate : -1);
      return arr.sort((a, b) => r(b) - r(a) || byScore(a, b));
    }
    if (currentSort === "amount") {
      const v = (c) => (c.amountValue != null ? c.amountValue : -1);
      return arr.sort((a, b) => v(b) - v(a) || byScore(a, b));
    }
    return arr.sort(byScore);
  }

  // ====== レンダリング ======
  function renderResults() {
    const out = document.getElementById("results");
    out.innerHTML = "";

    const total = lastCandidates.length;
    const count = document.getElementById("result-count");
    count.innerHTML =
      total > 0
        ? `<strong>${total}件</strong>の候補が見つかりました`
        : "条件に一致する制度はありませんでした";

    if (total === 0) {
      out.appendChild(
        el("div", "result-summary", "「やりたいこと」を追加で選ぶか、条件を変えてお試しください。")
      );
      return;
    }

    const highCount = lastCandidates.filter((c) => c.priority === "high").length;
    const intro = el("div", "ai-intro");
    intro.innerHTML =
      `<span class="ai-badge">AI診断</span>` +
      `会社情報をもとに <strong>${total}件</strong> を優先度づけしました（優先度 高：${highCount}件）。` +
      `<span class="ai-note">※ 目的一致・採択率・締切・補助額・地域から自動スコアリングした参考値です。</span>`;
    out.appendChild(intro);

    const meta = window.JGRANTS_DATA;
    if (meta && meta.updatedAt) {
      out.appendChild(
        el("div", "source-note", `公式補助金の出典: ${meta.source}（データ更新: ${formatDate(meta.updatedAt)}）`)
      );
    }

    sortCandidates(lastCandidates).forEach((c) => out.appendChild(candidateCard(c)));

    // 申請代行への導線
    const cta = el("div", "agent-cta");
    cta.appendChild(el("p", null, "どれに申請すべきか迷ったら、専門スタッフが書類作成までサポートします。"));
    const b = el("button", "cta secondary", "申請代行サービスに相談する");
    b.type = "button";
    b.addEventListener("click", () => openAgentForm(""));
    cta.appendChild(b);
    out.appendChild(cta);
  }

  function candidateCard(c) {
    const card = el("article", "card cand " + c.source + " prio-" + c.priority);

    // ヘッダー
    const head = el("div", "card-head");
    const badges = el("div", "badges");
    badges.appendChild(el("span", "prio-badge " + c.priority, `${c.priorityLabel}・${c.score}点`));
    if (c.source === "jgrants") {
      badges.appendChild(el("span", "tag area", c.prefecture || "全国"));
      if (c.empText) badges.appendChild(el("span", "tag emp", c.empText));
    } else {
      badges.appendChild(el("span", "tag", c.category));
      if (c.source === "custom") badges.appendChild(el("span", "tag custom", "独自登録"));
    }
    head.appendChild(badges);
    head.appendChild(el("h3", null, c.name));
    if (c.org) head.appendChild(el("div", "org", c.org));
    card.appendChild(head);

    // 本体
    const body = el("div", "card-body");
    if (c.summary) body.appendChild(el("p", "summary", c.summary));

    // 統計（支給額・採択率・締切）
    const stats = el("div", "stats");
    stats.appendChild(statItem("支給/補助額", c.amountText || "—"));
    if (c.nonCompetitive) stats.appendChild(statItem("採択率", "要件を満たせば支給"));
    else if (c.adoptionRate != null) stats.appendChild(statItem("採択率", `約${c.adoptionRate}%（参考）`));
    if (c.acceptanceEnd) stats.appendChild(statItem("申請締切", formatDate(c.acceptanceEnd)));
    body.appendChild(stats);

    // AI診断の理由
    if (c.reasonText) {
      const ai = el("p", "ai-reason");
      ai.innerHTML = `<span>🤖 診断</span>${escapeHtml(c.reasonText)}`;
      body.appendChild(ai);
    }

    // あてはまる点 / 確認が必要な条件（ルール系のみ）
    if (c.reasons && c.reasons.length) {
      body.appendChild(el("div", "list-title ok", "✓ あてはまる点"));
      const ul = el("ul", "reasons");
      c.reasons.forEach((t) => ul.appendChild(el("li", null, t)));
      body.appendChild(ul);
    }
    if (c.cautions && c.cautions.length) {
      body.appendChild(el("div", "list-title warn", "！ 確認・準備が必要な条件"));
      const ul = el("ul", "cautions");
      c.cautions.forEach((t) => ul.appendChild(el("li", null, t)));
      body.appendChild(ul);
    }

    // リンク・申請代行ボタン
    const actions = el("div", "card-actions");
    if (c.url) {
      const link = document.createElement("a");
      link.href = c.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "detail-link";
      link.textContent = c.linkText;
      actions.appendChild(link);
    }
    const ab = el("button", "agent-link", "申請代行に相談");
    ab.type = "button";
    ab.addEventListener("click", () => openAgentForm(c.name));
    actions.appendChild(ab);
    body.appendChild(actions);

    card.appendChild(body);
    return card;
  }

  function statItem(label, value) {
    const d = el("div", "stat");
    d.appendChild(el("span", "stat-label", label));
    d.appendChild(el("span", "stat-value", value));
    return d;
  }

  // ====== 5. 申請代行 問い合わせフォーム ======
  function openAgentForm(subsidyName) {
    document.getElementById("ag-subsidy").value = subsidyName || "";
    if (lastCompany && lastCompany.companyName) {
      document.getElementById("ag-company").value = lastCompany.companyName;
    }
    document.getElementById("ag-success").hidden = true;
    showScreen("agent");
  }
  function submitAgentForm(e) {
    e.preventDefault();
    const get = (id) => document.getElementById(id).value.trim();
    const company = get("ag-company");
    const person = get("ag-name");
    const email = get("ag-email");
    const tel = get("ag-tel");
    const subsidy = get("ag-subsidy");
    const message = get("ag-message");
    const errEl = document.getElementById("ag-error");

    if (!company || !person || !email || !message) {
      errEl.textContent = "会社名・ご担当者名・メールアドレス・相談内容は必須です。";
      errEl.hidden = false;
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.textContent = "メールアドレスの形式をご確認ください。";
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    // ローカルに記録（管理者が後で確認できるよう保存）
    try {
      const key = "subsidy-inquiries-v1";
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push({ company, person, email, tel, subsidy, message, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (err) {}

    // mailto: でメール作成
    const to = (window.APP_CONFIG && window.APP_CONFIG.agentEmail) || "your-company@example.com";
    const subject = `【申請代行のご相談】${company}`;
    const body =
      `会社名: ${company}\n` +
      `ご担当者: ${person}\n` +
      `メール: ${email}\n` +
      `電話: ${tel || "（未記入）"}\n` +
      `相談したい補助金: ${subsidy || "（未定・おまかせ）"}\n\n` +
      `相談内容:\n${message}\n`;
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const success = document.getElementById("ag-success");
    success.innerHTML =
      `送信内容を受け付けました。メールソフトが開かない場合は、下記アドレス宛にお送りください。<br>` +
      `<strong>${escapeHtml(to)}</strong>`;
    success.hidden = false;
    window.location.href = mailto;
  }

  // ====== 6. 管理画面 ======
  function setupAdmin() {
    // 目的チェックボックス
    const pw = document.getElementById("ad-purposes");
    PURPOSES.forEach((p) => {
      const label = el("label", "chip small");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = p.id;
      cb.name = "ad-purpose";
      label.appendChild(cb);
      label.appendChild(el("span", null, p.label));
      pw.appendChild(label);
    });
    // 都道府県マルチセレクト
    const ps = document.getElementById("ad-prefs");
    PREFECTURES.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      ps.appendChild(opt);
    });

    document.getElementById("admin-form").addEventListener("submit", saveAdmin);
    document.getElementById("ad-reset").addEventListener("click", resetAdminForm);
    document.getElementById("ad-export").addEventListener("click", exportCustom);
    document.getElementById("ad-import").addEventListener("change", importCustom);
    document.getElementById("ad-clear").addEventListener("click", clearCustom);
  }

  function renderAdmin() {
    const list = document.getElementById("admin-list");
    list.innerHTML = "";
    const custom = loadCustomSubsidies();

    const wrap = el("div", "table-wrap");
    const table = document.createElement("table");
    table.className = "admin-table";
    table.innerHTML =
      "<thead><tr><th>制度名</th><th>所管</th><th>カテゴリ</th><th>採択率</th><th>操作</th></tr></thead>";
    const tbody = document.createElement("tbody");
    if (!custom.length) {
      const tr = document.createElement("tr");
      const td = el("td", "empty", "独自登録された補助金はまだありません。下のフォームから追加できます。");
      td.colSpan = 5;
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    custom.forEach((entry) => {
      const tr = document.createElement("tr");
      tr.appendChild(el("td", null, entry.name));
      tr.appendChild(el("td", null, entry.org || "—"));
      tr.appendChild(el("td", null, entry.category || "—"));
      tr.appendChild(el("td", null, entry.adoptionRate != null ? entry.adoptionRate + "%" : "—"));
      const ops = document.createElement("td");
      const edit = el("button", "mini", "編集");
      edit.type = "button";
      edit.addEventListener("click", () => loadIntoForm(entry));
      const del = el("button", "mini danger", "削除");
      del.type = "button";
      del.addEventListener("click", () => deleteCustom(entry.id));
      ops.appendChild(edit);
      ops.appendChild(del);
      tr.appendChild(ops);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    list.appendChild(wrap);

    // 内蔵制度（読み取り専用）の参照
    const builtin = el("details", "builtin-ref");
    const sum = el("summary", null, `内蔵の制度（${SUBSIDIES.length}件・読み取り専用）`);
    builtin.appendChild(sum);
    const ul = el("ul");
    SUBSIDIES.forEach((s) => ul.appendChild(el("li", null, `${s.name}（${s.org}）`)));
    builtin.appendChild(ul);
    list.appendChild(builtin);
  }

  function readAdminForm() {
    const get = (id) => document.getElementById(id).value.trim();
    const purposes = Array.from(
      document.querySelectorAll('input[name="ad-purpose"]:checked')
    ).map((e) => e.value);
    const prefectures = Array.from(document.getElementById("ad-prefs").selectedOptions).map(
      (o) => o.value
    );
    const rate = document.getElementById("ad-rate").value;
    const empMin = document.getElementById("ad-empmin").value;
    const empMax = document.getElementById("ad-empmax").value;
    return {
      id: adminEditingId || "custom-" + Date.now(),
      name: get("ad-name"),
      org: get("ad-org"),
      category: get("ad-category") || "独自登録",
      amount: get("ad-amount"),
      summary: get("ad-summary"),
      url: get("ad-url"),
      adoptionRate: rate === "" ? null : Number(rate),
      purposes,
      prefectures,
      employeeMin: empMin === "" ? null : Number(empMin),
      employeeMax: empMax === "" ? null : Number(empMax),
    };
  }

  function saveAdmin(e) {
    e.preventDefault();
    const entry = readAdminForm();
    const errEl = document.getElementById("ad-error");
    if (!entry.name) {
      errEl.textContent = "制度名は必須です。";
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;
    const arr = loadCustomSubsidies();
    const idx = arr.findIndex((x) => x.id === entry.id);
    if (idx >= 0) arr[idx] = entry;
    else arr.push(entry);
    saveCustomSubsidies(arr);
    resetAdminForm();
    renderAdmin();
  }

  function loadIntoForm(entry) {
    adminEditingId = entry.id;
    document.getElementById("ad-name").value = entry.name || "";
    document.getElementById("ad-org").value = entry.org || "";
    document.getElementById("ad-category").value = entry.category || "";
    document.getElementById("ad-amount").value = entry.amount || "";
    document.getElementById("ad-summary").value = entry.summary || "";
    document.getElementById("ad-url").value = entry.url || "";
    document.getElementById("ad-rate").value = entry.adoptionRate != null ? entry.adoptionRate : "";
    document.getElementById("ad-empmin").value = entry.employeeMin != null ? entry.employeeMin : "";
    document.getElementById("ad-empmax").value = entry.employeeMax != null ? entry.employeeMax : "";
    document.querySelectorAll('input[name="ad-purpose"]').forEach((cb) => {
      cb.checked = (entry.purposes || []).includes(cb.value);
    });
    Array.from(document.getElementById("ad-prefs").options).forEach((o) => {
      o.selected = (entry.prefectures || []).includes(o.value);
    });
    document.getElementById("ad-save").textContent = "更新を保存";
    window.scrollTo({ top: document.getElementById("admin-form").offsetTop - 20, behavior: "smooth" });
  }

  function resetAdminForm() {
    adminEditingId = null;
    document.getElementById("admin-form").reset();
    Array.from(document.getElementById("ad-prefs").options).forEach((o) => (o.selected = false));
    document.getElementById("ad-save").textContent = "この内容で追加";
    document.getElementById("ad-error").hidden = true;
  }

  function deleteCustom(id) {
    if (!window.confirm("この補助金データを削除しますか？")) return;
    saveCustomSubsidies(loadCustomSubsidies().filter((x) => x.id !== id));
    renderAdmin();
  }

  function clearCustom() {
    if (!window.confirm("独自登録した補助金データをすべて削除しますか？")) return;
    saveCustomSubsidies([]);
    renderAdmin();
  }

  function exportCustom() {
    const data = JSON.stringify(loadCustomSubsidies(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "custom-subsidies.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importCustom(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error("配列形式のJSONを指定してください。");
        saveCustomSubsidies(arr);
        renderAdmin();
        alert(`${arr.length}件を読み込みました。`);
      } catch (err) {
        alert("読み込みに失敗しました: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ====== 送信ハンドラ ======
  function onSubmit(e) {
    e.preventDefault();
    const errEl = document.getElementById("form-error");
    const err = validate();
    if (err) {
      errEl.textContent = err;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;
    lastCompany = readCompany();
    lastCandidates = buildCandidates(lastCompany);
    currentSort = "ai";
    document.getElementById("sort-select").value = "ai";
    renderResults();
    showScreen("results");
  }

  // ====== 初期化 ======
  document.addEventListener("DOMContentLoaded", function () {
    buildForm();
    setupCorporateSearch();
    setupAdmin();

    document.getElementById("company-form").addEventListener("submit", onSubmit);
    document.getElementById("back-button").addEventListener("click", () => showScreen("form"));
    document.getElementById("sort-select").addEventListener("change", function () {
      currentSort = this.value;
      renderResults();
    });
    document.getElementById("agent-form").addEventListener("submit", submitAgentForm);
    document.getElementById("ag-back").addEventListener("click", () => showScreen("results"));

    document.querySelectorAll(".nav-link").forEach((a) => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const t = a.dataset.target;
        if (t === "admin") renderAdmin();
        showScreen(t);
      });
    });
  });
})();
