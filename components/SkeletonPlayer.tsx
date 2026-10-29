"use client";
/** Rejoue une séquence enregistrée sous forme de squelette animé (en boucle). */
import { useEffect, useRef } from "react";
import { drawNormalized, fitView, themePalette, type View } from "@/lib/draw";

export function SkeletonPlayer({
  frames,
  ghost,
  fps = 20,
  label,
}: {
  frames: number[][];
  /** Séquence affichée en transparence par-dessus (ex. : l'essai de l'élève). */
  ghost?: number[][] | null;
  fps?: number;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !frames.length) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    let view: View = fitView([frames], 1, 1);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      view = fitView(ghost?.length ? [frames, ghost] : [frames], canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const palette = themePalette();
    const ghostPalette = { body: palette.body, left: palette.body, right: palette.body };
    let i = 0, last = 0, raf = 0, pause = 0;
    const hold = 12; // petite pause à la fin de chaque boucle

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 1000 / fps) return;
      last = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const k = Math.min(i, frames.length - 1);
      if (ghost?.length) drawNormalized(ctx, ghost[Math.min(k, ghost.length - 1)], ghostPalette, { alpha: 0.35, view });
      drawNormalized(ctx, frames[k], palette, { view });
      if (reduce) return;
      if (i >= frames.length - 1) {
        if (++pause > hold) { i = 0; pause = 0; }
      } else i++;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [frames, ghost, fps]);

  return (
    <div className="relative w-full aspect-[4/3] max-w-full rounded-[20px] bg-surface-2 overflow-hidden">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-label={label ?? "Animation du signe"} role="img" />
      {label && <span className="absolute left-3 top-3 label">{label}</span>}
    </div>
  );
}
