# Transcript Intelligence Design

## Overview

Run batch analysis once per transcript, then optionally a rollup pass. Persist outputs as NDJSON plus aggregate JSON (`call-analyses.ndjson`, `sales-motion-summary.json`). The dashboard and case view read cached output only with no routine page-load LLM calls.

---

## Problem

Managers have no systematic way to understand what is working and what is not across hundreds of sales calls. Listening to individual calls is expensive and non-scalable. There are no trends, no patterns, no coaching signals at scale.

---

## Goals

- Generate a structured analysis for every call: what went well, what did not, why it succeeded or failed.
- Roll the full batch of analyses into one org-facing executive storyline for the dashboard exec strip.
- Surface trends across calls so managers can spot patterns by rep, cuisine type, outcome, etc.
- Enable a per-call drill-down with grounded evidence linked back to transcript lines.

---

## What we're shipping :

Three surfaces in the app: **Dashboard view**, **Case view**, and **Chat**.

### Dashboard view

- Executive summary rollup (org-level narrative plus friction clusters and coaching actions, wired to cited example calls where applicable)
- Positive / negative trend cards (tag frequency)
- Call log table: outcome, rep, cuisine, restaurant type, duration (filterable)
- Click row → case view

### Case view

- AI overview: summary, strengths, risks, takeaway, and related prose (visual layout grouped in the UI)
- Evidence links in overview highlight transcript lines on hover/click

### Chat

- Accessory chat below the overview on the case view, context limited to this call only

---

## Scope

**In scope:**

- Batch script that reads transcripts and writes call analyses to NDJSON
- Per-call analysis: summary, strengths, risks, buyer signals, coaching line, takeaway, tags
- Line-numbered transcript transformation (input to model)
- 13 controlled trend tags, each bucketed as good or bad per call
- Dashboard aggregation over tag counts and call metadata plus one org-level rollup JSON for the exec summary strip
- Case view with analysis + accessory chat
- Chat is context-limited to a single call only

**Out of scope:**

- Real-time analysis on ingest
- Free-form tag generation
- Cross-call chat or aggregate AI queries
- Restaurant enrichment (separate doc)

---

## Data flow

```
data/transcripts.csv
       ↓
parse + line-number transcript
       ↓
LLM per transcript (single call at a time)
       ↓
data/call-analyses.ndjson
       │
       ├──► Next.js: call log + case view + tag aggregations (+ chat per call)

data/call-analyses.ndjson  (+ transcript metadata joins as needed)
       ↓
LLM rollup (one batched pass across the corpus, not raw full transcripts dumped in one prompt)
       ↓
data/sales-motion-summary.json
       ↓
Next.js dashboard: executive summary (headline, themes, friction patterns, cited supporting calls)

```

Later: replace files with persisted tables (`TRANSCRIPT_ANALYSES`, rollup artifact), keyed on `call_id`.

Key relationship note: for transcript intelligence, the foreign key is `call_id` (not `restaurant_id`).

---

## Call analysis shape

**Input to model:**

```ts
{
  callId: string;
  metadata: {
    outcome: string;
    repId: string;
    repTenure: string;
    cuisineType: string;
    restaurantType: string;
    numLocations: number;
    callDurationMin: number;
  };
  lineNumberedTranscript: string; // "1: rep_03: Hi...\n2: prospect: ..."
}
```

**Model output:**

```ts
{
  summary: string;
  strengths: string[];
  risks: string[];
  buyerSignals: string[];
  coachingOpportunity: string;
  takeaway: string;
  tags: {
    good: TrendTag[];
    bad: TrendTag[];
  };
}
```

Evidence is embedded inline using markdown link format on all analytical fields except `takeaway`:

[The rep clarified that ServeLine is not a third-party marketplace] (line:18).

---

## Org-level rollup (executive summary)

Six steps in plain terms:

1. Every transcript runs through its own structured per-call LLM analysis first (`data/call-analyses.ndjson`). That freezes comparable fields and tags across the batch.
2. A second pipeline step loads the corpus of analyses (not the full verbatim transcripts for every row in one oversized prompt chunk).
3. One meta LLM call produces organization-level narratives: headline, prose, clustered friction themes, prioritized coaching bullets.
4. The dashboard surfaces that block as **Executive summary** above the granular tables so leadership sees the pulse without opening every transcript.
5. Friction clusters and coaching actions carry **supporting call ids** where possible so reviewers can drop from rollup to cited calls without losing lineage.
6. Case view still cites transcript lines inside each analysis, so the story runs **rollup → cited calls → grounded lines** across all three tiers.

Production shape today: rollup lives in `data/sales-motion-summary.json`.

---

## Static versus dynamic rubric

**Static (per-call, comparable across batches):** The schema and taxonomy are invariant every time. Same thirteen trend tags bucketed good or bad, same headings (summary, strengths, risks, buyer signals, coaching, takeaway), same evidence rule set for citations. That grid is how you freeze thousands of transcripts into apples-to-apples rows before any org storyline.

**Dynamic (batch / org rollup at scale):** The executive summary and meta-analysis layer is deliberately not a second fixed checklist. Prompt still returns structured sections, but the themes, friction patterns, emphasis, coaching priorities, and which calls get cited emerge from whatever this corpus actually looks like batch to batch (local maxima, leakage, DM access, qualification timing). Same pipeline step, shifting substance as the organization's call mix changes week over week.

---

## Trend tags

Fixed vocabulary. Model picks only relevant tags per call (typically three to eight) and assigns each to good or bad for that transcript.

```ts
type TrendTag =
  | "opening"
  | "discovery"
  | "value_prop"
  | "third_party_delivery"
  | "direct_ordering"
  | "pricing_or_fees"
  | "objection_handling"
  | "competitive_positioning"
  | "talk_listen_balance"
  | "decision_maker"
  | "buyer_interest"
  | "next_steps"
  | "call_control";
```

