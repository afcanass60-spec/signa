"use client";
/**
 * Studio : enregistrement des signes de référence (réservé aux admins).
 * C'est aussi l'outil de constitution du dataset : l'export JSON se convertit
 * pour le projet Python (scripts/templates_to_npy.py).
 */
import { useEffect, useRef, useState } from "react";
import { ALL_SIGNS, UNITS, elixUrl } from "@/content/curriculum";
import { store, type Template } from "@/lib/store";
import { prepare, scoreAttempt } from "@/lib/scoring";
import { compact } from "@/lib/features";
import { LiveCamera, type LiveCameraHandle } from "@/components/LiveCamera";
import { SkeletonPlayer } from "@/components/SkeletonPlayer";
import { RequireUser } from "@/components/RequireUser";

const RECORD_MS = 2500;

export default function StudioPage() {
  return (
    <RequireUser admin>
      <Studio />
    </RequireUser>
  );
}

function Studio() {
  const cam = useRef<LiveCameraHandle>(null);
  const [slug, setSlug] = useState(ALL_SIGNS[0].slug);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [draft, setDraft] = useState<number[][] | null>(null);
  const [phase, setPhase] = useState<"idle" | "countdown" | "recording">("idle");
  const [count, setCount] = useState(3);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sign = ALL_SIGNS.find((s) => s.slug === slug)!;

  async function reload() {
    try {
      const [c, t] = await Promise.all([store.countTemplates(), store.listTemplates(slug)]);
      setCounts(c);
      setTemplates(t);
    } catch (e) {
      setMsg({ ok: false, text: String(e) });
    }
  }
  useEffect(() => {
    setDraft(null);
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function record() {
    setMsg(null);
    setDraft(null);
    setPhase("countdown");
    for (let n = 3; n > 0; n--) {
      setCount(n);
      await new Promise((r) => setTimeout(r, 700));
    }
    setPhase("recording");
    const raw = await cam.current!.record(RECORD_MS);
    setPhase("idle");
    const seq = prepare(raw);
    if (!seq) setMsg({ ok: false, text: "Mains non détectées. Recommence en restant bien dans le cadre." });
    else setDraft(compact(seq));
  }

  async function saveDraft() {
    if (!draft) return;
    try {
      await store.saveTemplate(slug, draft, sign.unit.premium);
      setDraft(null);
      setMsg({ ok: true, text: `Référence enregistrée pour « ${sign.label} ».` });
      await reload();
    } catch (e) {
      setMsg({ ok: false, text: String(e) });
    }
  }

  async function exportAll() {
    const all = await store.exportTemplates();
    const blob = new Blob([JSON.stringify({ version: 1, frames: 30, features: 203, templates: all })], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `signa-references-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importFile(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const list: Template[] = Array.isArray(data) ? data : data.templates;
      if (!Array.isArray(list)) throw new Error("Fichier non reconnu.");
      const premiumOf = (s: string) => ALL_SIGNS.find((x) => x.slug === s)?.unit.premium ?? false;
      const n = await store.importTemplates(list, premiumOf);
      setMsg({ ok: true, text: `${n} référence(s) importée(s).` });
      await reload();
    } catch (e) {
      setMsg({ ok: false, text: "Import impossible : " + (e instanceof Error ? e.message : String(e)) });
    }
  }

  // cohérence : chaque référence notée contre les autres (doit être élevée)
  const consistency =
    templates.length >= 2
      ? Math.round(
          templates.reduce((s, t, i) => s + scoreAttempt(t.frames, templates.filter((_, j) => j !== i).map((x) => x.frames))!.score, 0) /
            templates.length,
        )
      : null;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const covered = ALL_SIGNS.filter((s) => counts[s.slug]).length;

  return (
    <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">Studio</h1>
          <p className="mt-2 text-muted max-w-2xl">
            Enregistre les signes de référence que l&apos;IA utilisera pour corriger les élèves. Idéalement, fais-les faire par une
            personne sourde ou un interprète, 3 fois chacun.
          </p>
        </div>
        <p className="tabular text-muted">
          <strong className="text-ink">{covered}</strong>/{ALL_SIGNS.length} signes couverts · <strong className="text-ink">{total}</strong> références
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_1fr]">
        <aside className="panel p-4 max-h-[70vh] overflow-auto">
          {UNITS.map((u) => (
            <div key={u.id} className="mb-4">
              <p className="label px-2">{u.title}</p>
              <ul className="mt-1">
                {u.signs.map((s) => (
                  <li key={s.slug}>
                    <button
                      onClick={() => setSlug(s.slug)}
                      className={`w-full flex justify-between rounded-lg px-2 py-1.5 text-left ${s.slug === slug ? "bg-accent-soft text-accent font-bold" : "hover:bg-surface-2"}`}
                    >
                      <span>{s.label}</span>
                      <span className={`tabular text-sm ${counts[s.slug] ? "text-ok" : "text-muted"}`}>{counts[s.slug] ?? 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-3xl font-extrabold">{sign.label}</h2>
            <a href={elixUrl(sign.label)} target="_blank" rel="noreferrer" className="text-accent font-bold underline underline-offset-4">
              Vérifier sur Elix ↗
            </a>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <LiveCamera
              ref={cam}
              recording={phase === "recording"}
              overlay={
                phase === "countdown" ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/25">
                    <span className="font-display text-8xl font-extrabold text-white tabular">{count}</span>
                  </div>
                ) : null
              }
            />
            {draft ? (
              <SkeletonPlayer frames={draft} label="Aperçu de l'enregistrement" />
            ) : (
              <div className="aspect-[4/3] rounded-[20px] border-2 border-dashed border-line grid place-items-center p-6 text-center text-muted">
                L&apos;aperçu de ton enregistrement s&apos;affichera ici.
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={record} disabled={phase !== "idle"}>
              {draft ? "Recommencer" : "Enregistrer une référence"}
            </button>
            {draft && <button className="btn btn-ghost" onClick={saveDraft}>Garder cet enregistrement</button>}
          </div>
          {msg && <p className={`mt-3 ${msg.ok ? "text-ok" : "text-bad"}`} role="status">{msg.text}</p>}

          <section className="panel mt-6 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-xl font-bold">Références de « {sign.label} »</h3>
              {consistency !== null && (
                <p className="text-sm">
                  Cohérence entre références :{" "}
                  <strong className={`tabular ${consistency >= 80 ? "text-ok" : "text-warn"}`}>{consistency}/100</strong>
                </p>
              )}
            </div>
            {templates.length === 0 ? (
              <p className="mt-2 text-muted">Aucune pour l&apos;instant.</p>
            ) : (
              <ul className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                {templates.map((t, i) => (
                  <li key={t.id} className="grid gap-2">
                    <SkeletonPlayer frames={t.frames} label={`#${i + 1}`} />
                    <button
                      className="text-sm text-bad hover:underline justify-self-start"
                      onClick={async () => {
                        await store.deleteTemplate(t.id);
                        await reload();
                      }}
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {consistency !== null && consistency < 80 && (
              <p className="mt-3 text-sm text-warn">
                Les références sont assez différentes entre elles. Vérifie qu&apos;il s&apos;agit bien du même signe, ou supprime celle qui s&apos;écarte.
              </p>
            )}
          </section>

          <section className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn btn-ghost" onClick={exportAll}>Exporter le dataset (JSON)</button>
            <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Importer un fichier</button>
            <input
              id="import" ref={fileRef} type="file" accept="application/json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }}
            />
            <span className="text-sm text-muted">L&apos;export sert aussi à entraîner le modèle Python (voir README).</span>
          </section>
        </div>
      </div>
    </div>
  );
}
