// PDFSplitter history: past split runs saved in the browser (IndexedDB), newest first. Parts
// download straight from the stored bytes; a run can be deleted, or the whole history cleared.
import { HISTORY_META, PART_META, TEXT, type Lang } from "./data";
import { formatBytes, pagesLabel } from "./logic";
import { Section, OUTLINE_BTN } from "./ui";
import type { HistoryEntry, HistoryPart } from "./store";

const dateOf = (ts: number, lang: Lang) => new Date(ts).toLocaleString(lang === "th" ? "th-TH" : "en-US");

// Build the blob on click and free it right after — no long-lived object URLs to track.
function save(p: HistoryPart) {
  const url = URL.createObjectURL(new Blob([p.bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = p.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function History({
  lang,
  entries,
  onDelete,
  onClear,
}: {
  lang: Lang;
  entries: HistoryEntry[];
  onDelete: (id: number) => void;
  onClear: () => void;
}) {
  return (
    <Section title={TEXT.historyTitle[lang]}>
      <div className="flex justify-end">
        <button type="button" className={OUTLINE_BTN} onClick={onClear}>
          {TEXT.clearHistory[lang]}
        </button>
      </div>
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                {HISTORY_META[lang](dateOf(entry.createdAt, lang), entry.sourceName, entry.parts.length)}
              </p>
              <div className="flex shrink-0 gap-1.5">
                {entry.parts.length > 1 && (
                  <button type="button" className={OUTLINE_BTN} onClick={() => entry.parts.forEach((p, i) => setTimeout(() => save(p), i * 200))}>
                    {TEXT.downloadAll[lang]}
                  </button>
                )}
                <button type="button" className={OUTLINE_BTN} onClick={() => entry.id !== undefined && onDelete(entry.id)}>
                  {TEXT.removeEntry[lang]}
                </button>
              </div>
            </div>
            <ul className="space-y-1.5">
              {entry.parts.map((p, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <div className="break-all text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {PART_META[lang](pagesLabel(p.pages), p.pages.length, formatBytes(p.bytes.byteLength))}
                    </div>
                  </div>
                  <button type="button" className={`${OUTLINE_BTN} no-underline`} onClick={() => save(p)}>
                    {TEXT.download[lang]}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Section>
  );
}
