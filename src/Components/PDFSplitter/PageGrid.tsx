// PDFSplitter page map: one small page preview per page (rendered with pdf.js), ringed by the
// colour of the file it goes to and see-through when it is not printed. Move pages by
// drag-and-drop, right-click menu, or select-then-click-a-file (the way that works on touch
// screens); the same menu and chips rotate pages 90° left/right or 180°.
import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { FILE_COLORS, FILE_NAME, FILE_RINGS, PAGE_TITLE, ROTATED, SELECTED, TEXT, type Lang } from "./data";
import { filePages, rotationOf, type Assignment, type Rotations, type Target } from "./logic";
import type { Thumbs } from "./thumbs";

const CHIP =
  "flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
const MENU_ITEM =
  "flex w-full items-center gap-2 bg-transparent px-3 py-1.5 text-left text-sm text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800";
const EMPTY_DOT = "border border-dashed border-slate-400 bg-transparent dark:border-slate-500";
const SQUARE_OFF = "border border-dashed border-slate-300 bg-transparent text-slate-400 dark:border-slate-600 dark:text-slate-500";

const fileColor = (g: number) => FILE_COLORS[g % FILE_COLORS.length];
const fileRing = (g: number) => FILE_RINGS[g % FILE_RINGS.length];

function Dot({ group }: { group: number | null }) {
  return <span className={`inline-block h-3 w-3 shrink-0 rounded-sm ${group === null ? EMPTY_DOT : fileColor(group)}`} />;
}

type Menu = { x: number; y: number; pages: number[] };

