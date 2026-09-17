import type { Config } from "tailwindcss";

// NOTE couleurs : le rouge est échantillonné directement depuis le fichier
// logo-but.png fourni (#ED1C24). Si ce n'est pas exactement le rouge de la
// charte graphique officielle BUT (le fichier envoyé n'a pas l'air d'être
// un export vectoriel officiel), remplace juste les codes hexa ci-dessous
// pour ajuster partout d'un coup.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        but: {
          red: "#ED1C24",
          "red-dark": "#B8151C",
          "red-light": "#FFF1F1",
          dark: "#1A1A1A",
          gray: "#6B7280",
          "gray-light": "#F3F4F6",
        },
      },
      // Ombre douce et cohérente pour toutes les cartes du site (plus
      // discrète que les shadow-* par défaut de Tailwind, pensée pour un
      // fond très clair) — voir src/components/ui/Card.tsx.
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.03), 0 1px 3px 0 rgb(0 0 0 / 0.04)",
        "card-hover": "0 4px 10px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        // Petite apparition douce pour les résultats/cartes qui
        // apparaissent après une action (recherche, chargement...) — reste
        // sobre, pas un effet démonstratif.
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
