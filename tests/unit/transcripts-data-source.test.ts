import { describe, expect, it } from "vitest";

import { getTranscriptDataSource } from "@/server/transcripts";

describe("transcript data source", () => {
  it("loads transcripts from the CSV data source", async () => {
    const dataSource = getTranscriptDataSource();

    const transcripts = await dataSource.getTranscripts();

    expect(transcripts.length).toBeGreaterThan(0);
    expect(transcripts[0]).toMatchObject({
      callId: expect.any(String),
      transcript: expect.any(String),
      callDurationMin: expect.any(Number),
      callOutcome: expect.any(String),
      repId: expect.any(String),
      repTenure: expect.any(String),
      cuisineType: expect.any(String),
      restaurantType: expect.any(String),
      numLocations: expect.any(Number),
    });
  });
});
