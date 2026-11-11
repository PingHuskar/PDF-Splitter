# PDF Splitter

Upload a PDF, split it into smaller PDFs and download them — all in the browser ([pdf-lib](https://github.com/Hopding/pdf-lib)), nothing is uploaded to a server.

Built with **Vite + React + TypeScript + Tailwind CSS v4**. This app is the standalone version of the [`PDFSplitter`](src/Components/PDFSplitter) component, shipped as a PWA (`vite-plugin-pwa`) so it works offline after the first load.

## Features

- Upload by drag-and-drop or file picker; shows file name, page count and size
- Split by page ranges (`1-3, 5, 8-` — one file per part), every N pages, or every page
- Live validation of ranges with a count of files that will be created
- Page map: one small preview per page rendered with pdf.js (the same engine browsers use), ringed by output-file colour, see-through when not printed; drag a square onto a file or another square, right-click it, or select squares and click a file to move pages to another file, a new file, or not printed
- Rotate pages 90° left, 90° right or 180° (upside-down) — per page or for a whole selection, applied on top of each page's own rotation
- Watermark & signature on every output page: diagonal text watermark (any language, adjustable opacity) plus a signature stamp from an uploaded image or drawn in-browser
- **Works offline after the first load** — a service worker (vite-plugin-pwa) precaches the whole app, including the pdf.js worker; settings and history live in IndexedDB
- Everything is saved in the browser (IndexedDB): reopening the app restores the last uploaded PDF with its page map, rotations and range settings, and the last 10 split runs stay downloadable under History
- Download each part or all at once; files are named `<name>_p<range>.pdf`
- Clear message for non-PDF, damaged or password-protected files
- EN/TH languages, light/dark theme (both remembered)
- Range rules in [`src/Components/PDFSplitter/logic.ts`](src/Components/PDFSplitter/logic.ts) with Vitest tests; pdf-lib code in [`split.ts`](src/Components/PDFSplitter/split.ts)

## Scripts

```sh
npm install     # install dependencies
npm run dev     # start the dev server
npm test        # run the Vitest suite (logic rules)
npm run build   # type-check and build for production (dist/)
npm run preview # serve the production build
npm run lint    # oxlint
```

## Structure

```
src/
├── App.tsx                      # header with EN/TH + light/dark toggles
├── Components/
│   ├── PDFSplitter/             # the tool itself (see its README)
│   │   ├── index.tsx            # uploader, split modes, results, session restore
│   │   ├── PageGrid.tsx         # the page map
│   │   ├── History.tsx          # past split runs (IndexedDB)
│   │   ├── store.ts             # IndexedDB: session + history (last 10 runs)
│   │   ├── ui.tsx               # shared button classes and card section
│   │   ├── data.ts              # all EN/TH text and labels
│   │   ├── logic.ts             # pure range/assignment/rotation rules (tested)
│   │   ├── split.ts             # pdf-lib loading and splitting
│   │   └── logic.test.ts        # Vitest tests for logic.ts
│   └── Settings/utils/          # shared app settings (same layout as ChadinDev)
│       ├── language.ts          # useAppLang() EN/TH store (saved choice → browser language)
│       └── theme.ts             # useTheme() light/dark (saved choice → system preference)
```

The component only depends on React, Tailwind and `useAppLang()` from `src/Settings/utils/language.ts` — drop the folder into any app that provides that hook.
