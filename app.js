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

  // 判定の実行
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

  // 結果の描画
  function render(company, results) {
    const out = document.getElementById("results");
    out.innerHTML = "";

    const summary = document.createElement("div");
    summary.className = "result-summary";
    summary.innerHTML =
      results.length > 0
        ? `<strong>${results.length}件</strong>の助成金・補助金が候補として見つかりました。`
        : "条件に一致する制度が見つかりませんでした。「やりたいこと」を追加で選択してみてください。";
    out.appendChild(summary);

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

    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function onSubmit(e) {
    e.preventDefault();
    const company = readCompany();
    const results = evaluate(company);
    render(company, results);
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildForm();
    document.getElementById("company-form").addEventListener("submit", onSubmit);
  });
})();
