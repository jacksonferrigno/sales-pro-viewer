export type PopoverLine = { num: number; text: string };

export type RichSegment =
  | { kind: "text"; text: string }
  | {
      kind: "cite";
      label: string;
      lines: PopoverLine[];
      /** `[line:n]` only — shown as compact “ex.” link */
      bare?: boolean;
    };

export function transcriptToLines(transcript: string): string[] {
  return transcript.split(/\r?\n/);
}

export function parseLineRefSpec(spec: string): number[] {
  const out: number[] = [];
  for (const part of spec.split(",")) {
    const p = part.trim();
    const m = /^(\d+)(?:-(\d+))?$/.exec(p);
    if (!m) continue;
    let a = Number(m[1]);
    let b = m[2] ? Number(m[2]) : a;
    if (a > b) {
      const t = a;
      a = b;
      b = t;
    }
    for (let i = a; i <= b; i++) out.push(i);
  }
  return [...new Set(out)].sort((x, y) => x - y);
}

function linesForSpec(transcriptLines: string[], spec: string): PopoverLine[] {
  const normalized = spec.replace(/[–—]/g, "-");
  return parseLineRefSpec(normalized)
    .filter((n) => n >= 1)
    .map((num) => ({
      num,
      text: (transcriptLines[num - 1] ?? "").trim() || "—",
    }));
}

/** `[claim](line:N)` or `[claim] (line:N)` (space before `(` allowed). */
const LINK_AT = /^\[([^\]]*)]\s*\(\s*line\s*:([^)]*)\)/i;
const BARE_AT = /^\[(line:\s*[^\]]+)\]/i;

/**
 * Model copy: `[claim](line:N)` and bare `[line:N-M,N]` both become cite segments
 * with transcript popovers.
 */
export function toRichSegments(
  text: string,
  transcriptLines: string[],
): RichSegment[] {
  const segments: RichSegment[] = [];
  let pos = 0;

  const pushText = (t: string) => {
    if (t.length === 0) return;
    const lastSeg = segments[segments.length - 1];
    if (lastSeg?.kind === "text") {
      lastSeg.text += t;
    } else {
      segments.push({ kind: "text", text: t });
    }
  };

  while (pos < text.length) {
    const slice = text.slice(pos);
    const linkMatch = LINK_AT.exec(slice);
    if (linkMatch) {
      const label = linkMatch[1].trim() || "Citation";
      const spec = linkMatch[2].trim();
      segments.push({
        kind: "cite",
        label,
        lines: linesForSpec(transcriptLines, spec),
      });
      pos += linkMatch[0].length;
      continue;
    }

    const bareMatch = BARE_AT.exec(slice);
    if (bareMatch) {
      const spec = bareMatch[1].replace(/^line:\s*/i, "").trim();
      segments.push({
        kind: "cite",
        label: "ex.",
        bare: true,
        lines: linesForSpec(transcriptLines, spec),
      });
      pos += bareMatch[0].length;
      continue;
    }

    const nextBracket = text.indexOf("[", pos);
    if (nextBracket === -1) {
      pushText(text.slice(pos));
      break;
    }
    if (nextBracket > pos) {
      pushText(text.slice(pos, nextBracket));
      pos = nextBracket;
      continue;
    }

    pushText("[");
    pos += 1;
  }

  if (segments.length === 0) {
    segments.push({ kind: "text", text });
  }
  return segments;
}
