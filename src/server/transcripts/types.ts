export interface CallTranscript {
  callId: string;
  transcript: string;
  callDurationMin: number;
  callOutcome: string;
  repId: string;
  repTenure: string;
  cuisineType: string;
  restaurantType: string;
  numLocations: number;
  loadedAt: string;
  loadedBy: string;
}

export interface TranscriptDataSource {
  getTranscripts(): Promise<CallTranscript[]>;
}
