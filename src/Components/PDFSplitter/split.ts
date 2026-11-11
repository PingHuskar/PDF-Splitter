// PDFSplitter: the pdf-lib part — count pages, copy page ranges into new documents, and stamp
// the watermark/signature (mark.ts) onto every page of the output.
import { PDFDocument, degrees } from "pdf-lib";
import {
  centeredRotated, cornerStamp, dataUrlBytes, hasMark, isPngDataUrl, watermarkAngle, watermarkPng, watermarkWidth,
  type Mark,
} from "./mark";
import type { Rotations } from "./logic";

export async function loadPdf(bytes: ArrayBuffer): Promise<PDFDocument> {
  return PDFDocument.load(bytes);
}

/** One new PDF per file; each file is a list of 1-based page numbers, optionally rotated
 * (index 0 = page 1 → extra degrees on top of the page's own /Rotate). */
export async function splitPdf(source: PDFDocument, files: number[][], rotations: Rotations = {}, mark?: Mark): Promise<Blob[]> {
  const stamping = mark && hasMark(mark);
  // The watermark is rendered once (a canvas PNG); both stamps embed per output document.
  const wm = stamping && mark.watermark.trim() ? watermarkPng(mark.watermark.trim()) : null;
  const wmSize = wm && { w: wm.w, h: wm.h };
  const wmBytes = wm ? dataUrlBytes(wm.url) : null;
  const sigBytes = stamping && mark.signature ? dataUrlBytes(mark.signature) : null;
  const sigIsPng = !mark?.signature || isPngDataUrl(mark.signature);
  const opacity = mark?.opacity ?? 0;
  const marginScale = 0.04;

  const parts: Blob[] = [];
  for (const file of files) {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(source, file.map((p) => p - 1));
    // Embed once per document — pdf-lib does not dedupe embeds called per page.
    const wmImg = wm && wmBytes ? await out.embedPng(wmBytes) : null;
    const sigImg = sigBytes ? (sigIsPng ? await out.embedPng(sigBytes) : await out.embedJpg(sigBytes)) : null;
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const extra = rotations[file[i] - 1] ?? 0;
      if (extra) p.setRotation(degrees((p.getRotation().angle + extra) % 360));
      out.addPage(p);

      if (!stamping) continue;
      const { width: pw, height: ph } = p.getSize();
      const deg = p.getRotation().angle;
      if (wmImg && wmSize) {
        const w = watermarkWidth(pw, ph);
        const h = (wmSize.h * w) / wmSize.w;
        const angle = watermarkAngle(deg);
        const pos = centeredRotated(pw / 2, ph / 2, w, h, angle);
        p.drawImage(wmImg, { ...pos, width: w, height: h, rotate: degrees(angle), opacity });
      }
      if (sigImg) {
        const w = pw * 0.25;
        const h = (sigImg.height * w) / sigImg.width;
        const m = Math.min(pw, ph) * marginScale;
        p.drawImage(sigImg, { ...cornerStamp(deg, pw, ph, w, h, m), width: w, height: h });
      }
    }
    const bytes = await out.save();
    parts.push(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  }
  return parts;
}
