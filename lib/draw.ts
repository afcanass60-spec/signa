/** Dessin du squelette sur un canvas (vidéo en direct et animation des références). */
import { handPoints, posePoints, type Point3, type RawFrame } from "./features.ts";

export const HAND_LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];
export const POSE_LINKS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
];

export interface Palette {
  body: string;
  left: string;
  right: string;
}

type XY = [number, number];

function drawSet(ctx: CanvasRenderingContext2D, pts: XY[], links: [number, number][], color: string, width: number, dot: number) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  for (const [a, b] of links) {
    if (!pts[a] || !pts[b]) continue;
    ctx.beginPath();
    ctx.moveTo(pts[a][0], pts[a][1]);
    ctx.lineTo(pts[b][0], pts[b][1]);
    ctx.stroke();
  }
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], dot, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Points bruts (0-1, image en miroir) par-dessus la vidéo. */
export function drawRaw(ctx: CanvasRenderingContext2D, f: RawFrame, pal: Palette) {
  const { width: w, height: h } = ctx.canvas;
  const px = (pts: Point3[]): XY[] => pts.map((p) => [p[0] * w, p[1] * h]);
  const s = Math.max(1.5, w / 400);
  if (f.pose) drawSet(ctx, px(f.pose), POSE_LINKS, pal.body, s * 1.5, s * 1.2);
  if (f.left) drawSet(ctx, px(f.left), HAND_LINKS, pal.left, s, s * 1.4);
  if (f.right) drawSet(ctx, px(f.right), HAND_LINKS, pal.right, s, s * 1.4);
}

/**
 * Une image normalisée (repère épaules) dessinée au centre du canvas.
 * `unit` = taille d'une largeur d'épaules en pixels.
 */
export interface View {
  ox: number;
  oy: number;
  unit: number;
}

/**
 * Cadrage automatique : englobe la tête, les épaules et les mains sur toute la séquence,
 * pour que le signe occupe bien le cadre quelle que soit son amplitude.
 */
export function fitView(seqs: number[][][], w: number, h: number): View {
  let minX = -0.9, maxX = 0.9, minY = -1.3, maxY = 0.6; // cadre minimal autour du buste
  for (const seq of seqs) {
    for (const f of seq) {
      const pts = [...posePoints(f).slice(0, 17), ...(handPoints(f, "left") ?? []), ...(handPoints(f, "right") ?? [])];
      for (const p of pts) {
        if (p[0] === 0 && p[1] === 0) continue;
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      }
    }
  }
  const pad = 0.25;
  minX -= pad; maxX += pad; minY -= pad; maxY += pad;
  const unit = Math.min(w / (maxX - minX), h / (maxY - minY));
  return { unit, ox: w / 2 - ((minX + maxX) / 2) * unit, oy: h / 2 - ((minY + maxY) / 2) * unit };
}

export function drawNormalized(ctx: CanvasRenderingContext2D, f: number[], pal: Palette, opts: { view?: View; alpha?: number } = {}) {
  const { width: w, height: h } = ctx.canvas;
  const { unit, ox, oy } = opts.view ?? { unit: w / 4, ox: w / 2, oy: h * 0.6 };
  const px = (pts: Point3[]): XY[] => pts.map((p) => [ox + p[0] * unit, oy + p[1] * unit]);
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  const s = Math.max(1.5, w / 260);
  const pose = posePoints(f);
  // le visage n'est pas affiché en entier : juste un repère pour la tête
  const nose = pose[0];
  if (Math.abs(nose[0]) + Math.abs(nose[1]) > 0) {
    ctx.strokeStyle = pal.body;
    ctx.lineWidth = s * 1.5;
    ctx.beginPath();
    ctx.arc(ox + nose[0] * unit, oy + nose[1] * unit, unit * 0.32, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawSet(ctx, px(pose), POSE_LINKS, pal.body, s * 2, 0);
  const l = handPoints(f, "left"), r = handPoints(f, "right");
  if (l) drawSet(ctx, px(l), HAND_LINKS, pal.left, s, s * 1.3);
  if (r) drawSet(ctx, px(r), HAND_LINKS, pal.right, s, s * 1.3);
  ctx.restore();
}

/** Lit les couleurs du thème (variables CSS) pour que les canvas suivent le mode sombre. */
export function themePalette(): Palette {
  if (typeof window === "undefined") return { body: "#888", left: "#e8590c", right: "#3b5bdb" };
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return { body: v("--skeleton", "#8a94a6"), left: v("--hand-left", "#e8590c"), right: v("--hand-right", "#3b5bdb") };
}
