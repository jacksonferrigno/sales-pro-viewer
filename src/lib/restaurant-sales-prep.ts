export type PlatformPresence = {
  present: boolean;
  evidenceUrl: string | null;
};

export type RestaurantPrepGuidance = {
  whatThisLikelyMeans: string;
  questionsToAsk: string[];
  whatToListenFor: string[];
  bestNextMove: string;
};

export type RestaurantPrepRecord = {
  restaurantId: string;
  name: string;
  city: string;
  state: string;
  cuisineType?: string;
  businessType?: string;
  numLocations?: number | null;
  websiteUrl: string;
  googleRating: number | null;
  googleReviewCount: number | null;
  reviewSummary: string | null;
  seoScore: number | null;
  delivery?: boolean | null;
  takeout?: boolean | null;
  prep?: RestaurantPrepGuidance | null;
  platformPresence: {
    doordash: PlatformPresence;
    ubereats: PlatformPresence;
    grubhub: PlatformPresence;
  };
  logoUrl?: string | null;
};
