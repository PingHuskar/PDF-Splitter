// Standalone app shell: a fixed header with the EN/TH and light/dark toggles (the
// PDFSplitter component's pt-14 leaves room for it), and the tool itself below.
import PDFSplitter from "./Components/PDFSplitter";
import { APP_LANGS, applyLang, useAppLang } from "./Components/Settings/utils/language";
import { useTheme } from "./Components/Settings/utils/theme";

function LangToggle() {
  const lang = useAppLang();
  return (
    <div
      role="group"
      aria-label="Language"
      className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600"
    >
      {APP_LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          aria-pressed={lang === l.code}
          onClick={() => applyLang(l.code)}
          className={
            lang === l.code
              ? "bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
              : "bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          }
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="fixed inset-x-0 top-0 z-[100] flex items-center justify-end gap-2 bg-slate-50/80 px-4 py-3 backdrop-blur dark:bg-slate-950/80">
        <LangToggle />
        <ThemeToggle dark={theme === "dark"} onToggle={toggle} />
      </header>
      <PDFSplitter />
    </div>
  );
}
