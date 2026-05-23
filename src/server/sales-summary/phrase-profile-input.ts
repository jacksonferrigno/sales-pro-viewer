export type PhraseLiftCluster = {
  label: string;
  direction: "positive" | "negative";
  callsContaining: number;
  bookingRate: number;
  baselineDelta: number;
  exampleCallIds: string[];
};

export type PhraseLiftProfile = {
  generatedAt: string;
  baseline: {
    totalCalls: number;
    booked: number;
    notBooked: number;
    bookingRate: number;
  };
  model: {
    crossValidation: {
      rocAuc: number;
      averagePrecision: number;
      accuracyAtThreshold50: number;
    };
  };
  discoveredLanguageClusters: PhraseLiftCluster[];
  languageSignals: {
    positiveForBooking: { phrase: string; weight: number }[];
    negativeForBooking: { phrase: string; weight: number }[];
  };
  stageLanguageSignals?: Record<
    string,
    {
      positive: { phrase: string; weight: number }[];
      negative: { phrase: string; weight: number }[];
    }
  >;
};

export type PhraseProfileSummaryInput = {
  generatedAt: string;
  baseline: PhraseLiftProfile["baseline"];
  modelMetrics: PhraseLiftProfile["model"]["crossValidation"];
  clusters: PhraseLiftCluster[];
  weightedPhrases: PhraseLiftProfile["languageSignals"];
  stageHighlights: {
    stage: string;
    positive: string[];
    negative: string[];
  }[];
};

export function buildPhraseProfileSummaryInput(
  profile: PhraseLiftProfile,
): PhraseProfileSummaryInput {
  const clusters = [...profile.discoveredLanguageClusters].sort(
    (a, b) => Math.abs(b.baselineDelta) - Math.abs(a.baselineDelta),
  );

  const stageHighlights = profile.stageLanguageSignals
    ? Object.entries(profile.stageLanguageSignals).map(([stage, signals]) => ({
        stage,
        positive: signals.positive.slice(0, 3).map((s) => s.phrase),
        negative: signals.negative.slice(0, 3).map((s) => s.phrase),
      }))
    : [];

  return {
    generatedAt: profile.generatedAt,
    baseline: profile.baseline,
    modelMetrics: profile.model.crossValidation,
    clusters,
    weightedPhrases: profile.languageSignals,
    stageHighlights,
  };
}
