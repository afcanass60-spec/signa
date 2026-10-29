import Link from "next/link";

const STEPS = [
  { title: "Regarde le signe", text: "Un squelette animé montre la forme des mains, leur position et le mouvement. Le lien vers la vidéo Elix est toujours à côté." },
  { title: "Refais-le devant ta webcam", text: "L'IA suit 75 points de ton corps et de tes mains, 30 fois par seconde, directement dans ton navigateur." },
  { title: "Reçois une correction précise", text: "Une note sur 100 et des conseils concrets : « ta main est trop haute », « fais un mouvement plus ample »…" },
];

const AUDIENCES = [
  { who: "Parents et proches", why: "Communiquer avec un enfant ou un proche sourd sans attendre le prochain cours." },
  { who: "Soignants et accueil", why: "Connaître les signes essentiels pour accueillir un patient ou un usager sourd." },
  { who: "Élèves en cours de LSF", why: "S'entraîner entre deux séances avec un retour immédiat sur chaque geste." },
];

export default function Home() {
  return (
    <div className="px-[max(16px,env(safe-area-inset-left))]">
      <section className="mx-auto max-w-6xl grid gap-10 py-14 md:grid-cols-[1.15fr_1fr] md:items-center">
        <div className="min-w-0">
          <p className="label">Langue des Signes Française</p>
          <h1 className="mt-3 text-4xl md:text-6xl font-extrabold">
            Apprends la LSF avec un coach qui <span className="text-hand-l">regarde</span>{" "}
            <span className="text-hand-r">tes mains</span>.
          </h1>
          <p className="mt-5 text-lg text-muted max-w-[34rem]">
            Signa corrige tes signes en direct devant ta webcam. Aucune vidéo n&apos;est envoyée sur internet : l&apos;analyse
            se fait entièrement sur ton appareil.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/apprendre" className="btn btn-primary">Commencer gratuitement</Link>
            <Link href="/tarifs" className="btn btn-ghost">Voir les tarifs</Link>
          </div>
        </div>

        {/* Exemple de correction (illustration statique) */}
        <div className="panel p-6 min-w-0" aria-label="Exemple de correction">
          <div className="flex items-center justify-between">
            <span className="label">Exemple de correction</span>
            <span className="text-sm text-muted">Signe : Merci</span>
          </div>
          <div className="mt-5 flex items-center gap-5">
            <div className="font-display text-6xl font-extrabold tabular text-warn">72</div>
            <div className="grid gap-2 flex-1 text-sm">
              {[
                ["Forme", 88],
                ["Position", 51],
                ["Mouvement", 79],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
                  <span className="text-muted">{k}</span>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div className="h-2 rounded-full" style={{ width: `${v}%`, background: Number(v) >= 80 ? "var(--ok)" : "var(--warn)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 rounded-xl bg-warn-soft px-4 py-3 text-[15px]">Ta main est trop basse par rapport au modèle.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl py-10">
        <h2 className="text-3xl font-extrabold">Comment ça marche</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel p-6">
              <span className="font-display text-sm font-extrabold text-accent">Étape {i + 1}</span>
              <h3 className="mt-2 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl py-10 grid gap-8 md:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="text-3xl font-extrabold">Pour qui ?</h2>
          <p className="mt-3 text-muted">
            Environ 100 000 personnes utilisent la LSF en France, et très peu d&apos;entendants savent signer. Signa aide
            ceux qui veulent faire le premier pas.
          </p>
        </div>
        <ul className="grid gap-3">
          {AUDIENCES.map((a) => (
            <li key={a.who} className="border-b border-line pb-3">
              <p className="font-bold">{a.who}</p>
              <p className="text-muted">{a.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl py-10">
        <div className="rounded-[24px] bg-accent text-accent-ink p-8 md:p-12 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-extrabold">Tes 12 premiers signes sont gratuits.</h2>
            <p className="mt-2 opacity-85">Il te faut seulement une webcam et 5 minutes.</p>
          </div>
          <Link href="/apprendre" className="btn bg-surface text-ink">Commencer</Link>
        </div>
      </section>
    </div>
  );
}
