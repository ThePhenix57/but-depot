import { redirect } from "next/navigation";

// Le middleware protège déjà les routes ; cette page ne fait que rediriger
// vers l'écran de recherche (ou /login si personne n'est connecté, géré
// par le middleware avant même d'arriver ici).
export default function Home() {
  redirect("/recherche");
}
