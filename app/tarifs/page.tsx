"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_SIGNS, UNITS } from "@/content/curriculum";
import { store } from "@/lib/store";
import { useSession } from "@/components/SessionProvider";

const FREE = UNITS.filter((u) => !u.premium);
const freeCount = FREE.reduce((s, u) => s + u.signs.length, 0);

export default function PricingPage() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    if (!user) return router.push("/connexion");
    setBusy(true);
    setError("");
    try {
      await store.startCheckout(); // en production : redirection vers Stripe
      if (store.mode === "demo") {
        await refresh();
        router.push("/progression?abonnement=ok");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-[max(16px,env(safe-area-inset-left))] py-12">
      <h1 className="text-4xl md:text-5xl font-extrabold">Tarifs</h1>
      <p className="mt-3 text-muted text-lg">Commence gratuitement. Passe à Premium quand tu veux aller plus loin.</p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="panel p-7 flex flex-col">
          <h2 className="text-2xl font-extrabold">Découverte</h2>
          <p className="mt-2 font-display text-4xl font-extrabold tabular">0 €</p>
          <ul className="mt-6 grid gap-2.5 flex-1">
            <li>{freeCount} signes : {FREE.map((u) => u.title.toLowerCase()).join(", ")}</li>
            <li>Correction par l&apos;IA à chaque essai</li>
            <li>Suivi de ta progression</li>
          </ul>
          <Link href="/apprendre" className="btn btn-ghost mt-8">Commencer</Link>
        </div>

        <div className="rounded-[20px] border-2 border-accent bg-surface p-7 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">Premium</h2>
            <span className="rounded-full bg-accent-soft text-accent px-3 py-1 text-xs font-bold">Le plus complet</span>
          </div>
          <p className="mt-2 font-display text-4xl font-extrabold tabular">
            6,99 € <span className="text-base font-normal text-muted">/ mois</span>
          </p>
          <ul className="mt-6 grid gap-2.5 flex-1">
            <li>Les {ALL_SIGNS.length} signes des {UNITS.length} leçons</li>
            <li>Santé et urgences, émotions, vie quotidienne</li>
            <li>Nouvelles leçons chaque mois</li>
            <li>Sans engagement, résiliable en un clic</li>
          </ul>
          {user?.isPremium ? (
            <p className="mt-8 rounded-full bg-ok-soft text-ok text-center py-3 font-bold">Tu es déjà Premium</p>
          ) : (
            <button className="btn btn-primary mt-8" onClick={subscribe} disabled={busy}>
              {busy ? "Redirection…" : store.mode === "demo" ? "Simuler l'abonnement (démo)" : "S'abonner"}
            </button>
          )}
          {error && <p className="mt-3 text-sm text-bad" role="alert">{error}</p>}
        </div>
      </div>

      <section className="mt-12 panel p-7">
        <h2 className="text-2xl font-extrabold">Pour les écoles, associations et établissements</h2>
        <p className="mt-2 text-muted">
          Licences pour vos équipes (accueil, soignants, enseignants) avec suivi de groupe. Contactez-nous pour un devis.
        </p>
      </section>
    </div>
  );
}
