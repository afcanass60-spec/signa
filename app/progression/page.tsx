"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ALL_SIGNS, UNITS } from "@/content/curriculum";
import { store } from "@/lib/store";
import { computeProgress, type Progress } from "@/lib/progress";
import { RequireUser } from "@/components/RequireUser";
import { useSession } from "@/components/SessionProvider";

export default function ProgressPage() {
  return (
    <RequireUser>
      <Suspense>
        <Dashboard />
      </Suspense>
    </RequireUser>
  );
}

const DAY_NAMES = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

function Dashboard() {
  const { user, refresh } = useSession();
  const params = useSearchParams();
  const [p, setP] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    store.listAttempts().then((a) => setP(computeProgress(a))).catch((e) => setError(String(e)));
    if (params.get("abonnement") === "ok") void refresh(); // le webhook peut prendre 1-2 s
  }, [params, refresh]);

  if (!p) return <div className="mx-auto max-w-6xl px-4 py-16 text-muted">{error || "Chargement…"}</div>;

  const max = Math.max(1, ...p.last7.map((d) => d.tries));
  const toPractice = ALL_SIGNS.filter((s) => p.bySign[s.slug] && !p.bySign[s.slug].mastered)
    .sort((a, b) => p.bySign[a.slug].best - p.bySign[b.slug].best)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] py-10">
      {params.get("abonnement") === "ok" && (
        <div className="mb-6 rounded-2xl bg-ok-soft text-ok p-4 font-bold" role="status">
          Merci ! Ton abonnement Premium est actif. Toutes les leçons sont débloquées.
        </div>
      )}
      <h1 className="text-4xl font-extrabold">Ta progression</h1>

      <div className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          ["Signes validés", `${p.mastered} / ${ALL_SIGNS.length}`],
          ["Série", `${p.streak} jour${p.streak > 1 ? "s" : ""}`],
          ["Points d'XP", String(p.xp)],
          ["Essais", String(Object.values(p.bySign).reduce((s, x) => s + x.tries, 0))],
        ].map(([k, v]) => (
          <div key={k} className="panel p-5">
            <p className="label">{k}</p>
            <p className="mt-2 font-display text-3xl font-extrabold tabular">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <section className="panel p-6 min-w-0">
          <h2 className="text-xl font-bold">Essais des 7 derniers jours</h2>
          <div className="mt-6 grid grid-cols-7 items-end gap-2 h-40" role="img" aria-label="Nombre d'essais par jour">
            {p.last7.map((d) => {
              const date = new Date(d.day + "T12:00:00");
              return (
                <div key={d.day} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="text-xs tabular text-muted">{d.tries || ""}</span>
                  <div
                    className="w-full max-w-10 rounded-t-lg bg-accent"
                    style={{ height: `${(d.tries / max) * 100}%`, minHeight: d.tries ? 4 : 2, opacity: d.tries ? 1 : 0.2 }}
                  />
                  <span className="text-xs text-muted">{DAY_NAMES[date.getDay()]}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel p-6 min-w-0">
          <h2 className="text-xl font-bold">À retravailler</h2>
          {toPractice.length === 0 ? (
            <p className="mt-3 text-muted">Rien pour l&apos;instant. Tous les signes essayés sont validés.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {toPractice.map((s) => (
                <li key={s.slug}>
                  <Link href={`/apprendre/${s.slug}`} className="flex justify-between rounded-xl px-3 py-2 hover:bg-surface-2">
                    <span className="font-bold">{s.label}</span>
                    <span className="tabular text-muted">{p.bySign[s.slug].best}/100</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel mt-6 p-6">
        <h2 className="text-xl font-bold">Par leçon</h2>
        <ul className="mt-4 grid gap-3">
          {UNITS.map((u) => {
            const done = u.signs.filter((s) => p.bySign[s.slug]?.mastered).length;
            return (
              <li key={u.id} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3">
                <span className="truncate">{u.title}</span>
                <div className="h-2.5 rounded-full bg-surface-2">
                  <div className="h-2.5 rounded-full bg-ok" style={{ width: `${(done / u.signs.length) * 100}%` }} />
                </div>
                <span className="tabular text-right text-muted">{done}/{u.signs.length}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-4">
        {user?.isPremium ? (
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await store.openBillingPortal(); await refresh(); } catch (e) { setError(String(e)); } finally { setBusy(false); }
            }}
          >
            {store.mode === "demo" ? "Simuler la résiliation" : "Gérer mon abonnement"}
          </button>
        ) : (
          <Link href="/tarifs" className="btn btn-primary">Débloquer toutes les leçons</Link>
        )}
        {error && <span className="text-bad">{error}</span>}
      </section>
    </div>
  );
}
