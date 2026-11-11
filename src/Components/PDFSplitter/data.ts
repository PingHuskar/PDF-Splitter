// PDFSplitter content: all EN/TH text, the split modes and the error messages.
// The splitting itself runs in the browser (split.ts); nothing is uploaded to a server.
import type { RangeError } from "./logic";

export type Lang = "en" | "th";
export type L = Record<Lang, string>;

export const TEXT = {
  title: { en: "PDF Splitter", th: "แยกไฟล์ PDF" },
  intro: {
    en: "Upload a PDF, choose how to cut it, and download the pieces. Everything happens in your browser — the file never leaves your device.",
    th: "อัปโหลดไฟล์ PDF เลือกวิธีแบ่ง แล้วดาวน์โหลดไฟล์ที่แยกออกมา ทุกอย่างทำในเบราว์เซอร์ของคุณ ไฟล์ไม่ถูกส่งออกจากเครื่อง",
  },
  uploadTitle: { en: "1. Upload", th: "1. อัปโหลด" },
  drop: { en: "Drop a PDF here, or click to choose a file", th: "ลากไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์" },
  reading: { en: "Reading the file…", th: "กำลังอ่านไฟล์…" },
  change: { en: "Choose another file", th: "เลือกไฟล์อื่น" },
  splitTitle: { en: "2. Choose how to split", th: "2. เลือกวิธีแบ่ง" },
  rangesLabel: { en: "Page ranges", th: "ช่วงหน้า" },
  rangesHint: {
    en: "Separate with commas — each part becomes one file. “8-” means page 8 to the end.",
    th: "คั่นด้วยจุลภาค แต่ละช่วงจะได้ไฟล์ 1 ไฟล์ เช่น “8-” หมายถึงหน้า 8 ถึงหน้าสุดท้าย",
  },
  everyLabel: { en: "Pages per file", th: "จำนวนหน้าต่อไฟล์" },
  eachHint: { en: "Every page becomes its own file.", th: "ทุกหน้าจะถูกแยกเป็นไฟล์ของตัวเอง" },
  mapLabel: { en: "Page map", th: "แผนผังหน้า" },
  mapHint: {
    en: "One square is one page; the colour shows which file it goes to, and a see-through square is not printed. Drag a square onto a file or another square, or right-click it, to move or rotate it. Click squares (Shift-click for a run) to move or rotate several at once.",
    th: "1 ช่อง คือ 1 หน้า สีบอกว่าหน้านั้นอยู่ไฟล์ไหน ช่องโปร่งใสคือหน้าที่ไม่พิมพ์ ลากช่องไปวางบนไฟล์หรือช่องอื่น หรือคลิกขวา เพื่อย้ายหรือหมุน คลิกเลือกหลายช่อง (กด Shift ค้างเพื่อเลือกเป็นช่วง) แล้วย้ายหรือหมุนพร้อมกันได้",
  },
  newFile: { en: "+ New file", th: "+ ไฟล์ใหม่" },
  notPrinted: { en: "Not printed", th: "ไม่พิมพ์" },
  moveTo: { en: "Move to", th: "ย้ายไปที่" },
  rotate: { en: "Rotate", th: "หมุน" },
  rotateRight: { en: "Rotate 90° right", th: "หมุนขวา 90°" },
  rotateLeft: { en: "Rotate 90° left", th: "หมุนซ้าย 90°" },
  rotate180: { en: "Rotate 180°", th: "หมุน 180°" },
  nothing: { en: "Every page is marked not printed.", th: "ทุกหน้าถูกตั้งเป็นไม่พิมพ์" },
  split: { en: "Split PDF", th: "แยกไฟล์ PDF" },
  splitting: { en: "Splitting…", th: "กำลังแยกไฟล์…" },
  resultTitle: { en: "3. Download", th: "3. ดาวน์โหลด" },
  download: { en: "Download", th: "ดาวน์โหลด" },
  downloadAll: { en: "Download all", th: "ดาวน์โหลดทั้งหมด" },
  notPdf: { en: "That file is not a PDF.", th: "ไฟล์นี้ไม่ใช่ PDF" },
  loadFailed: {
    en: "Could not read this PDF. It may be damaged or password-protected.",
    th: "อ่านไฟล์ PDF นี้ไม่ได้ ไฟล์อาจเสียหายหรือมีรหัสผ่านป้องกันอยู่",
  },
  splitFailed: { en: "Something went wrong while splitting the file.", th: "เกิดข้อผิดพลาดระหว่างแยกไฟล์" },
  restored: {
    en: "Continuing where you left off — your last file and settings were restored.",
    th: "เริ่มต่อจากเดิม — เรียกคืนไฟล์และการตั้งค่าล่าสุดของคุณแล้ว",
  },
  historyTitle: { en: "History", th: "ประวัติ" },
  clearHistory: { en: "Clear history", th: "ล้างประวัติ" },
  removeEntry: { en: "Delete", th: "ลบ" },
  thumbsLoading: { en: "Rendering page previews…", th: "กำลังสร้างภาพตัวอย่างหน้า…" },
  markTitle: { en: "Watermark & signature", th: "ลายน้ำและลายเซ็น" },
  markHint: {
    en: "Stamped on every page of every file. The text runs diagonally across the page; the signature sits in the bottom-right corner.",
    th: "ประทับบนทุกหน้าของทุกไฟล์ ข้อความจะเป็นแนวทแยงกลางหน้า ลายเซ็นอยู่มุมล่างขวา",
  },
  watermarkLabel: { en: "Watermark text", th: "ข้อความลายน้ำ" },
  watermarkPlaceholder: { en: "CONFIDENTIAL", th: "ลับ" },
  opacityLabel: { en: "Watermark opacity", th: "ความทึบลายน้ำ" },
  signatureLabel: { en: "Signature", th: "ลายเซ็น" },
  uploadImage: { en: "Upload image", th: "เลือกรูปภาพ" },
  drawSignature: { en: "Draw", th: "วาด" },
  removeMark: { en: "Remove", th: "ลบ" },
  padUse: { en: "Use signature", th: "ใช้ลายเซ็นนี้" },
  padClear: { en: "Clear", th: "ล้าง" },
  padCancel: { en: "Cancel", th: "ยกเลิก" },
  notImage: { en: "That file is not an image.", th: "ไฟล์นี้ไม่ใช่รูปภาพ" },
} satisfies Record<string, L>;

