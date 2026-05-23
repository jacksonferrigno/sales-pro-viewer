export const TREND_TAGS = [
  "opening",
  "discovery",
  "value_prop",
  "third_party_delivery",
  "direct_ordering",
  "pricing_or_fees",
  "objection_handling",
  "competitive_positioning",
  "talk_listen_balance",
  "decision_maker",
  "buyer_interest",
  "next_steps",
  "call_control",
] as const;

export type TrendTag = (typeof TREND_TAGS)[number];
