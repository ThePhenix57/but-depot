import type { TypePalette } from "@/lib/palettes";

// "dev" : peut créer des zones/alvéoles/catégories et toucher au plan de
// l'entrepôt, mais ne peut rien supprimer et n'a accès à rien d'autre côté
// admin (employés, produits, signalements, journal, planning, objectifs).
export type Role = "employe" | "admin" | "dev";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  // Facultative — sert à mettre en avant l'anniversaire de chacun sur la
  // page d'accueil (voir /admin/employes).
  date_naissance: string | null;
  // Accès à la section SAV (/sav) pour un compte "employe" — admin et dev y
  // ont toujours accès quelle que soit cette case (voir /admin/employes).
  acces_sav: boolean;
  created_at: string;
}

// Un rectangle dessiné sur la photo du plan (% 0-100). Une zone peut en
// avoir plusieurs (ex: une même allée coupée en deux endroits séparés sur
// le plan) — voir /admin/zones, bouton "Ajouter un rectangle".
export interface ZoneRect {
  id: string;
  pos_x_pct: number;
  pos_y_pct: number;
  largeur_pct: number;
  hauteur_pct: number;
}

export interface Zone {
  id: string;
  code: string;
  label: string | null;
  couleur: string;
  // Les rectangles de cette zone sur la photo du plan. Absent/vide tant
  // que la zone n'a pas encore été placée, ou quand cette zone est
  // récupérée dans un contexte qui n'a pas besoin de sa position (ex:
  // emplacements d'un produit).
  rects?: ZoneRect[];
  // Sur le terrain le numéro de travée augmente en s'éloignant de
  // l'accueil, dans un sens qui dépend de l'orientation de l'allée sur le
  // plan : true = affiche les travées du plus grand numéro au plus petit
  // dans l'aperçu (voir ZoneApercu), pour coller à ce qu'on voit en vrai.
  ordre_inverse?: boolean;
}

// Une ligne de contenu d'alvéole renvoyée par /api/alveoles/contenu — sert
// à l'aperçu d'une zone/travée (voir ce qui est stocké sans chercher un
// produit précis d'abord).
export interface AlveoleContenuItem {
  id: string;
  alveole_id: string;
  colis: number;
  type_palette: TypePalette | null;
  product: { id: string; name: string; ean: string } | null;
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
  bloquee: boolean;
  bloquee_motif: string | null;
  bloquee_at: string | null;
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
  // Simple conseil (pas une règle bloquante) : quel type de palette
  // privilégier pour décharger/ranger ce produit.
  palette_conseillee: TypePalette | null;
  created_at: string;
  // Meuble livré en plusieurs colis sous le même EAN-13 (voir
  // migration_022_ean_multi_colis.sql) : chaque colis porte un code plus
  // long, l'EAN-13 suivi de 2 chiffres collés directement derrière (ex:
  // "1234567890120" -> colis 1 "123456789012001"). nb_colis_par_meuble
  // est juste indicatif, affiché pour l'agent.
  colis_multiples: boolean;
  nb_colis_par_meuble: number | null;
}

// Zone spéciale personnalisable (tampon, Drive, CAM, chariot...) : pas de
// position sur le plan, juste un nom + un identifiant pour générer un QR
// code avec le même préfixe que les alvéoles. Voir /admin/zones-speciales.
export type TypeZoneSpeciale = "tampon" | "drive" | "cam" | "chariot" | "autre";