export const MODES = {
  ranges: { en: "By page ranges", th: "ตามช่วงหน้า" },
  every: { en: "Every N pages", th: "ทุก ๆ N หน้า" },
  each: { en: "Every page", th: "ทุกหน้า" },
} satisfies Record<string, L>;
export type ModeId = keyof typeof MODES;
export const MODE_IDS = Object.keys(MODES) as ModeId[];

export const DEFAULT_EVERY = 2;

export const RANGE_ERRORS: Record<RangeError, Record<Lang, (token: string, pages: number) => string>> = {
  empty: {
    en: () => "Type at least one page or range, e.g. 1-3, 5.",
    th: () => "พิมพ์หน้าหรือช่วงหน้าอย่างน้อยหนึ่งรายการ เช่น 1-3, 5",
  },
  invalid: {
    en: (token) => `“${token}” is not a valid page or range.`,
    th: (token) => `“${token}” ไม่ใช่หน้าหรือช่วงหน้าที่ถูกต้อง`,
  },
  outOfBounds: {
    en: (token, pages) => `“${token}” is outside this document (pages 1–${pages}).`,
    th: (token, pages) => `“${token}” อยู่นอกเอกสารนี้ (หน้า 1–${pages})`,
  },
};

export const SUMMARY: Record<Lang, (name: string, pages: number, size: string) => string> = {
  en: (name, pages, size) => `${name} — ${pages} ${pages === 1 ? "page" : "pages"}, ${size}`,
  th: (name, pages, size) => `${name} — ${pages} หน้า, ${size}`,
};

export const PLAN: Record<Lang, (files: number) => string> = {
  en: (files) => `This will create ${files} ${files === 1 ? "file" : "files"}.`,
  th: (files) => `จะได้ไฟล์ทั้งหมด ${files} ไฟล์`,
};

export const PART_META: Record<Lang, (label: string, pages: number, size: string) => string> = {
  en: (label, pages, size) => `${pages === 1 ? "Page" : "Pages"} ${label} · ${size}`,
  th: (label, pages, size) => `หน้า ${label} · ${pages} หน้า · ${size}`,
};

// One colour per output file, reused in order when there are more files than colours.
export const FILE_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-violet-600",
  "bg-cyan-600", "bg-orange-600", "bg-lime-600", "bg-fuchsia-600", "bg-teal-600",
];

// The same colours as rings, for squares that show a page preview instead of a solid fill.
export const FILE_RINGS = [
  "ring-blue-600", "ring-emerald-600", "ring-amber-600", "ring-rose-600", "ring-violet-600",
  "ring-cyan-600", "ring-orange-600", "ring-lime-600", "ring-fuchsia-600", "ring-teal-600",
];

export const FILE_NAME: Record<Lang, (n: number) => string> = {
  en: (n) => `File ${n}`,
  th: (n) => `ไฟล์ ${n}`,
};

export const PAGE_TITLE: Record<Lang, (page: number, where: string) => string> = {
  en: (page, where) => `Page ${page} · ${where}`,
  th: (page, where) => `หน้า ${page} · ${where}`,
};

export const SELECTED: Record<Lang, (n: number) => string> = {
  en: (n) => `${n} selected — click a file below to move ${n === 1 ? "it" : "them"}.`,
  th: (n) => `เลือกอยู่ ${n} หน้า คลิกไฟล์ด้านล่างเพื่อย้าย`,
};

export const ROTATED: Record<Lang, (deg: number) => string> = {
  en: (deg) => `rotated ${deg}°`,
  th: (deg) => `หมุน ${deg}°`,
};

export const HISTORY_META: Record<Lang, (date: string, source: string, parts: number) => string> = {
  en: (date, source, parts) => `${date} — ${source} → ${parts} ${parts === 1 ? "file" : "files"}`,
  th: (date, source, parts) => `${date} — ${source} → ${parts} ไฟล์`,
};
