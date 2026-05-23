/** One line per transcript line: "1: ...\\n2: ..." */
export function toLineNumberedTranscript(transcript: string): string {
  const lines = transcript.split(/\r?\n/);
  return lines.map((line, index) => `${index + 1}: ${line}`).join("\n");
}
