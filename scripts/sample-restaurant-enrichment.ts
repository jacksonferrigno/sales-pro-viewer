import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";

import OpenAI from "openai";

import appConfig from "../src/config/app.config";
import {
  buildRestaurantPrepUserMessage,
  RESTAURANT_PREP_JSON_SCHEMA,
  restaurantPrepSystemPrompt,
  type RestaurantPrepLLMOutput,
} from "../src/server/restaurants-prep/prep-prompt";

const rootDir = process.cwd();
const envFiles = [".env.local", ".env"];

for (const file of envFiles) {
  const envPath = path.join(rootDir, file);
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
}

type RestaurantCsvRow = {
  restaurant_id: string;
  name: string;
  city: string;
  state: string;
  cuisine_type: string;
  business_type: string;
  website_url: string;
  num_locations: string;
  _LOADED_AT: string;
  _LOADED_BY: string;
};

type PlatformHit = {
  present: boolean;
  evidenceUrl: string | null;
};

type SearchHit = {
  link: string;
  title?: string;
  snippet?: string;
};

type SampleResult = {
  restaurantId: string;
  name: string;
  city: string;
  state: string;
  cuisineType: string;
  businessType: string;
  numLocations: number | null;
  websiteUrl: string;
  placeId: string | null;
  placeResourceName: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  reviewSummary: string | null;
  delivery: boolean | null;
  takeout: boolean | null;
  seoScore: number | null;
  prep: RestaurantPrepLLMOutput | null;
  platformPresence: {
    doordash: PlatformHit;
    ubereats: PlatformHit;
    grubhub: PlatformHit;
  };
};

const HOMEPAGE_HTML_CHAR_LIMIT = 45_000;

const DEFAULT_CSV_PATH = path.join(rootDir, "data", "RESTAURANTS.csv");
const DEFAULT_OUT_PATH = path.join(
  rootDir,
  "data",
  "restaurant-sales-prep-sample.ndjson",
);

function readLimit(): number | null {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1) return null;
  const n = Number(process.argv[idx + 1]);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("Invalid --limit: use e.g. --limit 25");
  }
  return Math.floor(n);
}

function readConcurrency(): number {
  const idx = process.argv.indexOf("--concurrency");
  if (idx === -1) return 3;
  const n = Number(process.argv[idx + 1]);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("Invalid --concurrency: use e.g. --concurrency 3");
  }
  return Math.floor(n);
}

function splitCsvRecords(csv: string): string[] {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i];
    const next = csv[i + 1];
    if (ch === '"' && next === '"') {
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "\n" && !inQuotes) {
      records.push(current.replace(/\r$/, ""));
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) records.push(current.replace(/\r$/, ""));
  return records;
}

function parseCsvRecord(record: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < record.length; i += 1) {
    const ch = record[i];
    const next = record[i + 1];
    if (ch === '"' && next === '"') {
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current);
  return values;
}

function parseRestaurantsCsv(csv: string): RestaurantCsvRow[] {
  const [headerLine, ...rows] = splitCsvRecords(csv.trim());
  if (!headerLine) return [];
  const headers = parseCsvRecord(headerLine);
  return rows.map((line) => {
    const values = parseCsvRecord(line);
    return Object.fromEntries(
      headers.map((h, i) => [h, values[i] ?? ""]),
    ) as RestaurantCsvRow;
  });
}

type PlaceSearchResult = {
  id: string;
  name: string;
};

async function searchPlace(
  apiKey: string,
  textQuery: string,
): Promise<PlaceSearchResult | null> {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.name",
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 1,
        languageCode: "en",
      }),
    },
  );
  if (!response.ok) return null;
  const json = (await response.json()) as {
    places?: Array<{ id?: string; name?: string }>;
  };
  const first = json.places?.[0];
  if (!first?.id || !first.name) return null;
  return { id: first.id, name: first.name };
}

type PlaceDetails = {
  placeId: string | null;
  placeResourceName: string | null;
  rating: number | null;
  reviewCount: number | null;
  reviewSummary: string | null;
  delivery: boolean | null;
  takeout: boolean | null;
  websiteUri: string | null;
};

