/** Statistiques de progression calculées à partir de l'historique des essais. */
import type { Attempt } from "./store/types.ts";
import { PASS_SCORE } from "./scoring.ts";

export interface SignProgress {
  best: number;
  tries: number;
  mastered: boolean;
}

export interface Progress {
  bySign: Record<string, SignProgress>;
  xp: number;
  mastered: number;
  streak: number; // jours consécutifs avec au moins un essai (jusqu'à aujourd'hui ou hier)
  last7: { day: string; tries: number }[];
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function computeProgress(attempts: Attempt[], now = new Date()): Progress {
  const bySign: Record<string, SignProgress> = {};
  let xp = 0;
  const days = new Map<string, number>();
  for (const a of attempts) {
    const p = (bySign[a.signSlug] ??= { best: 0, tries: 0, mastered: false });
    p.tries++;
    p.best = Math.max(p.best, a.score);
    p.mastered = p.best >= PASS_SCORE;
    xp += Math.round(a.score / 10);
    const k = dayKey(new Date(a.createdAt));
    days.set(k, (days.get(k) ?? 0) + 1);
  }

  let streak = 0;
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); // la série n'est pas perdue avant minuit
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return { day: dayKey(d), tries: days.get(dayKey(d)) ?? 0 };
  });

  return { bySign, xp, mastered: Object.values(bySign).filter((p) => p.mastered).length, streak, last7 };
}
