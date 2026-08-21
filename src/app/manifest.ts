import type { MetadataRoute } from "next";

// Rend le site "installable" (Chrome : menu ⋮ > Installer l'application, ou
// icône dans la barre d'adresse). Une fois installé, le site s'ouvre dans
// sa propre fenêtre avec juste le nom et l'icône BUT — sans barre
// d'adresse ni URL visible. C'est la façon normale de "cacher" l'URL pour
// un outil interne ; un vrai nom de domaine (au lieu de vercel.app) est un
// sujet séparé qui demande d'acheter/configurer un domaine.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BUT Dépôt - Fiche rangement de marchandise",
    short_name: "BUT Dépôt",
    description: "Recherche et rangement de marchandise - BUT Dépôt",
    start_url: "/recherche",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ED1C24",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
