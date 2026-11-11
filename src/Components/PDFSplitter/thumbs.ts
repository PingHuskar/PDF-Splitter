// PDFSplitter previews: render each page to a small image with pdf.js (the engine browsers
// use), so the page map shows the real pages. Loaded lazily (dynamic import in index.tsx)
// so the renderer is code-split out of the app's first paint.
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

/** One data URL per page (index 0 = page 1); a square without its preview yet is undefined. */
export type Thumbs = (string | undefined)[];

const THUMB_WIDTH = 88; // px — plenty for a ~44 px slot on any screen density

/** Render every page and report each thumbnail as it finishes. Failures leave that page's
 * square on its number fallback; `cancelled()` lets the caller abandon the run mid-way. */
export async function renderThumbs(
  bytes: ArrayBuffer,
  pageCount: number,
  onThumb: (index: number, dataUrl: string) => void,
  cancelled: () => boolean,
): Promise<void> {
  // pdf.js takes ownership of the buffer it is given (it is transferred to the worker),
  // so hand it a copy and keep the original for splitting and session saving.
  const task = getDocument({ data: new Uint8Array(bytes.slice(0)) });
  try {
    const doc = await task.promise;
    try {
      for (let i = 1; i <= pageCount; i++) {
        if (cancelled()) return;
        const page = await doc.getPage(i);
        const scale = THUMB_WIDTH / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        await page.render({ canvas, viewport }).promise;
        onThumb(i - 1, canvas.toDataURL("image/jpeg", 0.75));
      }
    } catch {
      // a page that fails to render (cancelled or broken) just keeps the number fallback
    } finally {
      await doc.cleanup();
    }
  } catch {
    // unreadable bytes etc. — the map simply stays on its number fallback
  } finally {
    await task.destroy();
  }
}
