# PDFSplitter

Upload a PDF, split it into smaller PDFs and download them — all in the browser (pdf-lib), nothing is uploaded to a server.

- Upload by drag-and-drop or file picker; shows file name, page count and size
- Split by page ranges (`1-3, 5, 8-` — one file per part), every N pages, or every page
- Live validation of ranges with a count of files that will be created
- Page map: one small preview per page rendered with pdf.js, ringed by output-file colour, see-through when not printed; drag a square onto a file or another square, right-click it, or select squares and click a file to move pages to another file, a new file, or not printed
- Rotate pages 90° left, 90° right or 180° (upside-down) from the same right-click menu or selection chips; applied on top of each page's own rotation when the parts are written
- Watermark & signature: a diagonal text watermark (any language — rendered through a canvas) and/or a signature stamp (uploaded image or drawn in-browser) on every page of every output file; stays at the visual corner even on rotated pages
- The upload, split settings and the last 10 split runs are saved in the browser (IndexedDB): a refresh restores the last session, and past runs stay downloadable under History; everything fails soft when IndexedDB is unavailable
- Download each part or all at once; files are named `<name>_p<range>.pdf`
- Clear message for non-PDF, damaged or password-protected files
- EN/TH, light/dark
- Range rules in `logic.ts` with jest tests; pdf-lib code in `split.ts`
