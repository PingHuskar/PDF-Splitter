// PDFSplitter signature pad: draw a signature with mouse, pen or finger; "Use" turns the
// strokes into a transparent PNG data URL — the same stamp format as an uploaded image.
import { useRef, useState, type PointerEvent } from "react";
import { TEXT, type Lang } from "./data";
import { OUTLINE_BTN, PRIMARY_BTN } from "./ui";

export default function SignaturePad({
  lang,
  onDone,
  onCancel,
}: {
  lang: Lang;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    // Canvas pixels are fixed; CSS scales it — convert the pointer to canvas coordinates.
    return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
  };

  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = pos(e);
    canvasRef.current!.getContext("2d")!.lineTo(x, y);
    canvasRef.current!.getContext("2d")!.stroke();
    setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const use = () => {
    onDone(canvasRef.current!.toDataURL("image/png"));
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={640}
        height={200}
        className="h-28 w-full touch-none rounded-lg border border-dashed border-slate-400 bg-white dark:border-slate-500"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex gap-2">
        <button type="button" className={PRIMARY_BTN} disabled={!hasInk} onClick={use}>
          {TEXT.padUse[lang]}
        </button>
        <button type="button" className={OUTLINE_BTN} onClick={clear}>
          {TEXT.padClear[lang]}
        </button>
        <button type="button" className={OUTLINE_BTN} onClick={onCancel}>
          {TEXT.padCancel[lang]}
        </button>
      </div>
    </div>
  );
}
