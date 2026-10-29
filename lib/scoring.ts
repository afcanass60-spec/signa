/**
 * Notation d'un essai par comparaison à des signes de référence.
 *
 * Pourquoi pas un classifieur ? Pour apprendre, on ne demande pas « quel signe est-ce ? »
 * mais « à quel point ce geste ressemble-t-il au bon signe, et qu'est-ce qui cloche ? ».
 * On compare donc l'essai à une ou plusieurs références enregistrées (apprentissage
 * « few-shot » : un nouveau signe s'ajoute sans réentraîner aucun modèle).
 *
 * Étapes :
 * 1. on garde la partie de l'enregistrement où les mains sont visibles,
 * 2. on rééchantillonne à RESAMPLE_FRAMES images,
 * 3. on aligne l'essai et la référence dans le temps par DTW (Dynamic Time Warping),
 *    ce qui tolère qu'on signe plus vite ou plus lentement,
 * 4. le long de l'alignement on mesure trois écarts, chacun traduit en note sur 100 :
 *    - Forme   : configuration des doigts (relative au poignet, à l'échelle de la main),
 *    - Position: où se trouve la main par rapport au corps (moyenne du poignet),
 *    - Mouvement: trajectoire du poignet une fois la position moyenne retirée.
 */
import {
  FLAG_LEFT,
  FLAG_RIGHT,
  LEFT_OFFSET,
  N_FEATURES,
  N_HAND_POINTS,
  RIGHT_OFFSET,
} from "./features.ts";

export const RESAMPLE_FRAMES = 30; // identique au projet Python (FRAMES = 30)
export const MIN_ACTIVE_FRAMES = 6;
export const PASS_SCORE = 80;

/**
 * Coût pour lequel une sous-note vaut 50/100. Unités : largeurs d'épaules (position,
 * mouvement) et tailles de main (forme). Valeurs de départ raisonnables, à calibrer
 * avec de vraies données (voir README, section « Calibrer la notation »).
 */
export const HALF_SCORE_COST = { shape: 0.32, position: 0.35, motion: 0.28 };
export const WEIGHTS = { shape: 0.4, position: 0.25, motion: 0.35 };
const MISSING_HAND_COST = 1.0;
const DTW_BAND = 8;

export type Side = "left" | "right";
export type Seq = number[][];

export interface SubScores {
  shape: number;
  position: number;
  motion: number;
}

export interface Feedback {
  kind: "ok" | "shape" | "position" | "motion" | "hands" | "amplitude";
  message: string;
}

export interface ScoreResult {
  score: number;
  sub: SubScores;
  feedback: Feedback[];
  passed: boolean;
  referenceIndex: number;
}

// ---------------------------------------------------------------------------
// Préparation des séquences

/** Garde la portion entre la première et la dernière image où une main est visible. */
export function trimToActive(seq: Seq): Seq | null {
  let first = -1, last = -1;
  seq.forEach((f, i) => {
    if (f[FLAG_LEFT] > 0 || f[FLAG_RIGHT] > 0) {
      if (first < 0) first = i;
      last = i;
    }
  });
  if (first < 0 || last - first + 1 < MIN_ACTIVE_FRAMES) return null;
  return seq.slice(first, last + 1);
}

/** Rééchantillonnage linéaire à n images (les indicateurs de présence au plus proche). */
export function resample(seq: Seq, n = RESAMPLE_FRAMES): Seq {
  if (seq.length === 0) return [];
  const out: Seq = [];
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : (k * (seq.length - 1)) / (n - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, seq.length - 1);
    const w = t - lo;
    const a = seq[lo], b = seq[hi];
    const f = new Array<number>(N_FEATURES);
    for (let j = 0; j < N_FEATURES; j++) f[j] = a[j] * (1 - w) + b[j] * w;
    const near = w < 0.5 ? a : b;
    f[FLAG_LEFT] = near[FLAG_LEFT];
    f[FLAG_RIGHT] = near[FLAG_RIGHT];
    // si une main n'est présente que d'un côté de l'interpolation, on évite de la
    // "tirer" vers l'origine : on prend la valeur de l'image où elle est présente
    for (const [flag, off] of [[FLAG_LEFT, LEFT_OFFSET], [FLAG_RIGHT, RIGHT_OFFSET]] as const) {
      if (a[flag] > 0 !== b[flag] > 0) {
        const src = a[flag] > 0 ? a : b;
        for (let j = 0; j < N_HAND_POINTS * 3; j++) f[off + j] = near[flag] > 0 ? src[off + j] : 0;
      }
    }
    out.push(f);
  }
  return out;
}

/** Enregistrement brut -> séquence prête à comparer (null si on ne voit pas les mains). */
export function prepare(raw: Seq): Seq | null {
  const t = trimToActive(raw);
  return t ? resample(t) : null;
}

