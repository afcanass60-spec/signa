"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ALL_SIGNS, elixUrl, findSign } from "@/content/curriculum";
import { store, type Template } from "@/lib/store";
import { prepare, scoreAttempt, type ScoreResult } from "@/lib/scoring";
import { useLefty } from "@/lib/prefs";
import { LiveCamera, type LiveCameraHandle } from "@/components/LiveCamera";
import { SkeletonPlayer } from "@/components/SkeletonPlayer";
import { ScoreRing, SubBar } from "@/components/ScoreRing";
import { RequireUser } from "@/components/RequireUser";
import { useSession } from "@/components/SessionProvider";

const RECORD_MS = 2500;
type Phase = "idle" | "countdown" | "recording" | "result" | "nohands";

export default function PracticePage() {
  return (
    <RequireUser>
      <Practice />
    </RequireUser>
  );
}

function Practice() {
  const { slug } = useParams<{ slug: string }>();
  const sign = findSign(slug);
  const { user } = useSession();
  const [lefty, setLefty] = useLefty();
  const cam = useRef<LiveCameraHandle>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [attempt, setAttempt] = useState<number[][] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sign) return;
    setTemplates(null);
    setResult(null);
    setPhase("idle");
    store.listTemplates(sign.slug).then(setTemplates).catch((e) => setError(String(e)));
  }, [sign]);

  if (!sign) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-3xl font-extrabold">Signe introuvable</h1>
        <Link href="/apprendre" className="btn btn-ghost mt-6">Retour aux leçons</Link>
      </div>
    );
  }

  const locked = sign.unit.premium && !user?.isPremium;
  const idx = ALL_SIGNS.findIndex((s) => s.slug === sign.slug);
  const next = ALL_SIGNS[idx + 1];
  const reference = templates?.[result?.referenceIndex ?? 0]?.frames ?? templates?.[0]?.frames;

  async function go() {
    if (!templates?.length) return;
    setResult(null);
    setPhase("countdown");
    for (let n = 3; n > 0; n--) {
      setCount(n);
      await new Promise((r) => setTimeout(r, 700));
    }
    setPhase("recording");
    const raw = await cam.current!.record(RECORD_MS);
    const seq = prepare(raw);
    if (!seq) {
      setPhase("nohands");
      return;
    }
    const res = scoreAttempt(seq, templates.map((t) => t.frames))!;
    setAttempt(seq);
    setResult(res);
    setPhase("result");
    store.addAttempt(sign!.slug, res.score).catch((e) => setError("Ta note n'a pas pu être enregistrée : " + String(e)));
  }

  if (locked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-3xl font-extrabold">{sign.label}</h1>
        <p className="mt-3 text-muted">Ce signe fait partie de la leçon « {sign.unit.title} », réservée aux membres Premium.</p>
        <Link href="/tarifs" className="btn btn-primary mt-6">Passer à Premium</Link>
      </div>
    );
  }

  const busy = phase === "countdown" || phase === "recording";

  return (
    <div className="mx-auto max-w-6xl px-[max(16px,env(safe-area-inset-left))] py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/apprendre" className="text-sm text-muted hover:text-ink">← {sign.unit.title}</Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mt-1">{sign.label}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <a href={elixUrl(sign.label)} target="_blank" rel="noreferrer" className="text-accent font-bold underline underline-offset-4">
            Voir la vidéo sur Elix ↗
          </a>
          <label className="flex items-center gap-2 cursor-pointer">
            <input id="lefty" type="checkbox" checked={lefty} onChange={(e) => setLefty(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Je suis gaucher
          </label>
        </div>
      </div>

      {error && <p className="mt-4 text-bad" role="alert">{error}</p>}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          {templates === null ? (
            <div className="aspect-[4/3] rounded-[20px] bg-surface-2 grid place-items-center text-muted">Chargement…</div>
          ) : templates.length === 0 ? (
            <div className="aspect-[4/3] rounded-[20px] bg-surface-2 grid place-items-center p-6 text-center">
              <div>
                <p className="font-bold">Ce signe n&apos;a pas encore de référence.</p>
                <p className="text-muted mt-2 text-sm">
                  L&apos;IA a besoin d&apos;au moins un exemple enregistré par une personne qui signe.
                  {user?.isAdmin && <> Enregistre-le dans le <Link className="text-accent font-bold underline" href="/studio">Studio</Link>.</>}
                </p>
              </div>
            </div>
          ) : (
            <SkeletonPlayer
              frames={reference!}
              ghost={phase === "result" ? attempt : null}
              label={phase === "result" ? "Modèle (couleur) et ton essai (gris)" : "Modèle"}
            />
          )}
          <p className="mt-2 text-sm text-muted">
            <span className="font-bold text-hand-l">Orange</span> : main gauche · <span className="font-bold text-hand-r">Bleu</span> : main droite.
            Tout est vu comme dans un miroir.
          </p>
        </div>

        <div className="min-w-0">
          <LiveCamera
            ref={cam}
            lefty={lefty}
            recording={phase === "recording"}
            overlay={
              phase === "countdown" ? (
                <div className="absolute inset-0 grid place-items-center bg-black/25">
                  <span className="font-display text-8xl font-extrabold text-white tabular">{count}</span>
                </div>
              ) : phase === "recording" ? (
                <div className="absolute right-3 top-3 rounded-full bg-bad px-3 py-1 text-sm font-bold text-white">● Signe maintenant</div>
              ) : null
            }
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={go} disabled={busy || !templates?.length}>
              {phase === "result" || phase === "nohands" ? "Réessayer" : "Je suis prêt"}
            </button>
            {phase === "result" && result?.passed && next && (
              <Link href={`/apprendre/${next.slug}`} className="btn btn-ghost">Signe suivant : {next.label} →</Link>
            )}
          </div>
          <p className="mt-2 text-sm text-muted">Décompte de 3 secondes, puis {RECORD_MS / 1000} secondes pour faire le signe.</p>
        </div>
      </div>

      {phase === "nohands" && (
        <div className="mt-6 rounded-2xl bg-warn-soft p-5" role="status">
          <p className="font-bold">Je n&apos;ai pas vu tes mains.</p>
          <p className="mt-1">Recule un peu pour que ton buste et tes mains soient dans le cadre, avec une bonne lumière, puis réessaie.</p>
        </div>
      )}

      {phase === "result" && result && (
        <section className="panel mt-6 p-6 grid gap-6 md:grid-cols-[auto_1fr_1.2fr] md:items-center" aria-live="polite">
          <ScoreRing score={result.score} />
          <div className="grid gap-3 min-w-0">
            <SubBar label="Forme" value={result.sub.shape} />
            <SubBar label="Position" value={result.sub.position} />
            <SubBar label="Mouvement" value={result.sub.motion} />
          </div>
          <ul className="grid gap-2 min-w-0">
            {result.feedback.map((f, i) => (
              <li key={i} className={`rounded-xl px-4 py-3 ${f.kind === "ok" ? "bg-ok-soft text-ok font-bold" : "bg-warn-soft"}`}>
                {f.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
