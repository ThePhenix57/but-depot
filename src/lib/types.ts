import type { TypePalette } from "@/lib/palettes";

export type Role = "employe" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Zone {
  id: string;
  code: string;
  label: string | null;
  pos_x: number;
  pos_y: number;
  largeur: number;
  hauteur: number;
  couleur: string;
}

export interface Category {
  id: string;
  name: string;
  zone_ids?: string[];
}

export interface Alveole {
  id: string;
  zone_id: string;
  code: string;
  capacite_kg: number | null;
  taille_palette_max: TypePalette | null;
}

// Ligne de la vue alveole_occupancy : poids actuellement stocké dans
// l'alvéole et sa capacité (si connue).
export interface AlveoleOccupancy {
  alveole_id: string;
  zone_id: string;
  code: string;
  capacite_kg: number | null;
  poids_actuel_kg: number;
  nb_produits_differents: number;
}

export type AlveoleWithOccupancy = Alveole & {
  poids_actuel_kg: number;
  nb_produits_differents: number;
};

export interface Product {
  id: string;
  ean: string;
  name: string;
  category_id: string | null;
  poids_colis_kg: number | null;
  colis_par_palette_eur: number | null;
  colis_par_palette_centrale: number | null;
  created_at: string;
}

// Un emplacement occupé par un produit : combien de colis, dans quelle
// alvéole (avec sa zone).
export interface ProductLocation {
  id: string;
  product_id: string;
  alveole_id: string;
  colis: number;
  type_palette: TypePalette | null;
  alveole: Alveole & { zone: Zone };
}

export interface ProductWithLocations extends Product {
  locations: ProductLocation[];
}

// Résultat du rangement d'une palette (renvoyé par /api/rangement), utilisé
// pour l'impression : une fiche par palette.
export interface RangementResultat {
  alveole_code: string;
  zone_code: string;
  zone_label: string | null;
  type_palette: TypePalette;
  colis: number;
  poids_palette_kg: number | null;
  capacite_kg: number | null;
  poids_actuel_kg: number | null;
  depassement: boolean;
}
