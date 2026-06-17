/* AI事業計画書アシスタント フロントエンド */
(function () {
  "use strict";

  const API_BASE = ""; // 同一オリジン（serverが配信）
  let lastPlanText = "";

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ごく簡単なMarkdown→HTML（見出し・箇条書き・段落のみ）
  function renderMarkdown(md) {
    const lines = md.split("\n");
    let html = "";
    let inList = false;
    for (let raw of lines) {
      const line = raw.replace(/\r$/, "");
      if (/^#{1,6}\s/.test(line)) {
        if (inList) { html += "</ul>"; inList = false; }
        const level = line.match(/^#+/)[0].length;
        const text = line.replace(/^#+\s/, "");
        html += `<h${Math.min(level + 1, 6)}>${escapeHtml(text)}</h${Math.min(level + 1, 6)}>`;
      } else if (/^\s*[-・*]\s/.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += `<li>${escapeHtml(line.replace(/^\s*[-・*]\s/, ""))}</li>`;
      } else if (line.trim() === "") {
        if (inList) { html += "</ul>"; inList = false; }
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<p>${escapeHtml(line)}</p>`;
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  async function buildInterview() {
    const form = document.getElementById("interview-form");
    let questions;
    try {
      const r = await fetch(API_BASE + "/api/questions");
      if (!r.ok) throw new Error("offline");
      questions = (await r.json()).questions;
    } catch (e) {
      document.getElementById("offline-note").hidden = false;
      // フォールバックの設問（オフラインでも見た目だけ出す）
      questions = [
        { id: "business", label: "事業の概要（何をしている会社か）" },
        { id: "challenge", label: "今回チャレンジしたい販路開拓・新商品/サービス" },
        { id: "issue", label: "現状の課題・困りごと" },
        { id: "target", label: "ねらう顧客・市場（誰に売るか）" },
        { id: "strength", label: "自社の強み" },
        { id: "budget", label: "想定する経費と概算金額" },
        { id: "effect", label: "期待する効果（売上・客数など）" },
      ];
    }
    questions.forEach((q) => {
      const field = el("div", "field");
      const label = el("label", null, q.label);
      label.setAttribute("for", "q-" + q.id);
      const ta = document.createElement("textarea");
      ta.id = "q-" + q.id;
      ta.rows = 2;
      ta.dataset.qid = q.id;
      field.appendChild(label);
      field.appendChild(ta);
      form.appendChild(field);
    });
  }

  function collectAnswers() {
    const answers = {};
    document.querySelectorAll("#interview-form textarea").forEach((ta) => {
      answers[ta.dataset.qid] = ta.value;
    });
    return answers;
  }

  async function generatePlan() {
    const genErr = document.getElementById("gen-error");
    genErr.hidden = true;
    const btn = document.getElementById("generate-btn");
    btn.disabled = true;
    btn.textContent = "AIが作成中…";

    document.getElementById("plan-section").hidden = false;
    const out = document.getElementById("plan-output");
    out.textContent = "";
    document.getElementById("critique-section").hidden = true;
    const status = document.getElementById("gen-status");
    status.textContent = "生成中…";
    lastPlanText = "";

    try {
      const resp = await fetch(API_BASE + "/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: collectAnswers() }),
      });
      if (!resp.ok || !resp.body) throw new Error("サーバーに接続できません（HTTP " + resp.status + "）");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop();
        for (const chunk of chunks) {
          const isError = chunk.startsWith("event: error");
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6));
          if (isError) throw new Error(payload.message || "生成に失敗しました");
          if (payload.text) {
            lastPlanText += payload.text;
            out.innerHTML = renderMarkdown(lastPlanText);
            out.scrollTop = out.scrollHeight;
          }
        }
      }
      status.textContent = "完成";
      document.getElementById("critique-btn").disabled = false;
    } catch (e) {
      genErr.textContent = e.message;
      genErr.hidden = false;
      status.textContent = "";
    } finally {
      btn.disabled = false;
      btn.textContent = "AIで事業計画書ドラフトを作成";
    }
  }

  async function critiquePlan() {
    const err = document.getElementById("crit-error");
    err.hidden = true;
    const btn = document.getElementById("critique-btn");
    btn.disabled = true;
    btn.textContent = "診断中…";
    document.getElementById("critique-section").hidden = false;
    const out = document.getElementById("critique-output");
    out.innerHTML = "<p class='lead'>AIが審査基準で採点しています…</p>";

    try {
      const resp = await fetch(API_BASE + "/api/critique-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: lastPlanText }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "診断に失敗しました");
      renderCritique(data);
    } catch (e) {
      out.innerHTML = "";
      err.textContent = e.message;
      err.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "この計画書の採択率を診断する";
    }
  }

  function bandClass(band) {
    if (band.includes("高")) return "high";
    if (band.includes("中")) return "mid";
    return "low";
  }

  function renderCritique(d) {
    const out = document.getElementById("critique-output");
    out.innerHTML = "";

    const head = el("div", "ai-intro");
    head.innerHTML =
      `<span class="prio-badge ${bandClass(d.overall_band)}">${escapeHtml(d.overall_band)}</span>` +
      ` <strong>${d.overall_score}点</strong>（100点満点の目安）<br>` +
      `<span class="ai-note">${escapeHtml(d.overall_comment || "")}</span>`;
    out.appendChild(head);

    (d.criteria || []).forEach((c) => {
      const card = el("article", "card cand");
      const body = el("div", "card-body");
      const stars = "★".repeat(c.score) + "☆".repeat(Math.max(0, 5 - c.score));
      const h = el("div", "list-title");
      h.innerHTML = `${escapeHtml(c.name)} <span style="color:#f59e0b;">${stars}</span> <span style="color:var(--muted);font-size:13px;">(${c.score}/5)</span>`;
      body.appendChild(h);
      body.appendChild(el("p", "summary", c.assessment));
      if (c.improvements && c.improvements.length) {
        body.appendChild(el("div", "list-title warn", "改善提案"));
        const ul = el("ul", "cautions");
        c.improvements.forEach((t) => ul.appendChild(el("li", null, t)));
        body.appendChild(ul);
      }
      card.appendChild(body);
      out.appendChild(card);
    });

    if (d.priority_fixes && d.priority_fixes.length) {
      const box = el("div", "ai-intro");
      box.innerHTML = `<span class="ai-badge">最優先</span>採択率を上げるために、まずここを直しましょう：`;
      const ul = el("ul", "reasons");
      d.priority_fixes.forEach((t) => ul.appendChild(el("li", null, t)));
      box.appendChild(ul);
      out.appendChild(box);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    buildInterview();
    document.getElementById("generate-btn").addEventListener("click", generatePlan);
    document.getElementById("critique-btn").addEventListener("click", critiquePlan);
  });
})();
