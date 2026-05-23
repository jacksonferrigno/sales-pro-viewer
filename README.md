# ServeLine: sales intelligence demo

Hackathon demo for outbound sales intelligence and restaurant prep. It ships with a small synthetic dataset so the app can run without external services.

*The full pipeline was run on a larger hackathon call set; this repo only includes a 10-call sample for the public demo.*

## What it does

The pipeline is simple:

1. Read sales transcripts from `data/transcripts.csv`
2. Find useful phrases with a TF-IDF + logistic regression pass
3. Turn the strongest signals into an LLM-generated executive summary
4. Show the summary, transcript analyses, and restaurant prep views in the dashboard

The restaurant prep side follows the same idea: read restaurant records, score the signal, and produce a short prep note for the rep.

## Quick run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run analyze         # analyze transcripts with OpenAI
npm run summarize:sales # build the executive summary
npm run enrich:sample   # enrich restaurant prep data
npm run phrase:profile  # generate phrase signals from transcripts
npm run build           # production build check
npm run lint            # eslint
npm test                # unit tests
```

