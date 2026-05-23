export type SalesMotionSignal = {
  direction: "helps" | "hurts";
  title: string;
  insight: string;
  exampleCallIds: string[];
};

export type SalesMotionSummary = {
  headline: string;
  tldr: string;
  signals: SalesMotionSignal[];
};

const stringArray = { type: "array", items: { type: "string" } } as const;

const signalSchema = {
  type: "object",
  properties: {
    direction: { type: "string", enum: ["helps", "hurts"] },
    title: { type: "string" },
    insight: { type: "string" },
    exampleCallIds: stringArray,
  },
  required: ["direction", "title", "insight", "exampleCallIds"],
  additionalProperties: false,
} as const;

export const SALES_MOTION_SUMMARY_JSON_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    tldr: { type: "string" },
    signals: { type: "array", items: signalSchema },
  },
  required: ["headline", "tldr", "signals"],
  additionalProperties: false,
} as const;
