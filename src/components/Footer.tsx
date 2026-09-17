import Link from "next/link";

// Tout petit pied de page discret, sur toutes les pages (sauf impression) :
// mention légale + lien vers /mentions-legales, qui rappelle que ce site
// est un outil interne du dépôt, pas un outil officiel BUT — voir cette
// page pour le détail.
export default function Footer() {
  return (
    <footer className="print:hidden">
      <p className="py-6 text-center text-[11px] text-gray-400">
        <Link href="/mentions-legales" className="hover:text-but-gray hover:underline">
          Tous droits réservés — Emmanuel Delannoy, 2026
        </Link>
      </p>
    </footer>
  );
}
