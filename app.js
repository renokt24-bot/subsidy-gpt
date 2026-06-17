/* 会社情報から利用できる助成金・補助金を判定して表示するロジック */

(function () {
  "use strict";

  // 業種・都道府県・目的のフォームを動的に生成
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
      const label = document.createElement("label");
      label.className = "chip";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = p.id;
      cb.name = "purpose";
      const span = document.createElement("span");
      span.textContent = p.label;
      label.appendChild(cb);
      label.appendChild(span);
      purposeWrap.appendChild(label);
    });
  }

  // フォームから会社情報を取得
  function readCompany() {
    const purposes = Array.from(
      document.querySelectorAll('input[name="purpose"]:checked')
    ).map((el) => el.value);

    return {
      prefecture: document.getElementById("prefecture").value,
      industry: document.getElementById("industry").value,
      employees: Number(document.getElementById("employees").value) || 0,
      capital: Number(document.getElementById("capital").value) || 0, // 万円
      yearsInBusiness: Number(document.getElementById("years").value) || 0,
      purposes,
    };
  }

  // 入力チェック（必須項目の確認）
  function validate() {
    const required = ["prefecture", "industry", "employees", "capital", "years"];
    for (const id of required) {
      const el = document.getElementById(id);
      if (!el.value) {
        el.focus();
        return "すべての会社情報を入力してください。";
      }
    }
    return null;
  }

  // 画面切り替え（入力フォーム ⇄ 補助金一覧）
  function showScreen(name) {
    const form = document.getElementById("screen-form");
    const results = document.getElementById("screen-results");
    const isResults = name === "results";
    form.classList.toggle("is-active", !isResults);
    results.classList.toggle("is-active", isResults);
    form.setAttribute("aria-hidden", String(isResults));
    results.setAttribute("aria-hidden", String(!isResults));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 判定の実行（収録ルールベースの助成金）
  function evaluate(company) {
    const results = [];
    SUBSIDIES.forEach((s) => {
      const r = s.match(company);
      if (r && r.eligible) {
        results.push({ subsidy: s, reasons: r.reasons || [], cautions: r.cautions || [] });
      }
    });
    return results;
  }

  // jGrants（公式・募集中の補助金）から会社条件に合うものを抽出
  function filterJgrants(company) {
    const data = window.JGRANTS_DATA;
    if (!data || !Array.isArray(data.subsidies)) return [];
    const now = Date.now();

    const matched = data.subsidies.filter((s) => {
      // 地域: 全国 もしくは 所在都道府県のみ
      if (s.prefecture && s.prefecture !== "全国" && s.prefecture !== company.prefecture) {
        return false;
      }
      // 従業員数の上限・下限
      if (s.employeeMax != null && company.employees > s.employeeMax) return false;
      if (s.employeeMin != null && company.employees < s.employeeMin) return false;
      // 募集期間（締切超過を除外）
      if (s.acceptanceEnd && Date.parse(s.acceptanceEnd) < now) return false;
      // 目的: 選択があり、かつ制度側に目的タグがある場合は一致を要求
      if (company.purposes.length && s.purposes && s.purposes.length) {
        if (!s.purposes.some((p) => company.purposes.includes(p))) return false;
      }
      return true;
    });

    // 関連度でランキング：
    //   1. 選択した目的との一致数が多い
    //   2. 地域密着（自治体）の制度を「全国」より優先
    //   3. 締切が近い順
    const purposeHits = (s) =>
      company.purposes.length && s.purposes
        ? s.purposes.filter((p) => company.purposes.includes(p)).length
        : 0;
    const deadline = (s) => (s.acceptanceEnd ? Date.parse(s.acceptanceEnd) : Infinity);

    return matched.sort((a, b) => {
      const ph = purposeHits(b) - purposeHits(a);
      if (ph !== 0) return ph;
      const localA = a.prefecture && a.prefecture !== "全国" ? 0 : 1;
      const localB = b.prefecture && b.prefecture !== "全国" ? 0 : 1;
      if (localA !== localB) return localA - localB;
      return deadline(a) - deadline(b);
    });
  }

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

  // 結果の描画
  function render(company, results, jgrants) {
    const out = document.getElementById("results");
    out.innerHTML = "";

    const total = results.length + jgrants.length;

    // 一覧画面ヘッダーの件数表示
    const count = document.getElementById("result-count");
    count.innerHTML =
      total > 0
        ? `<strong>${total}件</strong>の候補が見つかりました`
        : `条件に一致する制度はありませんでした`;

    const summary = document.createElement("div");
    summary.className = "result-summary";
    summary.innerHTML =
      total > 0
        ? `要件マッチ ${results.length}件／募集中の公式補助金 ${jgrants.length}件`
        : "「やりたいこと」を追加で選択するか、条件を変えてお試しください。";
    out.appendChild(summary);

    if (results.length) {
      const h = document.createElement("h2");
      h.className = "section-title";
      h.textContent = "要件にマッチした助成金（雇用・人材系ほか）";
      out.appendChild(h);
    }

    results.forEach((res) => {
      const s = res.subsidy;
      const card = document.createElement("article");
      card.className = "card";

      const head = document.createElement("div");
      head.className = "card-head";
      head.innerHTML = `
        <span class="tag">${s.category}</span>
        <h3>${s.name}</h3>
        <div class="org">${s.org}</div>
      `;
      card.appendChild(head);

      const body = document.createElement("div");
      body.className = "card-body";
      body.innerHTML = `<p class="summary">${s.summary}</p>
        <p class="amount"><span>支給額の目安</span>${s.amount}</p>`;

      if (res.reasons.length) {
        const ul = document.createElement("ul");
        ul.className = "reasons";
        res.reasons.forEach((t) => {
          const li = document.createElement("li");
          li.textContent = t;
          ul.appendChild(li);
        });
        const h = document.createElement("div");
        h.className = "list-title ok";
        h.textContent = "✓ あてはまる点";
        body.appendChild(h);
        body.appendChild(ul);
      }

      if (res.cautions.length) {
        const ul = document.createElement("ul");
        ul.className = "cautions";
        res.cautions.forEach((t) => {
          const li = document.createElement("li");
          li.textContent = t;
          ul.appendChild(li);
        });
        const h = document.createElement("div");
        h.className = "list-title warn";
        h.textContent = "！ 確認・準備が必要な条件";
        body.appendChild(h);
        body.appendChild(ul);
      }

      const link = document.createElement("a");
      link.href = s.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "detail-link";
      link.textContent = "公式の詳細を見る →";
      body.appendChild(link);

      card.appendChild(body);
      out.appendChild(card);
    });

    renderJgrants(out, jgrants);
  }

  // jGrants（公式・募集中）の補助金カード群を描画
  function renderJgrants(out, jgrants) {
    if (!jgrants.length) return;

    const h = document.createElement("h2");
    h.className = "section-title";
    h.textContent = "募集中の補助金（国・地方自治体／公式データ）";
    out.appendChild(h);

    const meta = window.JGRANTS_DATA;
    if (meta && meta.updatedAt) {
      const note = document.createElement("div");
      note.className = "source-note";
      note.textContent = `出典: ${meta.source}（データ更新: ${formatDate(meta.updatedAt)}）`;
      out.appendChild(note);
    }

    const MAX_SHOW = 40;
    jgrants.slice(0, MAX_SHOW).forEach((s) => {
      const card = document.createElement("article");
      card.className = "card jgrants";

      const head = document.createElement("div");
      head.className = "card-head";
      const pref = s.prefecture || "全国";
      head.innerHTML = `
        <div class="badges">
          <span class="tag area">${pref}</span>
          ${s.employeeLimitText ? `<span class="tag emp">${s.employeeLimitText}</span>` : ""}
        </div>
        <h3>${escapeHtml(s.title)}</h3>
        ${s.institution ? `<div class="org">${escapeHtml(s.institution)}</div>` : ""}
      `;
      card.appendChild(head);

      const body = document.createElement("div");
      body.className = "card-body";
      body.innerHTML = `
        <p class="amount"><span>補助上限</span>${formatAmount(s.maxAmount)}</p>
        <p class="period"><span>募集期間</span>${formatDate(s.acceptanceStart)} 〜 ${formatDate(
        s.acceptanceEnd
      )}</p>
      `;

      const link = document.createElement("a");
      link.href = s.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "detail-link";
      link.textContent = "jGrantsで詳細・申請する →";
      body.appendChild(link);

      card.appendChild(body);
      out.appendChild(card);
    });

    if (jgrants.length > MAX_SHOW) {
      const more = document.createElement("div");
      more.className = "source-note";
      more.textContent = `ほか ${jgrants.length - MAX_SHOW}件（締切が近い順に${MAX_SHOW}件を表示しています）`;
      out.appendChild(more);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

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

    const company = readCompany();
    const results = evaluate(company);
    const jgrants = filterJgrants(company);
    render(company, results, jgrants);
    showScreen("results");
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildForm();
    document.getElementById("company-form").addEventListener("submit", onSubmit);
    document.getElementById("back-button").addEventListener("click", function () {
      showScreen("form");
    });
  });
})();