// ---------------------------------------------------------------------------
// Descripteurs par main

interface HandFrame {
  wrist: [number, number] | null;
  shape: number[] | null; // 21 × (x, y, z) relatifs au poignet, à l'échelle de la main
}

function handFrame(f: number[], side: Side): HandFrame {
  const flag = side === "left" ? FLAG_LEFT : FLAG_RIGHT;
  if (f[flag] <= 0) return { wrist: null, shape: null };
  const off = side === "left" ? LEFT_OFFSET : RIGHT_OFFSET;
  const wx = f[off], wy = f[off + 1], wz = f[off + 2];
  // taille de main = poignet -> base du majeur (point 9)
  const size = Math.hypot(f[off + 27] - wx, f[off + 28] - wy) || 1;
  const shape = new Array<number>(N_HAND_POINTS * 3);
  for (let i = 0; i < N_HAND_POINTS; i++) {
    shape[i * 3] = (f[off + i * 3] - wx) / size;
    shape[i * 3 + 1] = (f[off + i * 3 + 1] - wy) / size;
    shape[i * 3 + 2] = ((f[off + i * 3 + 2] - wz) / size) * 0.5; // z de MediaPipe est bruité
  }
  return { wrist: [wx, wy], shape };
}

/** Quelles mains la référence utilise réellement (présentes sur ≥ 35 % des images). */
export function handsUsed(seq: Seq): Side[] {
  const used: Side[] = [];
  const ratio = (flag: number) => seq.filter((f) => f[flag] > 0).length / seq.length;
  if (ratio(FLAG_RIGHT) >= 0.35) used.push("right");
  if (ratio(FLAG_LEFT) >= 0.35) used.push("left");
  return used.length ? used : ["right"];
}

function shapeDist(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < N_HAND_POINTS; i++) {
    s += Math.hypot(a[i * 3] - b[i * 3], a[i * 3 + 1] - b[i * 3 + 1], a[i * 3 + 2] - b[i * 3 + 2]);
  }
  return s / N_HAND_POINTS;
}

// ---------------------------------------------------------------------------
// DTW

/** Retourne le chemin d'alignement optimal [(i, j), …] entre deux séquences. */
export function dtwPath(n: number, m: number, cost: (i: number, j: number) => number): [number, number][] {
  const INF = Number.POSITIVE_INFINITY;
  const D = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(INF));
  D[0][0] = 0;
  const band = Math.max(DTW_BAND, Math.abs(n - m));
  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - band), jEnd = Math.min(m, i + band);
    for (let j = jStart; j <= jEnd; j++) {
      D[i][j] = cost(i - 1, j - 1) + Math.min(D[i - 1][j], D[i][j - 1], D[i - 1][j - 1]);
    }
  }
  const path: [number, number][] = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    path.push([i - 1, j - 1]);
    const diag = D[i - 1][j - 1], up = D[i - 1][j], left = D[i][j - 1];
    if (diag <= up && diag <= left) { i--; j--; }
    else if (up <= left) i--;
    else j--;
  }
  return path.reverse();
}

// ---------------------------------------------------------------------------
// Note

const toScore = (cost: number, half: number) => Math.round(100 / (1 + (cost / half) ** 2));

interface Comparison {
  sub: SubScores;
  score: number;
  missingHands: Side[];
  offset: [number, number]; // position moyenne essai - référence (main principale)
  amplitudeRatio: number; // amplitude du mouvement essai / référence
}

