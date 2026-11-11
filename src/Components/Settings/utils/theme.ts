// Light/dark theme: saved choice → system preference, applied as a `.dark` class on <html>
// (Tailwind's dark variant is wired to that class in index.css). index.html sets the class
// before first paint so there is no light flash on dark systems.
import { useEffect, useState } from "react";

// Same key ChadinDev's appearance.ts uses, so a saved choice carries over.
const KEY = "themeMode";
export type Theme = "light" | "dark";

const detect = (): Theme => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // private mode etc. — fall through to the system preference
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(detect);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // ignore — the choice just won't persist
    }
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}
