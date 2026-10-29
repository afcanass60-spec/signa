"use client";
import Link from "next/link";
import { useSession } from "./SessionProvider";

/** Affiche le contenu seulement si l'utilisateur est connecté (toujours vrai en mode démo). */
export function RequireUser({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { user, loading } = useSession();
  if (loading) return <div className="mx-auto max-w-6xl px-4 py-16 text-muted">Chargement…</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-3xl font-extrabold">Connecte-toi pour continuer</h1>
        <p className="mt-3 text-muted">Ton compte garde ta progression sur tous tes appareils.</p>
        <Link href="/connexion" className="btn btn-primary mt-6">Se connecter ou créer un compte</Link>
      </div>
    );
  }
  if (admin && !user.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-3xl font-extrabold">Accès réservé</h1>
        <p className="mt-3 text-muted">Le Studio sert à enregistrer les signes de référence. Il est réservé aux administrateurs.</p>
      </div>
    );
  }
  return <>{children}</>;
}
