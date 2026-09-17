import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatBulle from "@/components/ChatBulle";

export const metadata: Metadata = {
  title: "BUT Dépôt - Fiche rangement de marchandise",
  description: "Recherche et rangement de marchandise - BUT Dépôt",
  appleWebApp: { title: "BUT Dépôt" },
};

export const viewport: Viewport = {
  themeColor: "#ED1C24",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* Police Inter (Google Fonts) : sobre et très lisible, standard
            pour les outils professionnels (remplace Poppins, jugée trop
            "décorative" pour un outil d'entrepôt). Chargée via un lien
            classique (pas next/font) car l'environnement de build de cette
            session n'a pas accès à fonts.googleapis.com pour l'auto-héberger
            ; un navigateur normal, lui, y accède sans problème. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
        <ChatBulle />
      </body>
    </html>
  );
}
