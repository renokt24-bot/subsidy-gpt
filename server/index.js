/*
 * AI事業計画書アシスタント — バックエンド
 *
 *  - POST /api/generate-plan : ヒアリング回答 → 事業計画書ドラフトを生成（SSEストリーミング）
 *  - POST /api/critique-plan : 事業計画書 → 審査基準に照らした採点・改善提案（構造化出力）
 *
 * Claude Opus 4.8 を利用。ANTHROPIC_API_KEY が必要です。
 */
const path = require("path");
const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const { OVERVIEW, RUBRIC } = require("./subsidy-spec");

const MODEL = "claude-opus-4-8";
const client = new Anthropic(); // ANTHROPIC_API_KEY を環境変数から読み込み

const app = express();
app.use(express.json({ limit: "1mb" }));
// リポジトリ直下の静的サイトも同じサーバーから配信
app.use(express.static(path.join(__dirname, "..")));

// ---- ヒアリング項目 ----
const QUESTIONS = [
  { id: "business", label: "事業の概要（何をしている会社か）" },
  { id: "challenge", label: "今回チャレンジしたい販路開拓・新商品/サービス" },
  { id: "issue", label: "現状の課題・困りごと" },
  { id: "target", label: "ねらう顧客・市場（誰に売るか）" },
  { id: "strength", label: "自社の強み" },
  { id: "budget", label: "想定する経費と概算金額（例: ホームページ制作 80万円）" },
  { id: "effect", label: "期待する効果（売上・客数など、できれば数値）" },
];

function planSystemPrompt() {
  return `あなたは小規模事業者持続化補助金の申請支援に精通した中小企業診断士です。
事業者へのヒアリング内容をもとに、採択されやすい「事業計画書ドラフト」を日本語のMarkdownで作成します。

# 制度知識（根拠）
${OVERVIEW}

# 審査の観点（必ずこれらを満たすように書く）
${RUBRIC.map((r, i) => `${i + 1}. ${r.name}：${r.detail}`).join("\n")}

# 出力ルール
- 以下の見出し構成で、様式2(経営計画書)・様式3(補助事業計画書)に沿って書く：
  ## 1. 企業概要
  ## 2. 顧客ニーズと市場の動向
  ## 3. 自社の強み
  ## 4. 経営方針・目標と今後のプラン
  ## 5. 補助事業の内容（販路開拓等の取組）
  ## 6. 補助事業の効果
  ## 7. 経費明細（概算）
- 各セクションの冒頭に、対応する審査観点を 〔審査観点: ○○〕 の形で1行明記する（根拠の明示）。
- 効果は可能な限り数値目標（売上◯%増、新規客◯人/月 等）に落とし込む。ヒアリングに数値が無い場合は妥当な仮置きを置き「※要検証」と注記する。
- 創意工夫・独自性とターゲットの明確化を必ず盛り込む。
- 事業者が入力した事実を尊重し、事実でない固有名詞や実績を捏造しない。不足情報は仮説として明示する。
- 冒頭の前置きや「以下に作成します」等の説明は不要。いきなり計画書本文から始める。`;
}

function planUserMessage(answers) {
  const lines = QUESTIONS.map(
    (q) => `■ ${q.label}\n${(answers[q.id] || "（未記入）").trim()}`
  ).join("\n\n");
  return `次のヒアリング内容をもとに事業計画書ドラフトを作成してください。\n\n${lines}`;
}

// ---- 事業計画書ドラフト生成（ストリーミング） ----
app.post("/api/generate-plan", async (req, res) => {
  const answers = (req.body && req.body.answers) || {};
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      system: planSystemPrompt(),
      messages: [{ role: "user", content: planUserMessage(answers) }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    res.end();
  }
});

// ---- 採択率クリティーク（構造化出力） ----
const CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall_band: {
      type: "string",
      enum: ["採択可能性 高", "採択可能性 中", "要改善"],
      description: "現時点の計画書全体の採択可能性の目安",
    },
    overall_score: {
      type: "integer",
      description: "100点満点の総合点（審査観点の合計の目安）",
    },
    overall_comment: { type: "string", description: "総評（2〜3文）" },
    criteria: {
      type: "array",
      description: "審査観点ごとの評価",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "審査観点名" },
          score: { type: "integer", description: "1〜5点での評価" },
          assessment: { type: "string", description: "評価コメント" },
          improvements: {
            type: "array",
            items: { type: "string" },
            description: "この観点を強化する具体的な改善提案",
          },
        },
        required: ["name", "score", "assessment", "improvements"],
      },
    },
    priority_fixes: {
      type: "array",
      items: { type: "string" },
      description: "採択率を上げるために最優先で直すべき点（3つ程度）",
    },
  },
  required: ["overall_band", "overall_score", "overall_comment", "criteria", "priority_fixes"],
};

function critiqueSystemPrompt() {
  return `あなたは小規模事業者持続化補助金の審査員の視点を持つ中小企業診断士です。
提出された事業計画書ドラフトを、以下の審査観点に厳しく照らして採点し、改善提案を行います。

# 審査の観点（各1〜5点で採点）
${RUBRIC.map((r, i) => `${i + 1}. ${r.name}：${r.detail}`).join("\n")}

# 採点方針
- 甘い点をつけない。不足・曖昧・数値欠如は減点し、必ず具体的な改善提案に変換する。
- improvements と priority_fixes は「何をどう書き足すか」が分かる具体的な指示にする。
- overall_score は審査観点の充足度を総合した100点満点の目安。`;
}

app.post("/api/critique-plan", async (req, res) => {
  const plan = (req.body && req.body.plan) || "";
  if (!plan.trim()) return res.status(400).json({ error: "plan が空です" });
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: critiqueSystemPrompt(),
      messages: [
        { role: "user", content: `次の事業計画書ドラフトを審査基準で採点してください。\n\n${plan}` },
      ],
      output_config: { format: { type: "json_schema", schema: CRITIQUE_SCHEMA } },
    });
    const textBlock = msg.content.find((b) => b.type === "text");
    res.json(JSON.parse(textBlock.text));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/questions", (_req, res) => res.json({ questions: QUESTIONS }));

const PORT = process.env.PORT || 5179;
app.listen(PORT, () => {
  console.log(`AI事業計画書アシスタント: http://localhost:${PORT}/plan.html`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠ ANTHROPIC_API_KEY が未設定です。AI機能を使うには設定してください。");
  }
});
