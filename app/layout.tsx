import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "Signa : apprendre la LSF avec un coach IA",
  description:
    "Apprends la Langue des Signes Française devant ta webcam. Une IA analyse tes gestes et te dit quoi corriger, sans qu'aucune image ne quitte ton appareil.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <SessionProvider>
          <Nav />
          <main>{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
            Signa ne remplace ni un cours avec un enseignant sourd ni un interprète. Chaque signe renvoie vers sa vidéo
            officielle sur le dictionnaire Elix.
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
