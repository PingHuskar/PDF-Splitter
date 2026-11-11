// PDFSplitter stamping: a diagonal text watermark and/or a signature image on every page of
// the output. The watermark text is drawn to a transparent PNG on a canvas first, so any
// language (Thai included) works without embedding fonts. The placement helpers are pure and
// unit-tested; pdf-lib draws in the page's unrotated coordinate space, so corners are mapped
// through the page's final /Rotate to stay at the visual bottom-right.

export type Mark = { watermark: string; opacity: number; signature: string | null };

export const DEFAULT_MARK: Mark = { watermark: "", opacity: 0.2, signature: null };

export const hasMark = (m: Mark) => m.watermark.trim().length > 0 || m.signature !== null;

/** Render the watermark text to a transparent PNG (dark glyphs; opacity applied when drawing). */
export function watermarkPng(text: string, fontPx = 96): { url: string; w: number; h: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `bold ${fontPx}px sans-serif`;
  ctx.font = font;
  const pad = Math.ceil(fontPx * 0.2);
  canvas.width = Math.ceil(ctx.measureText(text).width) + pad * 2;
  canvas.height = Math.ceil(fontPx * 1.3) + pad * 2;
  ctx.font = font; // resizing the canvas resets its state
  ctx.fillStyle = "#111";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, canvas.height / 2);
  return { url: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
}

/** Decode a data URL into the bytes pdf-lib embeds. */
export function dataUrlBytes(url: string): Uint8Array {
  const bin = atob(url.slice(url.indexOf(",") + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const isPngDataUrl = (url: string) => url.startsWith("data:image/png");

export type VisualCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

// Which content corner each visual corner shows, per display turn (the page is displayed
// rotated clockwise by deg). Derived by physically turning a labelled sheet; unit-tested.
const CORNER_TABLE: Record<number, Record<VisualCorner, string>> = {
  0: { topLeft: "TL", topRight: "TR", bottomRight: "BR", bottomLeft: "BL" },
  90: { topLeft: "BL", topRight: "TL", bottomRight: "TR", bottomLeft: "BR" },
  180: { topLeft: "TR", topRight: "BL", bottomRight: "TL", bottomLeft: "BR" },
  270: { topLeft: "TR", topRight: "BR", bottomRight: "BL", bottomLeft: "TL" },
};

/** Where a visually-anchored corner lands in the page's unrotated coordinates, for /Rotate deg
 * (0/90/180/270). Pure, tested. */
export function cornerPos(corner: VisualCorner, deg: number, pw: number, ph: number): { x: number; y: number } {
  const at = CORNER_TABLE[((deg % 360) + 360) % 360][corner];
  return { x: at === "TL" || at === "BL" ? 0 : pw, y: at === "TL" || at === "TR" ? ph : 0 };
}

/** Anchor a w×h image m units inside the page at a visual corner (bottom-right in practice).
 * Pure, tested. */
export function cornerStamp(
  deg: number,
  pw: number,
  ph: number,
  w: number,
  h: number,
  m: number,
): { x: number; y: number } {
  const c = cornerPos("bottomRight", deg, pw, ph);
  return { x: c.x === pw ? pw - m - w : m, y: c.y === ph ? ph - m - h : m };
}

/** Bottom-left position that centers a w×h image rotated deg degrees at (cx, cy). Pure, tested. */
export function centeredRotated(cx: number, cy: number, w: number, h: number, deg: number): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { x: cx - (w / 2) * cos + (h / 2) * sin, y: cy - (w / 2) * sin - (h / 2) * cos };
}

/** Width the diagonal watermark is stretched to on a pw×ph page. Pure, tested. */
export const watermarkWidth = (pw: number, ph: number) => Math.hypot(pw, ph) * 0.8;

/** The content-space angle that makes the watermark look diagonal on the displayed page. */
export const watermarkAngle = (deg: number) => 45 - (((deg % 360) + 360) % 360);
