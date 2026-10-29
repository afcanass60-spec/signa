/**
 * Points clés -> vecteur de features normalisé.
 *
 * C'est exactement la même normalisation que dans le projet Python (src/landmarks.py),
 * pour que les données enregistrées dans l'app puissent servir à entraîner le modèle GRU.
 *
 * Disposition du vecteur (203 valeurs par image) :
 *   [0..74]     25 points du haut du corps × (x, y, z)
 *   [75..137]   main gauche, 21 points × (x, y, z)
 *   [138..200]  main droite, 21 points × (x, y, z)
 *   [201]       main gauche visible (0/1)
 *   [202]       main droite visible (0/1)
 *
 * Repère : origine au milieu des épaules, unité = largeur d'épaules.
 * -> invariant à la position dans l'image et à la distance à la caméra.
 */

export type Point3 = [number, number, number];

/** Points bruts d'une image, coordonnées 0-1 dans l'image VUE EN MIROIR. */
export interface RawFrame {
  pose: Point3[] | null; // 33 points
  left: Point3[] | null; // 21 points, main gauche de la personne
  right: Point3[] | null; // 21 points, main droite de la personne
}

export const N_POSE_POINTS = 25;
export const N_HAND_POINTS = 21;
export const POSE_OFFSET = 0;
export const LEFT_OFFSET = N_POSE_POINTS * 3; // 75
export const RIGHT_OFFSET = LEFT_OFFSET + N_HAND_POINTS * 3; // 138
export const FLAG_LEFT = RIGHT_OFFSET + N_HAND_POINTS * 3; // 201
export const FLAG_RIGHT = FLAG_LEFT + 1; // 202
export const N_FEATURES = FLAG_RIGHT + 1; // 203

const L_SHOULDER = 11;
const R_SHOULDER = 12;

export function extractFeatures(frame: RawFrame): number[] {
  const out = new Array<number>(N_FEATURES).fill(0);
  let cx = 0, cy = 0, cz = 0, scale = 1;

  if (frame.pose) {
    const l = frame.pose[L_SHOULDER];
    const r = frame.pose[R_SHOULDER];
    cx = (l[0] + r[0]) / 2;
    cy = (l[1] + r[1]) / 2;
    cz = (l[2] + r[2]) / 2;
    const s = Math.hypot(l[0] - r[0], l[1] - r[1]);
    scale = s > 1e-4 ? s : 1;
    for (let i = 0; i < N_POSE_POINTS; i++) writePoint(out, POSE_OFFSET + i * 3, frame.pose[i]);
  }

  function writePoint(arr: number[], at: number, p: Point3) {
    arr[at] = (p[0] - cx) / scale;
    arr[at + 1] = (p[1] - cy) / scale;
    arr[at + 2] = (p[2] - cz) / scale;
  }

  if (frame.left) {
    for (let i = 0; i < N_HAND_POINTS; i++) writePoint(out, LEFT_OFFSET + i * 3, frame.left[i]);
    out[FLAG_LEFT] = 1;
  }
  if (frame.right) {
    for (let i = 0; i < N_HAND_POINTS; i++) writePoint(out, RIGHT_OFFSET + i * 3, frame.right[i]);
    out[FLAG_RIGHT] = 1;
  }
  return out;
}

export function handsVisible(f: number[]): boolean {
  return f[FLAG_LEFT] > 0 || f[FLAG_RIGHT] > 0;
}

/** Récupère les 21 points d'une main dans un vecteur de features (null si absente). */
export function handPoints(f: number[], side: "left" | "right"): Point3[] | null {
  const flag = side === "left" ? FLAG_LEFT : FLAG_RIGHT;
  if (f[flag] <= 0) return null;
  const off = side === "left" ? LEFT_OFFSET : RIGHT_OFFSET;
  const pts: Point3[] = [];
  for (let i = 0; i < N_HAND_POINTS; i++) pts.push([f[off + i * 3], f[off + i * 3 + 1], f[off + i * 3 + 2]]);
  return pts;
}

export function posePoints(f: number[]): Point3[] {
  const pts: Point3[] = [];
  for (let i = 0; i < N_POSE_POINTS; i++) pts.push([f[i * 3], f[i * 3 + 1], f[i * 3 + 2]]);
  return pts;
}

/**
 * Miroir gauche/droite pour les gauchers : on échange les deux mains et on inverse l'axe x.
 * Une personne gauchère est ainsi comparée correctement à une référence faite par un droitier.
 */
export function mirrorFeatures(f: number[]): number[] {
  const out = f.slice();
  for (let i = 0; i < N_POSE_POINTS; i++) out[i * 3] = -f[i * 3];
  for (let i = 0; i < N_HAND_POINTS * 3; i++) {
    const isX = i % 3 === 0;
    out[LEFT_OFFSET + i] = isX ? -f[RIGHT_OFFSET + i] : f[RIGHT_OFFSET + i];
    out[RIGHT_OFFSET + i] = isX ? -f[LEFT_OFFSET + i] : f[LEFT_OFFSET + i];
  }
  out[FLAG_LEFT] = f[FLAG_RIGHT];
  out[FLAG_RIGHT] = f[FLAG_LEFT];
  return out;
}

/** Arrondit pour stocker léger (4 décimales suffisent largement). */
export function compact(seq: number[][]): number[][] {
  return seq.map((f) => f.map((v) => Math.round(v * 1e4) / 1e4));
}
