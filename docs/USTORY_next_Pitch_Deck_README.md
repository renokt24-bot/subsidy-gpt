# USTORY next — Seed Pitch Deck

Investor pitch deck for **USTORY next** — a career-infrastructure platform connecting
vocational colleges (専門学校), students, and companies.

- **File:** `docs/USTORY_next_Pitch_Deck.pptx`
- **Format:** PowerPoint (.pptx), 16:9 / 1920×1080, fully editable, Google Slides compatible
- **Slides:** 18 (Cover → Vision), each with figure-first layout, Lucide icons, and speaker notes (発表者ノート)
- **Design system:** White `#FFFFFF` · Ink `#111111` · Accent `#2563EB` · Gray `#6B7280` · Inter (latin) + Noto Sans JP (日本語)
- **Source generator:** `scripts/build_pitch_deck.py` — re-run to regenerate the deck

```bash
pip install python-pptx cairosvg
python3 scripts/build_pitch_deck.py
```

Icons are real [Lucide](https://lucide.dev) glyphs (ISC) rendered to PNG in the brand colors.
Product UI areas are intentional placeholders. To swap in real screenshots, replace the
"UI placeholder" rectangles on slide 8.

---

## Market data — sources cited on the deck

All figures are from primary / authoritative sources (latest available as of 2025–2026).

| Metric | Figure | Year | Source |
|---|---|---|---|
| 専門学校数 (専修学校専門課程) | **2,676 校** | FY2024 (令和6年度) | 文部科学省 学校基本調査（確定値） |
| 専門学校生 (在学者数) | **558,255 名** | FY2024 | 文部科学省 学校基本調査 |
| 新卒採用単価 | **¥56.8万 / 人** (前年45.0万) | 2024卒 | マイナビ 2024年卒 企業新卒内定状況調査 |
| 新卒採用支援サービス市場 | **¥1,466億** | FY2024 | 矢野経済研究所 |
| HR Tech クラウド市場 | **¥1,385億 → 3,200億** (CAGR +31.8%) | 2024→2027年度 | ミック経済研究所 |
| 人材ビジネス市場 (全体) | **¥10.2兆** | FY2024 | 矢野経済研究所 |
| e ラーニング市場 (参考) | **¥3,812億** | FY2024 | 矢野経済研究所 |

### TAM / SAM / SOM
- **TAM ¥10.2兆** — 日本の人材ビジネス市場全体（人材派遣・紹介・再就職支援）
- **SAM ¥2,851億** — 新卒採用支援 ¥1,466億 ＋ HR Tech クラウド ¥1,385億（年20〜30%成長）
- **SOM ¥140億** — 専門卒採用に動く約 ¥1,400億 の 10% を5年で獲得する初期市場

> Note: 日本における「AI採用市場」単独のyen建て市場規模は、主要調査会社では公表されていません
> （AI採用はHR Techクラウドの採用管理セグメント内に内包）。本デックではこれを明示せず、
> HR Techクラウド市場に含めて扱っています。

---

## Financial model assumptions (3-year)

| | Y1 | Y2 | Y3 |
|---|---|---|---|
| ARR | ¥0.65億 | ¥2.6億 | ¥7.2億 |
| 有料企業 | 180 | 600 | 1,500 |
| 専門学校 | 50 | 150 | 350 |

- **ARPA** ¥30,000/月（段階課金で拡張）· **粗利** 80%超 · **月次解約率** 〜3% 前提
- **CAC** ¥120,000（学校チャネルで抑制）· **LTV** ¥792,000 · **LTV/CAC** 6.6x · **Payback** 5ヶ月
- **調達** ¥70,000,000（Equity ¥40M ＋ Debt ¥30M）· **月次バーン** 約 ¥3.9M · **Runway** 18ヶ月

These are plan-based projections, not historical actuals.

---

## Competitive landscape (slide 6 / 9)
- 求人媒体: マイナビ / リクナビ — 求人媒体: マイナビ / リクナビ — 大学中心の母集団形成
- スカウト媒体: OfferBox / dodaキャンパス / Wantedly — プロフィール起点の逆求人
- 学校管理SaaS: Campus Plan / Sakura / infoClipper — 校務効率化のみ（採用と非接続）
- ポートフォリオ: foriio / Behance — 作品提示のみ
- 才能シグナル: LinkedIn / GitHub
- 海外事例: **Handshake**（米・学校×学生×企業, 評価額 $3.5B）/ **Portfolium**（$43M で Instructure に買収）

USTORY next の独自性は、専門学校市場で三者を同時につなぐ唯一の主体である点と、
高校市場で実証済みの「学校営業モデル」という流通網にあります。
