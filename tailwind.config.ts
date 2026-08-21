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
          dark: "#1A1A1A",
          gray: "#6B7280",
          "gray-light": "#F3F4F6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
