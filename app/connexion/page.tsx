"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isDemo, store } from "@/lib/store";
import { useSession } from "@/components/SessionProvider";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (isDemo) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-extrabold">Pas besoin de compte en mode démo</h1>
        <p className="mt-3 text-muted">Configure Supabase dans le fichier .env.local pour activer les comptes (voir le README).</p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "in") {
        await store.signIn(email, password);
        await refresh();
        router.push("/apprendre");
      } else {
        const { needsConfirmation } = await store.signUp(email, password);
        if (needsConfirmation) setInfo("Compte créé. Clique sur le lien reçu par e-mail pour l'activer, puis connecte-toi.");
        else {
          await refresh();
          router.push("/apprendre");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold">{mode === "in" ? "Se connecter" : "Créer un compte"}</h1>
      <form onSubmit={submit} className="panel mt-6 p-6 grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-bold">E-mail</span>
          <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-bold">Mot de passe</span>
          <input
            id="password" className="input" type="password" required minLength={8}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "up" && <span className="text-xs text-muted">8 caractères minimum.</span>}
        </label>
        {error && <p className="text-bad text-sm" role="alert">{error}</p>}
        {info && <p className="text-ok text-sm" role="status">{info}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Un instant…" : mode === "in" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>
      <button className="mt-4 text-sm text-accent font-bold" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); setInfo(""); }}>
        {mode === "in" ? "Pas encore de compte ? Inscris-toi" : "Déjà un compte ? Connecte-toi"}
      </button>
    </div>
  );
}
