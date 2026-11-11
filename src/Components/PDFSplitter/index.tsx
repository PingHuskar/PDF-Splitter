// PDFSplitter: upload a PDF, split it by page ranges / every N pages / every page, and download
// the pieces. Runs fully in the browser with pdf-lib — the file is never sent anywhere. The
// upload, the split settings and the generated parts are kept in IndexedDB (store.ts), so a
// refresh restores the last session and past runs stay downloadable as history.
import { useEffect, useRef, useState } from "react";
import type { PDFDocument } from "pdf-lib";
import { useAppLang } from "../Settings/utils/language";
import {
  DEFAULT_EVERY, MODES, MODE_IDS, PART_META, PLAN, RANGE_ERRORS, SUMMARY, TEXT,
  type Lang, type ModeId,
} from "./data";
import {
  assignFromRanges, chunkEvery, filePages, formatBytes, movePages, pagesLabel, parseRanges, partName, rotatePages,
  type Assignment, type ParseResult, type Rotations,
} from "./logic";
import { DEFAULT_MARK, type Mark } from "./mark";
import PageGrid from "./PageGrid";
import SignaturePad from "./SignaturePad";
import { loadPdf, splitPdf } from "./split";
import { addHistory, clearHistory, clearSession, deleteHistory, listHistory, loadSession, saveSession, type HistoryEntry, type SessionData } from "./store";
import type { Thumbs } from "./thumbs";
import History from "./History";
import { ERROR, INPUT, MUTED, OUTLINE_BTN, PRIMARY_BTN, Section } from "./ui";

type Source = { name: string; size: number; doc: PDFDocument; pages: number; bytes: ArrayBuffer };
type Part = { name: string; pages: number[]; size: number; url: string };
/** The user's split choices, saved with the PDF and handed back to Splitter on restore. */
type Initial = Pick<SessionData, "assign" | "rots" | "mode" | "rangeText" | "every" | "mark">;

const initialFor = (source: Source): Initial => ({
  assign: assignFromRanges([{ start: 1, end: source.pages }], source.pages),
  rots: {},
  mode: "ranges",
  rangeText: `1-${source.pages}`,
  every: DEFAULT_EVERY,
  mark: DEFAULT_MARK,
});

