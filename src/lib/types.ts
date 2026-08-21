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

export interface Product {
  id: string;
  ean: string;
  name: string;
  created_at: string;
}

export interface ProductLocation {
  id: string;
  product_id: string;
  zone_id: string;
  zone: Zone;
}

export interface ProductWithLocations extends Product {
  locations: Zone[];
}
