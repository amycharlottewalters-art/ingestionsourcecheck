# Devotional Ingestion Tool

A React web app for ingesting theological source material into the database that powers a personalised AI Christian devotional app. Built for solo use — no backend server, no auth layer.

## What it does

The tool takes scholarly theological texts (PDFs, transcripts, lecture notes, personal notes, Claude Deep Research outputs) and extracts structured source entries attributed to specific scholars and topics. Those entries become the closed-context knowledge base from which daily devotionals are generated.

The ingestion workflow runs in six stages:

1. **Session setup** — describe the source material and select its type
2. **Source material** — paste text or upload a PDF
3. **Preview** — Claude reads the source and proposes which scholars and topics it covers, streaming results in real time
4. **Review decisions** — confirm or adjust the proposed scholar/topic assignments
5. **Commit** — Claude generates structured source entries for each scholar/topic pair
6. **Approve & write** — review each entry, compare against existing rows, merge or approve

Between sessions the tool provides a **Scholar Manager** (enrich, sense-check, and maintain the allowed scholars list), a **Topic Manager** (manage the 190-topic taxonomy), and a **Source Check** tab (duplicate scan and quality review of all ingested rows).

## Architecture

Built with React + Vite, deployed to Netlify. No server — all API calls run directly from the browser.

```
src/
├── App.jsx                          # Thin orchestration layer
├── constants.js                     # Domains, colours, source types, name heuristics
├── styles.js                        # CSS injection
├── main.jsx                         # React entry point
├── lib/
│   ├── claude.js                    # Anthropic API client (streaming + full)
│   ├── supabase.js                  # Supabase REST client
│   ├── prompts.js                   # All Claude prompt builders
│   └── utils.js                     # Shared utilities
├── hooks/
│   ├── useIngestion.js              # Six-stage ingestion workflow state
│   ├── useScholars.js               # Scholar manager state and functions
│   ├── useTopics.js                 # Topic manager state and functions
│   └── useSources.js                # Source check tab state and functions
└── components/
    ├── ScholarList.jsx              # Reusable scholar list with inline edit
    ├── TopicList.jsx                # Reusable topic list with inline edit
    ├── ManualScholarForm.jsx        # Add scholar form
    ├── tabs/
    │   ├── LibraryTab.jsx           # Dashboard and pending sessions
    │   ├── ScholarsTab.jsx          # Scholar manager tab
    │   ├── ScholarDetailPanel.jsx   # Scholar detail slide-up panel
    │   ├── TopicsTab.jsx            # Topic manager tab
    │   └── SourcesTab.jsx           # Duplicate scan and quality check tab
    └── stages/
        ├── StagesSetupPreview.jsx   # Stages 0, 1, 2 JSX
        └── StagesReviewApprove.jsx  # Stages 3, 4, 5 JSX
```

## Data layer

**Supabase** (PostgreSQL, EU region) stores:
- `allowed_scholars` — the closed list of approved scholars with tier, strand, credentials, key works
- `topics` — the 190-topic theological taxonomy with domain and adjacency relationships
- `sources` — ingested source rows (one row per scholar per topic)
- `ingestion_sessions` — session state for resuming interrupted ingestions
- `topic_coverage` — a view showing coverage health per topic

All source entries carry `citation_confidence` (high/medium/low), `health_check_status`, `devotional_angles`, `theological_themes`, and `scripture_references` to support devotional generation.

## Design principles

**Closed-context generation.** Devotionals are generated only from content in the sources table — Claude does not draw on general training knowledge for devotional claims. Richness comes from the quality and breadth of ingested source rows.

**Scholar attribution.** Every claim traces back to exactly one scholar from the approved list. Deep Research sources are capped at `low` confidence and framed with explicit hedging in generated devotionals.

**One topic per source row.** Each row serves a single primary topic. A scholar's work covering multiple topics produces multiple rows, each focused on its topic.

## Setup

### Prerequisites

- Node.js 18+
- A Supabase project with the schema described above
- An Anthropic API key with access to Claude Sonnet

### Install and run locally

```bash
npm install
npm run dev
```

Open the app and enter your Anthropic API key, Supabase project URL, and Supabase anon key in the configuration panel. Credentials are stored in `localStorage` — they never leave your browser.

### Deploy to Netlify

The repo includes a `netlify.toml` configured for Vite builds. Connect the repository to Netlify and it will build and deploy automatically on push.

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

## Source types

| Type | Confidence cap | Notes |
|------|---------------|-------|
| Primary text | High | Direct scholarly works |
| PDF / Lecture notes | High | If author and title certain |
| Personal notes | Medium | Attribution uncertain |
| Transcript | Medium | Speaker attribution flagged |
| Secondary source | Medium | Claims are mediated |
| Claude Deep Research | Low | Chain of custody unverifiable; hedged framing enforced |

## Licence

MIT — see [LICENSE](LICENSE).
