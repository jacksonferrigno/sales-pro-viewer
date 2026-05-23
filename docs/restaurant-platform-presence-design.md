# Restaurant Sales Prep Enrichment Design

## Overview

Given `data/RESTAURANTS.csv`, enrich each restaurant with lightweight prep signals for reps:

- Google stars and review count
- Review snippets / review summary
- Website quality basics (SEO/performance via PageSpeed averaged across mobile/desktop)
- Platform presence add-on (DoorDash / Uber Eats / Grubhub signals via search-derived URLs stored with each row)
- **Final LLM step:** structured sales prep checklist (case read, questions to ask, what to listen for, best next move) grounded in enrichment plus homepage fetch.

Keep this as a simple batch script with cached output. No live crawling or OpenAI calls in the UI request path.

---

## Goal

Give reps a quick pre-call brief with enough context to tailor outreach.

---

## Scope

### In scope

- Google Places data for rating and review volume
- Basic review signal from Places reviews/review summary
- PageSpeed API score for website basics
- Platform presence booleans or URL evidence via search-based detection
- Bounded homepage HTML fetch (when the site responds) fed into prompts for website-grounded prep alongside structured fields above
- **OpenAI call per enriched row** writing `prep` (JSON checklist) next to deterministic signals below

### Out of scope

- Full review history ingestion
- Browser automation or authenticated scraping

---

## Data sources

1. Google Places (Place Details)
2. Google PageSpeed Insights API
3. Search API provider for `site:` checks on platform domains
4. OpenAI Structured Outputs over combined bundle (facts plus optional truncated homepage HTML)

---

## Detection logic

### A) Google reputation

- Fetch `rating` and `userRatingCount` from Places.
- Store as stars + total review count.

### B) Review signal

- Pull available review fields from Places (`reviews` and/or `reviewSummary` when present).
- Save a short summary snippet for rep context.

### C) Website basics

- Run PageSpeed for the restaurant website URL.
- Save one simple score (`seoScore`), optionally `performanceScore`.

### D) Platform presence add-on (simple yes/no)

For each provider:

- `site:doordash.com "<name>" "<city>"`
- `site:ubereats.com "<name>" "<city>"`
- `site:grubhub.com "<name>" "<city>"`

Mark `true` only if at least one result has a merchant-like URL:

- DoorDash: `/store/`
- Uber Eats: `/store/`
- Grubhub: `/restaurant/`

Else `false`.

Further note: storefront URL quality (stale storefronts, churn off a platform) is a known follow-on; shipped script favors search evidence without extra storefront page fetches to avoid brittle heuristics.

---

## LLM prep

After deterministic enrichment is computed for one restaurant row:

1. Build a structured prompt bundle: flattened facts (Places, SEO score, cuisine/type/locations where known, marketplace presence + evidence URLs), and fetch the restaurants homepage (optional).
2. Single OpenAI structured output (`RestaurantPrepGuidance`): `whatThisLikelyMeans`, `questionsToAsk`, `whatToListenFor`, `bestNextMove`. Version string lives with prompts in repo for regressions later.
3. Persist `prep` on the same record written to `**data/restaurant-sales-prep-sample.ndjson`** by the enrichment script alongside Google and platform fields.

Dashboard reads cached rows only unless you rerun the batch.

---

## Output shape

```ts
type PlatformPresence = {
  present: boolean;
  evidenceUrl: string | null;
};

type RestaurantPrepGuidance = {
  whatThisLikelyMeans: string;
  questionsToAsk: string[];
  whatToListenFor: string[];
  bestNextMove: string;
};

type RestaurantPrepRecord = {
  restaurantId: string;
  name: string;
  city: string;
  state: string;
  websiteUrl: string;
  cuisineType?: string;
  businessType?: string;
  numLocations?: number | null;

  googleRating: number | null;
  googleReviewCount: number | null;
  reviewSummary: string | null;
  seoScore: number | null;
  delivery?: boolean | null;
  takeout?: boolean | null;

  platformPresence: {
    doordash: PlatformPresence;
    ubereats: PlatformPresence;
    grubhub: PlatformPresence;
  };

  /** LLM-authored checklist persisted from final step above */
  prep?: RestaurantPrepGuidance | null;
};
```

---

## Data flow

```txt
input: CSV or database
       ↓
enrichment batch (Places + PageSpeed (+ mobile/desktop averaging) + search platform URLs + bounded homepage HTML when available)
       ↓
LLM structured prep (ServeLine checklist) per restaurant row that completed enrichment
       ↓
output: restaurant-sales-prep NDJSON
```

---