function Uploader({ lang, source, onSource }: { lang: Lang; source: Source | null; onSource: (s: Source | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<keyof typeof TEXT | null>(null);
  const [over, setOver] = useState(false);

  const open = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setError("notPdf");
      return;
    }
    setBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await loadPdf(bytes);
      onSource({ name: file.name, size: file.size, doc, pages: doc.getPageCount(), bytes });
    } catch {
      onSource(null);
      setError("loadFailed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title={TEXT.uploadTitle[lang]}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          void open(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {source ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 break-words text-sm text-slate-900 dark:text-slate-100">
            {SUMMARY[lang](source.name, source.pages, formatBytes(source.size))}
          </p>
          <button type="button" className={OUTLINE_BTN} onClick={() => inputRef.current?.click()}>
            {TEXT.change[lang]}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void open(e.dataTransfer.files[0]);
          }}
          className={`w-full rounded-xl border-2 border-dashed px-4 py-10 text-center text-sm ${
            over
              ? "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-500/15 dark:text-blue-100"
              : "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {busy ? TEXT.reading[lang] : TEXT.drop[lang]}
        </button>
      )}
      {error && <p className={ERROR}>{TEXT[error][lang]}</p>}
    </Section>
  );
}

function Splitter({
  lang,
  source,
  initial,
  onSplitDone,
}: {
  lang: Lang;
  source: Source;
  initial?: Initial;
  onSplitDone: () => void;
}) {
  const [mode, setMode] = useState<ModeId>(initial?.mode ?? "ranges");
  const [rangeText, setRangeText] = useState(initial?.rangeText ?? `1-${source.pages}`);
  const [every, setEvery] = useState(initial?.every ?? DEFAULT_EVERY);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  // The page map is what actually gets split; the mode controls above it are just quick ways to fill it.
  const [assign, setAssign] = useState<Assignment>(initial?.assign ?? assignFromRanges([{ start: 1, end: source.pages }], source.pages));
  // Extra per-page rotation (index 0 = page 1), kept separately so it survives moving pages between files.
  const [rots, setRots] = useState<Rotations>(initial?.rots ?? {});
  // Watermark text + signature image stamped onto every page of the output.
  const [mark, setMark] = useState<Mark>(initial?.mark ?? DEFAULT_MARK);
  const [padOpen, setPadOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);
  // Real page previews, filled in progressively as pdf.js renders them.
  const [thumbs, setThumbs] = useState<Thumbs>([]);

  // Free the object URLs when the results are replaced or the page is left.
  useEffect(() => () => parts.forEach((p) => URL.revokeObjectURL(p.url)), [parts]);

  // Render the page previews for this file (thumbs.ts is loaded on demand, so pdf.js stays
  // out of the initial bundle). The Splitter remounts per file, so this runs once per file.
  useEffect(() => {
    let dead = false;
    void import("./thumbs").then(({ renderThumbs }) =>
      renderThumbs(source.bytes, source.pages, (i, url) => {
        if (!dead) setThumbs((t) => {
          const next = t.slice();
          next[i] = url;
          return next;
        });
      }, () => dead),
    );
    return () => {
      dead = true;
    };
  }, [source]);

  // Save the session (PDF bytes + settings) so a refresh restores exactly this state.
  useEffect(() => {
    const t = setTimeout(() => {
      void saveSession({
        name: source.name,
        size: source.size,
        bytes: source.bytes,
        pages: source.pages,
        assign,
        rots,
        mode,
        rangeText,
        every,
        mark,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [source, assign, rots, mode, rangeText, every, mark]);

  const planFor = (m: ModeId, text: string, n: number): ParseResult =>
    m === "ranges"
      ? parseRanges(text, source.pages)
      : { ok: true, ranges: chunkEvery(source.pages, m === "each" ? 1 : n) };
  const plan = planFor(mode, rangeText, every);
  const files = filePages(assign);
  const ready = files.length > 0;

  const update = (next: Assignment) => {
    setAssign(next);
    setParts([]);
  };
  const applyPreset = (m: ModeId, text: string, n: number) => {
    const p = planFor(m, text, n);
    if (p.ok && p.ranges.length > 0) update(assignFromRanges(p.ranges, source.pages));
  };

  const updateMark = (m: Mark) => {
    setMark(m);
    setParts([]);
  };

  const openSignature = async (file: File | undefined) => {
    if (!file) return;
    setImgError(false);
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      setImgError(true);
      return;
    }
    const url = await new Promise<string>((res) => {
      const reader = new FileReader();
      reader.onload = () => res(String(reader.result));
      reader.readAsDataURL(file);
    });
    updateMark({ ...mark, signature: url });
  };

  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const names = files.map((f, i) => partName(source.name, f, i));
      const blobs = await splitPdf(source.doc, files, rots, mark);
      // Keep the run in the browser so it lands in the downloadable history.
      await addHistory({
        sourceName: source.name,
        sourcePages: source.pages,
        parts: await Promise.all(
          blobs.map(async (blob, i) => ({ name: names[i], pages: files[i], bytes: await blob.arrayBuffer() })),
        ),
      });
      onSplitDone();
      setParts(
        blobs.map((blob, i) => ({
          name: names[i],
          pages: files[i],
          size: blob.size,
          url: URL.createObjectURL(blob),
        })),
      );
    } catch {
      setParts([]);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const downloadAll = () => {
    parts.forEach((p, i) =>
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = p.url;
        a.download = p.name;
        a.click();
      }, i * 200),
    );
  };

  return (
    <>
      <Section title={TEXT.splitTitle[lang]}>
        <div className="flex flex-wrap gap-2">
          {MODE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                applyPreset(id, rangeText, every);
              }}
              className={
                mode === id
                  ? "rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm text-white dark:border-blue-500 dark:bg-blue-500"
                  : OUTLINE_BTN
              }
            >
              {MODES[id][lang]}
            </button>
          ))}
        </div>

        {mode === "ranges" && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{TEXT.rangesLabel[lang]}</span>
            <input
              className={INPUT}
              value={rangeText}
              placeholder="1-3, 5, 8-"
              onChange={(e) => {
                setRangeText(e.target.value);
                applyPreset(mode, e.target.value, every);
              }}
            />
            <span className={`block ${MUTED}`}>{TEXT.rangesHint[lang]}</span>
          </label>
        )}
        {mode === "every" && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{TEXT.everyLabel[lang]}</span>
            <input
              className={`${INPUT} max-w-[8rem]`}
              type="number"
              min={1}
              max={source.pages}
              value={every}
              onChange={(e) => {
                setEvery(Number(e.target.value));
                applyPreset(mode, rangeText, Number(e.target.value));
              }}
            />
          </label>
        )}
        {mode === "each" && <p className={MUTED}>{TEXT.eachHint[lang]}</p>}

        {!plan.ok && <p className={ERROR}>{RANGE_ERRORS[plan.error][lang](plan.token ?? "", source.pages)}</p>}

        <PageGrid
          lang={lang}
          assign={assign}
          rots={rots}
          thumbs={thumbs}
          onMove={(pages, target) => update(movePages(assign, pages, target))}
          onRotate={(pages, delta) => {
            setRots((r) => rotatePages(r, pages, delta));
            setParts([]);
          }}
        />

        <div className="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{TEXT.markTitle[lang]}</div>
          <p className="text-xs text-slate-600 dark:text-slate-400">{TEXT.markHint[lang]}</p>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{TEXT.watermarkLabel[lang]}</span>
            <input
              className={INPUT}
              value={mark.watermark}
              placeholder={TEXT.watermarkPlaceholder[lang]}
              onChange={(e) => updateMark({ ...mark, watermark: e.target.value })}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {TEXT.opacityLabel[lang]} · {Math.round(mark.opacity * 100)}%
            </span>
            <input
              type="range"
              min={5}
              max={60}
              value={Math.round(mark.opacity * 100)}
              onChange={(e) => updateMark({ ...mark, opacity: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{TEXT.signatureLabel[lang]}</span>
            {mark.signature && <img src={mark.signature} alt="" className="h-10" />}
            <input
              ref={sigInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                void openSignature(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button type="button" className={OUTLINE_BTN} onClick={() => sigInputRef.current?.click()}>
              {TEXT.uploadImage[lang]}
            </button>
            <button type="button" className={OUTLINE_BTN} onClick={() => setPadOpen(!padOpen)}>
              {TEXT.drawSignature[lang]}
            </button>
            {mark.signature && (
              <button type="button" className={OUTLINE_BTN} onClick={() => updateMark({ ...mark, signature: null })}>
                {TEXT.removeMark[lang]}
              </button>
            )}
          </div>
          {imgError && <p className={ERROR}>{TEXT.notImage[lang]}</p>}
          {padOpen && (
            <SignaturePad
              lang={lang}
              onDone={(url) => {
                updateMark({ ...mark, signature: url });
                setPadOpen(false);
              }}
              onCancel={() => setPadOpen(false)}
            />
          )}
        </div>

        <p className={MUTED}>{ready ? PLAN[lang](files.length) : TEXT.nothing[lang]}</p>

        <button type="button" className={PRIMARY_BTN} disabled={!ready || busy} onClick={() => void run()}>
          {busy ? TEXT.splitting[lang] : TEXT.split[lang]}
        </button>
        {failed && <p className={ERROR}>{TEXT.splitFailed[lang]}</p>}
      </Section>

      {parts.length > 0 && (
        <Section title={TEXT.resultTitle[lang]}>
          {parts.length > 1 && (
            <button type="button" className={PRIMARY_BTN} onClick={downloadAll}>
              {TEXT.downloadAll[lang]} ({parts.length})
            </button>
          )}
          <ul className="max-h-96 space-y-2 overflow-y-auto">
            {parts.map((p) => (
              <li
                key={p.url}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"
              >
                <div className="min-w-0">
                  <div className="break-all text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {PART_META[lang](pagesLabel(p.pages), p.pages.length, formatBytes(p.size))}
                  </div>
                </div>
                <a href={p.url} download={p.name} className={`${OUTLINE_BTN} no-underline`}>
                  {TEXT.download[lang]}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

export default function PDFSplitter() {
  const lang = useAppLang();
  const [source, setSource] = useState<Source | null>(null);
  const [initial, setInitial] = useState<Initial | undefined>(undefined);
  const [restored, setRestored] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // True once the user picks a file themselves; a restore still in flight then loses.
  const pickedRef = useRef(false);

  const reloadHistory = () => void listHistory().then(setHistory);

  // Restore the last session once on mount: PDF + settings come back after a refresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadSession();
      if (cancelled || pickedRef.current) return;
      if (s) {
        try {
          const doc = await loadPdf(s.bytes);
          if (cancelled || pickedRef.current) return;
          setSource({ name: s.name, size: s.size, doc, pages: s.pages, bytes: s.bytes });
          setInitial({ assign: s.assign, rots: s.rots, mode: s.mode, rangeText: s.rangeText, every: s.every, mark: s.mark });
          setRestored(true);
        } catch {
          void clearSession(); // stored bytes unusable — start clean
        }
      }
      reloadHistory();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 pt-14 pb-16 text-left dark:bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{TEXT.title[lang]}</h1>
        <p className="text-slate-600 dark:text-slate-300">{TEXT.intro[lang]}</p>
        <Uploader
          lang={lang}
          source={source}
          onSource={(s) => {
            pickedRef.current = true;
            setSource(s);
            setFileKey((k) => k + 1);
            setInitial(undefined);
            setRestored(false);
            // A newly picked file starts a fresh session right away, before any setting changes.
            if (s) void saveSession({ name: s.name, size: s.size, bytes: s.bytes, pages: s.pages, ...initialFor(s) });
          }}
        />
        {restored && <p className={MUTED}>{TEXT.restored[lang]}</p>}
        {/* key: a new file resets the split options and clears the old results */}
        {source && <Splitter key={fileKey} lang={lang} source={source} initial={initial} onSplitDone={reloadHistory} />}
        {history.length > 0 && (
          <History
            lang={lang}
            entries={history}
            onDelete={(id) => void deleteHistory(id).then(reloadHistory)}
            onClear={() => void clearHistory().then(reloadHistory)}
          />
        )}
      </div>
    </div>
  );
}
