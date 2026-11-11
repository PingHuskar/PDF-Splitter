import { useEffect, useSyncExternalStore } from "react";

/**
 * Site-wide UI language, switched from the globe button (LanguageSwitcher) in
 * the top-right corner of every page. Bilingual pages read it with
 * `useAppLang()` instead of keeping their own language state.
 */
export type AppLang = "en" | "th";

export const APP_LANGS: { code: AppLang; label: string; short: string }[] = [
    { code: "en", label: "English", short: "EN" },
    { code: "th", label: "ไทย", short: "TH" },
];

export const LANGUAGE_EVENT = "app-language-changed";
const STORAGE_KEY = "appLang";

export function activeLang(): AppLang {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "en" || saved === "th") return saved;
    } catch { /* private mode */ }
    return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("th") ? "th" : "en";
}

/** Persists the language, mirrors it on <html lang>, and notifies subscribers. */
export function applyLang(lang: AppLang): void {
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: lang }));
}

export function subscribeLang(onChange: () => void): () => void {
    const notify = () => onChange();
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) notify(); };
    window.addEventListener(LANGUAGE_EVENT, notify);
    window.addEventListener("storage", onStorage);
    return () => {
        window.removeEventListener(LANGUAGE_EVENT, notify);
        window.removeEventListener("storage", onStorage);
    };
}

// How many mounted components translate themselves, so the switcher can tell
// visitors when the current page has only one language.
let translatedCount = 0;
const TRANSLATED_EVENT = "app-language-translated-count";

function subscribeTranslated(onChange: () => void): () => void {
    window.addEventListener(TRANSLATED_EVENT, onChange);
    return () => window.removeEventListener(TRANSLATED_EVENT, onChange);
}

/** True while at least one mounted component uses `useAppLang()`. */
export function useHasTranslatedPage(): boolean {
    return useSyncExternalStore(subscribeTranslated, () => translatedCount > 0);
}

/** The current site language. Calling it also marks the page as translated. */
export function useAppLang(): AppLang {
    useEffect(() => {
        translatedCount++;
        window.dispatchEvent(new Event(TRANSLATED_EVENT));
        return () => {
            translatedCount--;
            window.dispatchEvent(new Event(TRANSLATED_EVENT));
        };
    }, []);
    return useSyncExternalStore(subscribeLang, activeLang);
}
