import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "BUT Dépôt - Fiche rangement de marchandise",
  description: "Recherche et rangement de marchandise - BUT Dépôt",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
