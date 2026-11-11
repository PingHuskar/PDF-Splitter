import {
  assignFromRanges, chunkEvery, filePages, formatBytes, movePages, pagesLabel, parseRanges, partName, rangeLabel,
  rotatePages,
} from "./logic";

describe("parseRanges", () => {
  it("parses single pages, ranges and open ends", () => {
    expect(parseRanges("1-3, 5, 8-", 10)).toEqual({
      ok: true,
      ranges: [{ start: 1, end: 3 }, { start: 5, end: 5 }, { start: 8, end: 10 }],
    });
    expect(parseRanges("-2; 4 to 6", 10)).toEqual({
      ok: true,
      ranges: [{ start: 1, end: 2 }, { start: 4, end: 6 }],
    });
  });

  it("rejects empty, malformed and reversed input", () => {
    expect(parseRanges("  , ", 10)).toEqual({ ok: false, error: "empty" });
    expect(parseRanges("1-3, abc", 10)).toEqual({ ok: false, error: "invalid", token: "abc" });
    expect(parseRanges("-", 10)).toEqual({ ok: false, error: "invalid", token: "-" });
    expect(parseRanges("5-2", 10)).toEqual({ ok: false, error: "invalid", token: "5-2" });
  });

  it("rejects pages outside the document", () => {
    expect(parseRanges("0-2", 10)).toEqual({ ok: false, error: "outOfBounds", token: "0-2" });
    expect(parseRanges("9-11", 10)).toEqual({ ok: false, error: "outOfBounds", token: "9-11" });
  });
});

describe("chunkEvery", () => {
  it("cuts into equal pieces with a shorter last piece", () => {
    expect(chunkEvery(5, 2)).toEqual([{ start: 1, end: 2 }, { start: 3, end: 4 }, { start: 5, end: 5 }]);
    expect(chunkEvery(3, 1)).toHaveLength(3);
    expect(chunkEvery(3, 10)).toEqual([{ start: 1, end: 3 }]);
  });

  it("returns nothing for a bad size", () => {
    expect(chunkEvery(5, 0)).toEqual([]);
    expect(chunkEvery(5, NaN)).toEqual([]);
  });
});

describe("names and sizes", () => {
  it("labels ranges and names parts", () => {
    expect(rangeLabel({ start: 4, end: 4 })).toBe("4");
    expect(partName("Report.PDF", [2, 3, 4], 0)).toBe("Report_p2-4.pdf");
    expect(partName(".pdf", [1], 0)).toBe("document_p1.pdf");
    expect(partName("a.pdf", [1, 3, 5], 1)).toBe("a_p1_3_5.pdf");
    expect(partName("a.pdf", [1, 3, 5, 7], 2)).toBe("a_part3.pdf");
    expect(pagesLabel([1, 2, 3, 5])).toBe("1-3, 5");
  });

  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});

describe("page map", () => {
  it("builds from ranges, leaving uncovered pages not printed", () => {
    expect(assignFromRanges([{ start: 1, end: 2 }, { start: 4, end: 5 }], 6)).toEqual([0, 0, null, 1, 1, null]);
  });

  it("lets a later range win and drops files that end up empty", () => {
    expect(assignFromRanges([{ start: 1, end: 2 }, { start: 1, end: 3 }], 3)).toEqual([0, 0, 0]);
  });

  it("moves pages to another file, a new file, or not printed", () => {
    const a = assignFromRanges([{ start: 1, end: 2 }, { start: 3, end: 4 }], 4);
    expect(movePages(a, [0], 1)).toEqual([1, 0, 1, 1]);
    expect(movePages(a, [1, 3], "new")).toEqual([0, 2, 1, 2]);
    expect(movePages(a, [2], null)).toEqual([0, 0, null, 1]);
    // file 1 loses all its pages → file 2 becomes file 1
    expect(movePages(a, [0, 1], null)).toEqual([null, null, 0, 0]);
    expect(a).toEqual([0, 0, 1, 1]);
  });

  it("lists the pages of each file", () => {
    expect(filePages([1, 0, null, 1])).toEqual([[2], [1, 4]]);
    expect(filePages([null, null])).toEqual([]);
  });
});

describe("rotatePages", () => {
  it("adds degrees to a page and keeps the map canonical", () => {
    expect(rotatePages({}, [1], 90)).toEqual({ 1: 90 });
    expect(rotatePages({ 1: 90 }, [1], 90)).toEqual({ 1: 180 });
    // 180° again = upside-down of upside-down = back to straight
    expect(rotatePages({ 1: 180 }, [1], 180)).toEqual({});
  });

  it("wraps around and normalizes negative turns", () => {
    expect(rotatePages({ 1: 270 }, [1], 90)).toEqual({});
    expect(rotatePages({}, [1], -90)).toEqual({ 1: 270 });
  });

  it("rotates only the chosen pages and leaves the original untouched", () => {
    const r = { 0: 90, 3: 180 };
    expect(rotatePages(r, [1, 2], 180)).toEqual({ 0: 90, 1: 180, 2: 180, 3: 180 });
    expect(r).toEqual({ 0: 90, 3: 180 });
  });

  it("ignores negative indexes", () => {
    expect(rotatePages({}, [-1], 90)).toEqual({});
  });
});