export interface ZoneSpeciale {
  id: string;
  type: TypeZoneSpeciale;
  nom: string;
  identifiant: string;
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

export interface Signalement {
  id: string;
  alveole_id: string;
  message: string;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
  expires_at: string | null;
  traite: boolean;
  alveole?: Alveole & { zone: Zone };
}

// Un horaire de travail (voir /admin/planning et /planning). "date" au
// format "YYYY-MM-DD", heures au format "HH:MM" ou "HH:MM:SS" (Postgres
// "time" — les deux se comparent/affichent pareil une fois tronqués).
export interface Planning {
  id: string;
  employe_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  pause_debut: string | null;
  pause_fin: string | null;
  // true = jour de repos exceptionnel pour cette date (annule l'horaire
  // habituel de ce jour, voir horairesEffectifs) — heure_debut/heure_fin
  // sont alors ignorées.
  repos: boolean;
  employe?: { full_name: string | null; email: string } | null;
}

// Un horaire "habituel" : jour de semaine (1 = lundi ... 7 = dimanche),
// appliqué pour toujours (voir /admin/planning, vue "Horaires habituels").
// Une exception ponctuelle (Planning ci-dessus) prend le pas sur cet
// horaire pour une date précise.
export interface PlanningRecurrent {
  id: string;
  employe_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  pause_debut: string | null;
  pause_fin: string | null;
  employe?: { full_name: string | null; email: string } | null;
}

// Réglages globaux du site (une seule ligne en base) — voir
// /admin/alveoles, section "Format du QR code".
export interface Parametres {
  qr_prefixe_alveole: string;
}

// Un objectif/tâche de la semaine (voir /admin/objectifs et la page
// d'accueil) : global à l'équipe (employe_id null) ou pour un employé
// précis, pour toute la semaine (date null) ou un jour précis.
export interface Objectif {
  id: string;
  semaine_debut: string;
  employe_id: string | null;
  date: string | null;
  texte: string;
  created_at: string;
  employe?: { full_name: string | null; email: string } | null;
}

export type ChannelType = "global" | "admin" | "direct";

export interface Message {
  id: string;
  channel_type: ChannelType;
  sender_id: string;
  sender_name?: string | null;
  recipient_id: string | null;
  content: string;
  created_at: string;
}

// Type d'une ligne du journal global (voir /admin/journal, admin
// uniquement) : rangement (réception), sortie (vidage/retrait),
// verification (contrôle périodique "toujours là"), signalement (problème
// signalé sur une alvéole).
export type TypeMouvement = "rangement" | "sortie" | "verification" | "signalement";

// Une ligne du journal global (voir /admin/journal, admin uniquement).
export interface Mouvement {
  id: string;
  type: TypeMouvement;
  colis: number | null;
  type_palette: TypePalette | null;
  message: string | null;
  created_at: string;
  product: { ean: string; name: string } | null;
  alveole: { code: string; zone: { code: string; label: string | null } | null } | null;
  auteur: { full_name: string | null; email: string } | null;
}

// Un emplacement (produit + alvéole) qui n'a pas été confirmé "toujours là"
// depuis plus d'un mois — voir /verifications, accessible à tous les
// employés.
export interface EmplacementAVerifier {
  id: string;
  colis: number;
  verifie_at: string;
  added_at: string;
  product: { id: string; name: string; ean: string } | null;
  alveole: { id: string; code: string; zone: { id: string; code: string; label: string | null } | null } | null;
}

// Une sauvegarde gardée à chaque réinitialisation du journal (voir
// /admin/journal, section admin protégée par code — migration_008).
export interface JournalResetBackup {
  id: string;
  created_at: string;
  motif: string;
  nb_lignes: number;
  contenu: Mouvement[];
  auteur: { full_name: string | null; email: string } | null;
}

// ----------------------------------------------------------------------------
// SAV (service après-vente) — voir /sav, migration_020_sav.sql.
// ----------------------------------------------------------------------------

// Une colonne du tableau (statut) — personnalisable par admin/dev.
export interface SavColonne {
  id: string;
  nom: string;
  ordre: number;
}

export type SavCategorieProduit = "meuble" | "electromenager" | "autre";
export type SavChampType = "checkbox" | "texte";

// Un champ personnalisé (case à cocher ou texte libre), ajouté par
// admin/dev, filtré par catégorie de produit (ou visible pour toutes si
// categorie est null).
export interface SavChampPerso {
  id: string;
  label: string;
  type: SavChampType;
  categorie: "meuble" | "electromenager" | null;
  ordre: number;
}

// Valeur d'un champ personnalisé pour un ticket précis.
export interface SavTicketChamp {
  id: string;
  ticket_id: string;
  champ_id: string;
  valeur_bool: boolean | null;
  valeur_texte: string | null;
  champ?: SavChampPerso;
}

export interface SavCommentaire {
  id: string;
  ticket_id: string;
  auteur_id: string | null;
  texte: string;
  created_at: string;
  auteur?: { full_name: string | null; email: string } | null;
}

// Un ticket SAV — carte du tableau façon Trello.
export interface SavTicket {
  id: string;
  numero: number;
  client_nom: string;
  client_prenom: string;
  numero_facture: string | null;
  produit_id: string | null;
  produit_nom: string;
  produit_ref: string | null;
  produit_ean: string | null;
  categorie: SavCategorieProduit;
  commentaire: string | null;
  colonne_id: string;
  ordre: number;
  ylios_fait: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  createur?: { full_name: string | null; email: string } | null;
  champs?: SavTicketChamp[];
  nb_commentaires?: number;
}
