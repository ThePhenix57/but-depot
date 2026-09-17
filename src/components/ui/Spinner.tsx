import { IconLoader } from "@/components/icons";

// Petit indicateur de chargement réutilisable (recherche en cours,
// enregistrement...) — remplace les "Recherche en cours..." en texte brut.
export default function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <IconLoader className={`${className} animate-spin text-but-red`} />;
}
