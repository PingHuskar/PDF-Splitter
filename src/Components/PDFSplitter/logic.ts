// PDFSplitter rules: turn the user's choice (page ranges, or every N pages) into a list of
// 1-based inclusive page ranges, one per output file. No React, no pdf-lib.

export type Range = { start: number; end: number };
export type RangeError = "empty" | "invalid" | "outOfBounds";
export type ParseResult = { ok: true; ranges: Range[] } | { ok: false; error: RangeError; token?: string };

/** "1-3, 5, 8-" → [{1,3},{5,5},{8,pageCount}]. Each comma-separated part becomes one file. */
export function parseRanges(input: string, pageCount: number): ParseResult {
  const tokens = input.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return { ok: false, error: "empty" };
  const ranges: Range[] = [];
  for (const token of tokens) {
    const m = /^(\d+)?\s*(?:(-|–|to)\s*(\d+)?)?$/i.exec(token);
    if (!m || (m[1] === undefined && m[3] === undefined)) return { ok: false, error: "invalid", token };
    const start = m[1] === undefined ? 1 : Number(m[1]);
    const end = m[2] === undefined ? start : m[3] === undefined ? pageCount : Number(m[3]);
    if (start > end) return { ok: false, error: "invalid", token };
    if (start < 1 || end > pageCount) return { ok: false, error: "outOfBounds", token };
    ranges.push({ start, end });
  }
  return { ok: true, ranges };
}

/** Cut the document into pieces of `size` pages (the last piece may be shorter). */
export function chunkEvery(pageCount: number, size: number): Range[] {
  const n = Math.floor(size);
  if (!(n >= 1) || pageCount < 1) return [];
  const ranges: Range[] = [];
  for (let start = 1; start <= pageCount; start += n) {
    ranges.push({ start, end: Math.min(start + n - 1, pageCount) });
  }
  return ranges;
}

export const rangeLabel = (r: Range) => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`);

// ---- The page map: one entry per page (index 0 = page 1) holding its file number (0-based),
// or null when the page is left out ("not printed"). File numbers are always 0..n-1 with no gaps.
export type Assignment = (number | null)[];
/** Where pages can be moved: an existing file, a brand-new file, or null = not printed. */
export type Target = number | null | "new";

/** Renumber files 0..n-1 in their current order, dropping files that lost all their pages. */
export function compact(a: Assignment): Assignment {
  const ids = [...new Set(a.filter((g): g is number => g !== null))].sort((x, y) => x - y);
  const renumber = new Map(ids.map((id, i) => [id, i]));
  return a.map((g) => (g === null ? null : renumber.get(g)!));
}

/** One file per range; pages in no range are not printed. Where ranges overlap, the later one wins. */
export function assignFromRanges(ranges: Range[], pageCount: number): Assignment {
  const a: Assignment = Array.from({ length: pageCount }, () => null);
  ranges.forEach((r, g) => {
    for (let p = Math.max(r.start, 1); p <= Math.min(r.end, pageCount); p++) a[p - 1] = g;
  });
  return compact(a);
}

export const fileCount = (a: Assignment) => a.reduce<number>((m, g) => (g === null ? m : Math.max(m, g + 1)), 0);

/** Move pages (0-based indexes) to a file, a new file, or not printed. */
export function movePages(a: Assignment, pages: number[], target: Target): Assignment {
  const g = target === "new" ? fileCount(a) : target;
  const next = a.slice();
  for (const i of pages) if (i >= 0 && i < next.length) next[i] = g;
  return compact(next);
}

/** 1-based page numbers of each file, ascending. */
export function filePages(a: Assignment): number[][] {
  const out: number[][] = Array.from({ length: fileCount(a) }, () => []);
  a.forEach((g, i) => {
    if (g !== null) out[g].push(i + 1);
  });
  return out;
}

/** [1,2,3,5] → [{1,3},{5,5}] */
export function toRanges(pages: number[]): Range[] {
  const ranges: Range[] = [];
  for (const p of pages) {
    const last = ranges[ranges.length - 1];
    if (last && p === last.end + 1) last.end = p;
    else ranges.push({ start: p, end: p });
  }
  return ranges;
}

/** [1,2,3,5] → "1-3, 5" */
export const pagesLabel = (pages: number[]) => toRanges(pages).map(rangeLabel).join(", ");

// ---- Rotation: one entry per rotated page (index 0 = page 1) holding its extra angle on top
// of the page's own /Rotate. Absent = no extra rotation; entries never store 0.
export type Rotations = Record<number, number>;
export const rotationOf = (r: Rotations, i: number) => r[i] ?? 0;

/** Turn pages (0-based indexes) a further `delta` degrees (any multiple of 90, negatives included). */
export function rotatePages(r: Rotations, pages: number[], delta: number): Rotations {
  const next: Rotations = { ...r };
  for (const i of pages) {
    if (i < 0) continue;
    const angle = (((rotationOf(r, i) + delta) % 360) + 360) % 360;
    if (angle === 0) delete next[i];
    else next[i] = angle;
  }
  return next;
}

/** "Report.PDF" + [2,3,4] → "Report_p2-4.pdf"; a file made of many scattered runs → "Report_part3.pdf" */
export function partName(fileName: string, pages: number[], index: number): string {
  const base = fileName.replace(/\.pdf$/i, "") || "document";
  const ranges = toRanges(pages);
  const suffix = ranges.length <= 3 ? `p${ranges.map(rangeLabel).join("_")}` : `part${index + 1}`;
  return `${base}_${suffix}.pdf`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