async function getPlaceDetails(
  apiKey: string,
  placeResourceName: string,
): Promise<PlaceDetails> {
  const fieldMask = [
    "id",
    "name",
    "rating",
    "userRatingCount",
    "reviewSummary",
    "delivery",
    "takeout",
    "websiteUri",
  ].join(",");
  const response = await fetch(
    `https://places.googleapis.com/v1/${placeResourceName}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    },
  );
  if (!response.ok) {
    return {
      placeId: null,
      placeResourceName: null,
      rating: null,
      reviewCount: null,
      reviewSummary: null,
      delivery: null,
      takeout: null,
      websiteUri: null,
    };
  }
  const json = (await response.json()) as {
    id?: string;
    name?: string;
    rating?: number;
    userRatingCount?: number;
    reviewSummary?: { text?: { text?: string } };
    delivery?: boolean;
    takeout?: boolean;
    websiteUri?: string;
  };
  return {
    placeId: json.id ?? null,
    placeResourceName: json.name ?? null,
    rating: typeof json.rating === "number" ? json.rating : null,
    reviewCount:
      typeof json.userRatingCount === "number" ? json.userRatingCount : null,
    reviewSummary: json.reviewSummary?.text?.text ?? null,
    delivery: typeof json.delivery === "boolean" ? json.delivery : null,
    takeout: typeof json.takeout === "boolean" ? json.takeout : null,
    websiteUri: json.websiteUri ?? null,
  };
}

async function seoScoreForStrategy(params: {
  url: string;
  googleApiKey: string;
  strategy: "MOBILE" | "DESKTOP";
}): Promise<number | null> {
  const endpoint = new URL(
    "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed",
  );
  endpoint.searchParams.set("url", params.url);
  endpoint.searchParams.set("category", "SEO");
  endpoint.searchParams.set("strategy", params.strategy);
  endpoint.searchParams.set("key", params.googleApiKey);
  const response = await fetch(endpoint);
  if (!response.ok) return null;

  const json = (await response.json()) as {
    lighthouseResult?: {
      categories?: { seo?: { score?: number } };
    };
  };
  const score = json.lighthouseResult?.categories?.seo?.score;
  return typeof score === "number" ? Math.round(score * 100) : null;
}

async function getSeoScore(
  url: string,
  googleApiKey: string,
): Promise<number | null> {
  const [mobile, desktop] = await Promise.all([
    seoScoreForStrategy({ url, googleApiKey, strategy: "MOBILE" }),
    seoScoreForStrategy({ url, googleApiKey, strategy: "DESKTOP" }),
  ]);

  const parts = [mobile, desktop].filter(
    (n): n is number => typeof n === "number",
  );
  if (parts.length === 0) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

async function fetchHomepageHtml(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      headers: BROWSERISH_HEADERS,
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().includes("text/html")) {
      console.log(
        `homepage html skipped (${response.status}, ${contentType || "unknown content-type"}) from ${url}`,
      );
      return null;
    }
    const html = await response.text();
    const sliced = html.slice(0, HOMEPAGE_HTML_CHAR_LIMIT);
    console.log(`fetched ${sliced.length.toLocaleString()} chars from ${url}`);
    return sliced;
  } catch (err) {
    console.log(
      `homepage html fetch failed from ${url}: ${
        err instanceof Error ? err.message : "unknown error"
      }`,
    );
    return null;
  }
}

async function generateRestaurantPrep(
  client: OpenAI,
  model: string,
  record: Omit<SampleResult, "prep">,
  homepageHtml: string | null,
): Promise<RestaurantPrepLLMOutput> {
  const payload = {
    restaurantId: record.restaurantId,
    name: record.name,
    city: record.city,
    state: record.state,
    cuisineType: record.cuisineType,
    businessType: record.businessType,
    numLocations: record.numLocations,
    websiteUrl: record.websiteUrl,
    googleRating: record.googleRating,
    googleReviewCount: record.googleReviewCount,
    reviewSummary: record.reviewSummary,
    delivery: record.delivery,
    takeout: record.takeout,
    seoScore: record.seoScore,
    platformPresence: record.platformPresence,
    homepageHtml,
  };

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: restaurantPrepSystemPrompt },
      {
        role: "user",
        content: buildRestaurantPrepUserMessage(JSON.stringify(payload)),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "restaurant_prep",
        strict: true,
        schema: RESTAURANT_PREP_JSON_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(
      `No completion content for restaurant_id=${record.restaurantId}`,
    );
  }

  return JSON.parse(content) as RestaurantPrepLLMOutput;
}

function decodeDuckDuckGoLinks(html: string): string[] {
  const matches = html.matchAll(/uddg=([^"&]+)/g);
  const urls = new Set<string>();
  for (const m of matches) {
    const raw = m[1];
    if (!raw) continue;
    try {
      const url = decodeURIComponent(raw);
      if (url.startsWith("http")) urls.add(url);
    } catch {
      // ignore bad encoding
    }
  }
  return [...urls];
}

async function searchWithDuckDuckGo(query: string): Promise<SearchHit[]> {
  const endpoint = new URL("https://duckduckgo.com/html/");
  endpoint.searchParams.set("q", query);
  const response = await fetch(endpoint);
  if (!response.ok) return [];
  const html = await response.text();
  return decodeDuckDuckGoLinks(html).map((link) => ({ link }));
}

async function searchWithGoogleCse(params: {
  query: string;
  domain: string;
  googleSearchApiKey: string;
  googleSearchCx: string;
}): Promise<SearchHit[]> {
  const { query, domain, googleSearchApiKey, googleSearchCx } = params;
  const endpoint = new URL("https://www.googleapis.com/customsearch/v1");
  endpoint.searchParams.set("key", googleSearchApiKey);
  endpoint.searchParams.set("cx", googleSearchCx);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("siteSearch", domain);
  endpoint.searchParams.set("siteSearchFilter", "i");
  endpoint.searchParams.set("num", "5");
  const response = await fetch(endpoint);
  if (!response.ok) return [];
  const json = (await response.json()) as {
    items?: Array<{ link?: string; title?: string; snippet?: string }>;
  };
  return (json.items ?? [])
    .filter((item) => typeof item.link === "string" && item.link.length > 0)
    .map((item) => ({
      link: item.link as string,
      title: item.title,
      snippet: item.snippet,
    }));
}

async function detectPlatform(params: {
  name: string;
  city: string;
  state: string;
  domain: string;
  marker: string;
  googleSearchApiKey: string;
  googleSearchCx?: string;
}): Promise<PlatformHit> {
  const {
    name,
    city,
    state,
    domain,
    marker,
    googleSearchApiKey,
    googleSearchCx,
  } = params;
  const query = `"${name}" "${city}" "${state}"`;
  const hits = googleSearchCx
    ? await searchWithGoogleCse({
        query,
        domain,
        googleSearchApiKey,
        googleSearchCx,
      })
    : await searchWithDuckDuckGo(query);

  const candidate = hits.find(
    (hit) => hit.link.includes(domain) && hit.link.includes(marker),
  )?.link;
  if (!candidate) {
    return {
      present: false,
      evidenceUrl: null,
    };
  }

  return {
    present: true,
    evidenceUrl: candidate,
  };
}

function normalizeWebsiteUrl(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function parseNullableInt(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

const BROWSERISH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
} as const;

type EnrichmentContext = {
  googleApiKey: string;
  googleSearchApiKey: string;
  googleSearchCx: string | undefined;
  openaiClient: OpenAI;
  openaiModel: string;
};

async function enrichRestaurant(
  row: RestaurantCsvRow,
  ctx: EnrichmentContext,
): Promise<SampleResult> {
  const {
    googleApiKey,
    googleSearchApiKey,
    googleSearchCx,
    openaiClient,
    openaiModel,
  } = ctx;
  const textQuery = `${row.name} ${row.city} ${row.state}`;
  const search = await searchPlace(googleApiKey, textQuery);
  const details = search
    ? await getPlaceDetails(googleApiKey, search.name)
    : {
        placeId: null,
        placeResourceName: null,
        rating: null,
        reviewCount: null,
        reviewSummary: null,
        delivery: null,
        takeout: null,
        websiteUri: null,
      };

  const website = normalizeWebsiteUrl(details.websiteUri ?? row.website_url);
  const seoScorePromise = website
    ? getSeoScore(website, googleApiKey)
    : Promise.resolve(null);
  const homepageHtmlPromise = website
    ? fetchHomepageHtml(website)
    : Promise.resolve(null);
  const platformPresencePromise = Promise.all([
    detectPlatform({
      name: row.name,
      city: row.city,
      state: row.state,
      domain: "doordash.com",
      marker: "/store/",
      googleSearchApiKey,
      googleSearchCx,
    }),
    detectPlatform({
      name: row.name,
      city: row.city,
      state: row.state,
      domain: "ubereats.com",
      marker: "/store/",
      googleSearchApiKey,
      googleSearchCx,
    }),
    detectPlatform({
      name: row.name,
      city: row.city,
      state: row.state,
      domain: "grubhub.com",
      marker: "/restaurant/",
      googleSearchApiKey,
      googleSearchCx,
    }),
  ]);

  const [seoScore, homepageHtml, [doordash, ubereats, grubhub]] =
    await Promise.all([
      seoScorePromise,
      homepageHtmlPromise,
      platformPresencePromise,
    ]);

  const baseResult: Omit<SampleResult, "prep"> = {
    restaurantId: row.restaurant_id,
    name: row.name,
    city: row.city,
    state: row.state,
    cuisineType: row.cuisine_type,
    businessType: row.business_type,
    numLocations: parseNullableInt(row.num_locations),
    websiteUrl: website,
    placeId: details.placeId,
    placeResourceName: details.placeResourceName,
    googleRating: details.rating,
    googleReviewCount: details.reviewCount,
    reviewSummary: details.reviewSummary,
    delivery: details.delivery,
    takeout: details.takeout,
    seoScore,
    platformPresence: {
      doordash,
      ubereats,
      grubhub,
    },
  };

  const prep = await generateRestaurantPrep(
    openaiClient,
    openaiModel,
    baseResult,
    homepageHtml,
  );

  return {
    ...baseResult,
    prep,
  };
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index] as T, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => run(),
  );
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  const limit = readLimit();
  const concurrency = readConcurrency();
  const csvPath = process.env.RESTAURANTS_CSV_PATH?.trim() || DEFAULT_CSV_PATH;
  const outPath =
    process.env.RESTAURANT_SALES_PREP_OUT?.trim() || DEFAULT_OUT_PATH;
  const cfg = appConfig();
  const openaiApiKey = cfg.openai.apiKey.trim();
  if (!openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  const openaiClient = new OpenAI({ apiKey: openaiApiKey });
  const openaiModel = cfg.openai.model;

  const googleApiKey = process.env.GOOGLE_API_KEY?.trim() || "";
  if (!googleApiKey) {
    throw new Error("GOOGLE_API_KEY is required");
  }
  const googleSearchApiKey =
    process.env.GOOGLE_SEARCH_API_KEY?.trim() || googleApiKey;
  const googleSearchCx = process.env.GOOGLE_SEARCH_CX?.trim();

  const csvText = await fs.readFile(csvPath, "utf8");
  const allRows = parseRestaurantsCsv(csvText);
  const rows = limit === null ? allRows : allRows.slice(0, limit);

  const ctx = {
    googleApiKey,
    googleSearchApiKey,
    googleSearchCx,
    openaiClient,
    openaiModel,
  };
  const results = await mapConcurrent(rows, concurrency, async (row, index) => {
    console.log(`[${index + 1}/${rows.length}] enriching ${row.name}`);
    return enrichRestaurant(row, ctx);
  });

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const ndjson = results.map((r) => JSON.stringify(r)).join("\n") + "\n";
  await fs.writeFile(outPath, ndjson, "utf8");

  console.log(
    `Wrote ${results.length} restaurant row(s) (NDJSON, concurrency ${concurrency}) to ${path.relative(rootDir, outPath)}`,
  );
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
