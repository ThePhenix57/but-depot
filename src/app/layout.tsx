import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";

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
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
