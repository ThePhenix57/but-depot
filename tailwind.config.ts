import type { Config } from "tailwindcss";

// NOTE couleurs : rouge/gris "provisoires" en attendant que tu nous donnes
// la charte graphique exacte (nuancier officiel) en même temps que le logo.
// Il suffit de changer les codes hexa ci-dessous pour ajuster partout d'un coup.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        but: {
          red: "#E2001A",
          "red-dark": "#B50014",
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