export default function PageGrid({
  lang,
  assign,
  rots,
  thumbs,
  onMove,
  onRotate,
}: {
  lang: Lang;
  assign: Assignment;
  rots: Rotations;
  thumbs: Thumbs;
  onMove: (pages: number[], target: Target) => void;
  onRotate: (pages: number[], delta: number) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const dragging = useRef<number[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const files = filePages(assign);
  const offCount = assign.filter((g) => g === null).length;

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  // Acting on a selected square acts on the whole selection; otherwise just that square.
  const affected = (i: number) => (selected.has(i) ? [...selected] : [i]);

  const move = (pages: number[], target: Target) => {
    setMenu(null);
    if (pages.length === 0) return;
    onMove(pages, target);
    setSelected(new Set());
    setAnchor(null);
  };

  const rotate = (pages: number[], delta: number) => {
    setMenu(null);
    if (pages.length === 0) return;
    onRotate(pages, delta);
    setSelected(new Set());
    setAnchor(null);
  };

  // The three turns offered in the chips and the right-click menu, in display order.
  const TURNS: { key: string; delta: number; label: string }[] = [
    { key: "right", delta: 90, label: TEXT.rotateRight[lang] },
    { key: "left", delta: -90, label: TEXT.rotateLeft[lang] },
    { key: "half", delta: 180, label: TEXT.rotate180[lang] },
  ];

  const toggle = (i: number, shift: boolean) => {
    const next = new Set(selected);
    if (shift && anchor !== null) {
      for (let p = Math.min(anchor, i); p <= Math.max(anchor, i); p++) next.add(p);
    } else if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
    setAnchor(i);
  };

  const dropOn = (target: Target) => ({
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      move(dragging.current, target);
      dragging.current = [];
    },
  });

  const openMenu = (e: MouseEvent, i: number) => {
    e.preventDefault();
    setMenu({
      x: Math.max(8, Math.min(e.clientX, window.innerWidth - 200)),
      y: Math.max(8, Math.min(e.clientY, window.innerHeight - 300)),
      pages: affected(i),
    });
  };

  const where = (g: number | null) => (g === null ? TEXT.notPrinted[lang] : FILE_NAME[lang](g + 1));
  // Every place pages can go, in the order shown in the legend and the menu.
  const targets: { key: string; target: Target; group: number | null; label: string; count?: number }[] = [
    ...files.map((pages, g) => ({ key: `f${g}`, target: g, group: g, label: FILE_NAME[lang](g + 1), count: pages.length })),
    { key: "off", target: null, group: null, label: TEXT.notPrinted[lang], count: offCount },
  ];

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{TEXT.mapLabel[lang]}</div>
      <p className="text-xs text-slate-600 dark:text-slate-400">{TEXT.mapHint[lang]}</p>

      <div className="flex max-h-80 flex-wrap gap-1 overflow-y-auto rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
        {assign.map((g, i) => {
          const deg = rotationOf(rots, i);
          const thumb = thumbs[i];
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              draggable
              aria-pressed={selected.has(i)}
              title={deg ? `${PAGE_TITLE[lang](i + 1, where(g))} · ${ROTATED[lang](deg)}` : PAGE_TITLE[lang](i + 1, where(g))}
              onClick={(e) => toggle(i, e.shiftKey)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggle(i, e.shiftKey);
                }
              }}
              onContextMenu={(e) => openMenu(e, i)}
              onDragStart={(e) => {
                dragging.current = affected(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i + 1));
              }}
              {...dropOn(g)}
              className={`relative h-14 w-11 shrink-0 cursor-grab select-none overflow-hidden rounded text-[11px] font-medium ${
                g === null ? SQUARE_OFF : thumb ? `ring-2 ${fileRing(g)}` : `${fileColor(g)} text-white`
              } ${
                selected.has(i) ? "outline-2 outline-offset-1 outline-slate-900 dark:outline-white" : ""
              }`}
            >
              {/* Fallback number (visible until the preview arrives) and the always-on badge. */}
              <span className="flex h-full w-full items-center justify-center">{i + 1}</span>
              {thumb && (
                <img
                  src={thumb}
                  alt=""
                  draggable={false}
                  className={`pointer-events-none absolute inset-0 h-full w-full object-cover object-top ${
                    g === null ? "opacity-40" : ""
                  }`}
                  style={deg ? { transform: `rotate(${deg}deg)${deg % 180 !== 0 ? " scale(1.3)" : ""}` } : undefined}
                />
              )}
              <span className="absolute right-0.5 bottom-0.5 rounded-sm bg-slate-900/75 px-0.5 text-[9px] leading-4 font-medium text-white">
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {thumbs.filter(Boolean).length < assign.length && (
        <p className="text-xs text-slate-600 dark:text-slate-400">{TEXT.thumbsLoading[lang]}</p>
      )}

      {selected.size > 0 && <p className="text-xs text-blue-700 dark:text-blue-300">{SELECTED[lang](selected.size)}</p>}

      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
        {targets.map((t) => (
          <button key={t.key} type="button" className={CHIP} onClick={() => move([...selected], t.target)} {...dropOn(t.target)}>
            <Dot group={t.group} />
            {t.label} ({t.count})
          </button>
        ))}
        <button type="button" className={CHIP} onClick={() => move([...selected], "new")} {...dropOn("new")}>
          {TEXT.newFile[lang]}
        </button>
        {selected.size > 0 &&
          TURNS.map((t) => (
            <button key={t.key} type="button" className={CHIP} onClick={() => rotate([...selected], t.delta)}>
              <span style={{ transform: `rotate(${t.delta}deg)`, display: "inline-block" }}>⟳</span>
              {t.label}
            </button>
          ))}
      </div>

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-[1000] max-h-72 w-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400">{TEXT.moveTo[lang]}</div>
          {targets.map((t) => (
            <button key={t.key} type="button" role="menuitem" className={MENU_ITEM} onClick={() => move(menu.pages, t.target)}>
              <Dot group={t.group} />
              {t.label}
            </button>
          ))}
          <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => move(menu.pages, "new")}>
            {TEXT.newFile[lang]}
          </button>
          <div className="px-3 pb-1 pt-1 text-xs text-slate-500 dark:text-slate-400">{TEXT.rotate[lang]}</div>
          {TURNS.map((t) => (
            <button key={t.key} type="button" role="menuitem" className={MENU_ITEM} onClick={() => rotate(menu.pages, t.delta)}>
              <span style={{ transform: `rotate(${t.delta}deg)`, display: "inline-block" }}>⟳</span>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
