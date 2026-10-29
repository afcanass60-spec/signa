"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UNITS } from "@/content/curriculum";
import { store } from "@/lib/store";
import { computeProgress, type Progress } from "@/lib/progress";
import { RequireUser } from "@/components/RequireUser";
import { useSession } from "@/components/SessionProvider";

export default function LearnPage() {
  return (
    <RequireUser>
      <Units />
    </RequireUser>
  );
}

function Units() {
  const { user } = useSession();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([store.listAttempts(), store.countTemplates()])
      .then(([attempts, c]) => {
        setProgress(computeProgress(attempts));
        setCounts(c);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const totalRefs = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">Leçons</h1>
          <p className="mt-2 text-muted">Choisis un signe pour t&apos;entraîner. Un signe est validé à partir de 80/100.</p>
        </div>
        {progress && (
          <p className="tabular text-muted">
            <strong className="text-ink">{progress.mastered}</strong> signes validés · <strong className="text-ink">{progress.xp}</strong> XP
          </p>
        )}
      </div>

      {error && <p className="mt-6 text-bad">{error}</p>}

      {totalRefs === 0 && user?.isAdmin && (
        <div className="mt-6 rounded-2xl bg-warn-soft p-5">
          <p className="font-bold">Aucun signe de référence pour l&apos;instant.</p>
          <p className="mt-1">
            Pour que l&apos;IA puisse corriger, enregistre d&apos;abord chaque signe une ou plusieurs fois dans le{" "}
            <Link href="/studio" className="font-bold text-accent underline">Studio</Link>.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-6">
        {UNITS.map((unit) => {
          const locked = unit.premium && !user?.isPremium;
          const done = unit.signs.filter((s) => progress?.bySign[s.slug]?.mastered).length;
          return (
            <section key={unit.id} className="panel p-5 md:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-2xl font-extrabold">{unit.title}</h2>
                  <p className="text-muted">{unit.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  {unit.premium && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${locked ? "bg-surface-2 text-muted" : "bg-ok-soft text-ok"}`}>
                      Premium
                    </span>
                  )}
                  <span className="tabular text-sm text-muted">{done}/{unit.signs.length}</span>
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-surface-2">
                <div className="h-1.5 rounded-full bg-ok" style={{ width: `${(done / unit.signs.length) * 100}%` }} />
              </div>
              <ul className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {unit.signs.map((sign) => {
                  const p = progress?.bySign[sign.slug];
                  const refs = counts[sign.slug] ?? 0;
                  const inner = (
                    <>
                      <span className="font-bold">{sign.label}</span>
                      <span className="text-sm text-muted tabular">
                        {locked ? "Verrouillé" : p ? `Meilleur : ${p.best}` : refs ? "À découvrir" : "Pas de référence"}
                      </span>
                      {p?.mastered && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-ok" aria-label="validé" />}
                    </>
                  );
                  const cls = "relative grid gap-1 rounded-2xl border border-line p-4 h-full";
                  return (
                    <li key={sign.slug}>
                      {locked ? (
                        <Link href="/tarifs" className={`${cls} opacity-60`}>{inner}</Link>
                      ) : (
                        <Link href={`/apprendre/${sign.slug}`} className={`${cls} hover:border-accent hover:bg-accent-soft transition-colors`}>
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
