"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { useSession } from "./SessionProvider";
import { isDemo, store } from "@/lib/store";

const LINKS = [
  { href: "/apprendre", label: "Apprendre" },
  { href: "/progression", label: "Progression" },
  { href: "/tarifs", label: "Tarifs" },
];

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { user } = useSession();
  const links = user?.isAdmin ? [...LINKS, { href: "/studio", label: "Studio" }] : LINKS;

  return (
    <header className="border-b border-line bg-surface/90 backdrop-blur sticky top-0 z-20">
      {isDemo && (
        <div className="bg-accent-soft text-ink text-sm text-center py-1.5 px-4">
          Mode démo : tes données restent dans ce navigateur. Configure Supabase pour activer les comptes (voir README).
        </div>
      )}
      <nav className="mx-auto max-w-6xl flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold">
          <Logo /> Signa
        </Link>
        <ul className="flex flex-wrap gap-1 text-[15px]">
          {links.map((l) => {
            const active = path.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`rounded-full px-3 py-1.5 ${active ? "bg-accent-soft text-accent font-bold" : "text-muted hover:text-ink"}`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user?.isPremium && <span className="rounded-full bg-ok-soft text-ok px-2.5 py-1 font-bold">Premium</span>}
          {!isDemo &&
            (user ? (
              <button
                className="text-muted hover:text-ink"
                onClick={async () => {
                  await store.signOut();
                  router.push("/");
                }}
              >
                Se déconnecter
              </button>
            ) : (
              <Link href="/connexion" className="btn btn-primary !py-2 !px-4">
                Se connecter
              </Link>
            ))}
        </div>
      </nav>
    </header>
  );
}
