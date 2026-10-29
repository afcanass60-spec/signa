/**
 * Tests du moteur de notation sur des signes synthétiques.
 * Lancer : npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFeatures, mirrorFeatures, type Point3, type RawFrame } from "../lib/features.ts";
import { prepare, scoreAttempt, resample, trimToActive, PASS_SCORE } from "../lib/scoring.ts";

// petit générateur pseudo-aléatoire déterministe
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function pose(): Point3[] {
  const p: Point3[] = Array.from({ length: 33 }, () => [0.5, 0.5, 0] as Point3);
  p[11] = [0.6, 0.55, 0];
  p[12] = [0.4, 0.55, 0];
  return p;
}

type Shape = "open" | "fist";
function hand(cx: number, cy: number, shape: Shape, r: () => number, noise = 0.004): Point3[] {
  const pts: Point3[] = [[cx, cy, 0]];
  for (let finger = 0; finger < 5; finger++) {
    const angle = -Math.PI / 2 + (finger - 2) * 0.35;
    for (let k = 1; k <= 4; k++) {
      const len = shape === "open" ? 0.025 * k : 0.012 + 0.004 * k;
      pts.push([cx + Math.cos(angle) * len, cy + Math.sin(angle) * len, 0]);
    }
  }
  return pts.map(([x, y, z]) => [x + (r() - 0.5) * noise, y + (r() - 0.5) * noise, z]);
}

interface SignSpec {
  path: (u: number) => [number, number];
  shape: Shape;
  twoHands?: boolean;
}

const SIGNS: Record<string, SignSpec> = {
  cercle: { path: (u) => [0.5 + 0.06 * Math.cos(2 * Math.PI * u), 0.4 + 0.06 * Math.sin(2 * Math.PI * u)], shape: "open" },
  vertical: { path: (u) => [0.5, 0.3 + 0.15 * u], shape: "fist" },
  deuxMains: { path: (u) => [0.45 + 0.05 * u, 0.45], shape: "open", twoHands: true },
};

/** Enregistre un signe : des images sans mains au début et à la fin, comme en vrai. */
function record(spec: SignSpec, seed: number, opts: { frames?: number; dx?: number; dy?: number; scale?: number; oneHandOnly?: boolean } = {}) {
  const r = rng(seed);
  const n = opts.frames ?? 30;
  const seq: number[][] = [];
  for (let k = 0; k < 5; k++) seq.push(extractFeatures({ pose: pose(), left: null, right: null }));
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1);
    let [x, y] = spec.path(u);
    const s = opts.scale ?? 1;
    x = 0.5 + (x - 0.5) * s + (opts.dx ?? 0);
    y = 0.4 + (y - 0.4) * s + (opts.dy ?? 0);
    const frame: RawFrame = { pose: pose(), right: hand(x, y, spec.shape, r), left: null };
    if (spec.twoHands && !opts.oneHandOnly) frame.left = hand(1 - x, y, spec.shape, r);
    seq.push(extractFeatures(frame));
  }
  for (let k = 0; k < 5; k++) seq.push(extractFeatures({ pose: pose(), left: null, right: null }));
  return seq;
}

const ref = (name: string, seed = 1) => prepare(record(SIGNS[name], seed))!;

test("trimToActive retire les images sans mains", () => {
  const seq = record(SIGNS.cercle, 3);
  assert.equal(seq.length, 40);
  assert.equal(trimToActive(seq)!.length, 30);
});

test("resample donne toujours 30 images", () => {
  const seq = record(SIGNS.cercle, 3, { frames: 47 });
  assert.equal(resample(trimToActive(seq)!).length, 30);
});

test("le même signe, refait par quelqu'un d'autre, est validé", () => {
  const res = scoreAttempt(prepare(record(SIGNS.cercle, 99))!, [ref("cercle")])!;
  assert.ok(res.score >= PASS_SCORE, `score ${res.score}`);
  assert.equal(res.feedback[0].kind, "ok");
});

test("signer plus lentement ne pénalise pas (DTW)", () => {
  const res = scoreAttempt(prepare(record(SIGNS.cercle, 7, { frames: 55 }))!, [ref("cercle")])!;
  assert.ok(res.score >= PASS_SCORE, `score ${res.score}`);
});

test("un autre signe obtient une mauvaise note", () => {
  const res = scoreAttempt(prepare(record(SIGNS.vertical, 5))!, [ref("cercle")])!;
  assert.ok(res.score < 60, `score ${res.score}`);
  assert.ok(!res.passed);
});

test("une main trop haute est signalée", () => {
  const res = scoreAttempt(prepare(record(SIGNS.cercle, 11, { dy: -0.12 }))!, [ref("cercle")])!;
  const pos = res.feedback.find((f) => f.kind === "position");
  assert.ok(pos, JSON.stringify(res));
  assert.match(pos!.message, /trop haute/);
});

test("un mouvement trop petit est signalé", () => {
  const res = scoreAttempt(prepare(record(SIGNS.cercle, 13, { scale: 0.3 }))!, [ref("cercle")])!;
  assert.ok(res.feedback.some((f) => f.kind === "amplitude" && /plus ample/.test(f.message)), JSON.stringify(res.feedback));
});

test("une mauvaise forme de main est signalée", () => {
  const spec = { ...SIGNS.cercle, shape: "fist" as Shape };
  const res = scoreAttempt(prepare(record(spec, 17))!, [ref("cercle")])!;
  assert.ok(res.sub.shape < 65, `forme ${res.sub.shape}`);
  assert.ok(res.feedback.some((f) => f.kind === "shape"));
});

test("un signe à deux mains fait avec une seule main est signalé", () => {
  const res = scoreAttempt(prepare(record(SIGNS.deuxMains, 19, { oneHandOnly: true }))!, [ref("deuxMains")])!;
  assert.ok(res.feedback.some((f) => f.kind === "hands"), JSON.stringify(res.feedback));
  assert.ok(!res.passed);
});

test("on garde la meilleure des références", () => {
  const res = scoreAttempt(prepare(record(SIGNS.cercle, 23))!, [ref("vertical"), ref("cercle")])!;
  assert.equal(res.referenceIndex, 1);
});

test("le miroir pour gaucher est une involution", () => {
  const f = record(SIGNS.deuxMains, 29)[10];
  const back = mirrorFeatures(mirrorFeatures(f));
  back.forEach((v, i) => assert.ok(Math.abs(v - f[i]) < 1e-9));
});

test("aucune main visible -> pas d'essai exploitable", () => {
  const empty = Array.from({ length: 20 }, () => extractFeatures({ pose: pose(), left: null, right: null }));
  assert.equal(prepare(empty), null);
});

test("(info) marges de notation", () => {
  const same = scoreAttempt(prepare(record(SIGNS.cercle, 99))!, [ref("cercle")])!.score;
  const slow = scoreAttempt(prepare(record(SIGNS.cercle, 7, { frames: 55 }))!, [ref("cercle")])!.score;
  const other = scoreAttempt(prepare(record(SIGNS.vertical, 5))!, [ref("cercle")])!.score;
  console.log(`# même signe ${same} | plus lent ${slow} | autre signe ${other}`);
});