function compareOne(attempt: Seq, reference: Seq): Comparison {
  const sides = handsUsed(reference);
  const A = sides.map((s) => attempt.map((f) => handFrame(f, s)));
  const R = sides.map((s) => reference.map((f) => handFrame(f, s)));

  // centres moyens de chaque main (pour séparer position et mouvement)
  const mean = (hf: HandFrame[]): [number, number] | null => {
    const pts = hf.filter((h) => h.wrist).map((h) => h.wrist!);
    if (!pts.length) return null;
    return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  };
  const meanA = A.map(mean), meanR = R.map(mean);

  // coût combiné utilisé pour l'alignement
  const frameCost = (i: number, j: number) => {
    let c = 0;
    for (let h = 0; h < sides.length; h++) {
      const a = A[h][i], r = R[h][j];
      if (!a.wrist || !r.wrist) { c += a.wrist || r.wrist ? MISSING_HAND_COST : 0; continue; }
      c += Math.hypot(a.wrist[0] - r.wrist[0], a.wrist[1] - r.wrist[1]);
      c += shapeDist(a.shape!, r.shape!);
    }
    return c / sides.length;
  };
  const path = dtwPath(attempt.length, reference.length, frameCost);

  let shapeSum = 0, motionSum = 0, nPairs = 0;
  for (const [i, j] of path) {
    for (let h = 0; h < sides.length; h++) {
      const a = A[h][i], r = R[h][j];
      if (!r.wrist) continue;
      if (!a.wrist) { shapeSum += MISSING_HAND_COST; motionSum += MISSING_HAND_COST; nPairs++; continue; }
      shapeSum += shapeDist(a.shape!, r.shape!);
      const ma = meanA[h]!, mr = meanR[h]!;
      motionSum += Math.hypot(a.wrist[0] - ma[0] - (r.wrist[0] - mr[0]), a.wrist[1] - ma[1] - (r.wrist[1] - mr[1]));
      nPairs++;
    }
  }
  const shapeCost = nPairs ? shapeSum / nPairs : MISSING_HAND_COST;
  const motionCost = nPairs ? motionSum / nPairs : MISSING_HAND_COST;

  let posCost = 0;
  const missingHands: Side[] = [];
  sides.forEach((s, h) => {
    if (!meanA[h]) { missingHands.push(s); posCost += MISSING_HAND_COST; return; }
    posCost += Math.hypot(meanA[h]![0] - meanR[h]![0], meanA[h]![1] - meanR[h]![1]);
  });
  posCost /= sides.length;

  const sub: SubScores = {
    shape: toScore(shapeCost, HALF_SCORE_COST.shape),
    position: toScore(posCost, HALF_SCORE_COST.position),
    motion: toScore(motionCost, HALF_SCORE_COST.motion),
  };
  const score = Math.round(sub.shape * WEIGHTS.shape + sub.position * WEIGHTS.position + sub.motion * WEIGHTS.motion);

  const main = 0; // main principale = première de la liste (droite si utilisée)
  const offset: [number, number] = meanA[main] && meanR[main]
    ? [meanA[main]![0] - meanR[main]![0], meanA[main]![1] - meanR[main]![1]]
    : [0, 0];
  const spread = (hf: HandFrame[], m: [number, number] | null) => {
    if (!m) return 0;
    const pts = hf.filter((x) => x.wrist);
    return pts.reduce((s, x) => s + Math.hypot(x.wrist![0] - m[0], x.wrist![1] - m[1]), 0) / (pts.length || 1);
  };
  const ampR = spread(R[main], meanR[main]);
  const ampA = spread(A[main], meanA[main]);
  const amplitudeRatio = ampR > 0.05 ? ampA / ampR : 1;

  return { sub, score, missingHands, offset, amplitudeRatio };
}

function buildFeedback(c: Comparison): Feedback[] {
  const fb: Feedback[] = [];
  if (c.missingHands.length) {
    fb.push({
      kind: "hands",
      message: c.missingHands.length === 2
        ? "Je ne vois pas tes mains. Place-les bien dans le cadre."
        : "Ce signe se fait à deux mains : je n'en vois qu'une.",
    });
  }
  if (c.sub.shape < 65) {
    fb.push({ kind: "shape", message: "La forme de ta main ne correspond pas encore. Observe bien la position des doigts dans l'animation." });
  }
  if (c.sub.position < 65 && !c.missingHands.length) {
    const [dx, dy] = c.offset;
    const parts: string[] = [];
    if (Math.abs(dy) > 0.15) parts.push(dy < 0 ? "trop haute" : "trop basse");
    if (Math.abs(dx) > 0.15) parts.push(dx > 0 ? "trop à droite" : "trop à gauche");
    fb.push({
      kind: "position",
      message: parts.length
        ? `Ta main est ${parts.join(" et ")} par rapport au modèle.`
        : "Ta main n'est pas au bon endroit par rapport à ton corps.",
    });
  }
  if (c.sub.motion < 65) {
    if (c.amplitudeRatio < 0.6) fb.push({ kind: "amplitude", message: "Fais un mouvement plus ample." });
    else if (c.amplitudeRatio > 1.6) fb.push({ kind: "amplitude", message: "Ton mouvement est trop ample : fais-le plus petit." });
    else fb.push({ kind: "motion", message: "Le mouvement n'est pas encore le bon. Suis bien la trajectoire de l'animation." });
  }
  if (c.score >= PASS_SCORE) fb.unshift({ kind: "ok", message: "Bravo, signe validé !" });
  else if (!fb.length) fb.push({ kind: "motion", message: "Presque ! Refais le signe un peu plus précisément." });
  return fb;
}

/** Note un essai contre toutes les références disponibles et garde la meilleure. */
export function scoreAttempt(attempt: Seq, references: Seq[]): ScoreResult | null {
  if (!references.length) return null;
  let best: Comparison | null = null, bestIdx = 0;
  references.forEach((ref, k) => {
    const c = compareOne(attempt, ref);
    if (!best || c.score > best.score) { best = c; bestIdx = k; }
  });
  const c = best!;
  return { score: c.score, sub: c.sub, feedback: buildFeedback(c), passed: c.score >= PASS_SCORE, referenceIndex: bestIdx };
}
