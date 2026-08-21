import { createClient } from "@/lib/supabase/server";
import { createAlveole, findAlveoleByCode, getOccupancy, ajouterColis } from "@/lib/alveoles";
import { alveoleAcceptePalette, type TypePalette } from "@/lib/palettes";
import { NextRequest, NextResponse } from "next/server";

interface PaletteInput {
  typePalette: TypePalette;
  alveoleId?: string;
  newAlveole?: { zoneId: string; code: string; capaciteKg?: number | null; taillePaletteMax?: string | null };
  colisOverride?: number;
}

// POST /api/rangement
// Body: { productId, palettes: PaletteInput[] }
//
// Range une ou plusieurs palettes d'un même produit reçu : pour chaque
// palette, trouve/crée l'alvéole choisie, calcule le poids (poids/colis x
// colis/palette du produit, ou colisOverride si le produit n'a pas encore
// ces infos), l'ajoute au total déjà stocké dans l'alvéole, et renvoie tout
// ce qu'il faut pour imprimer une fiche par palette.
//
// Le dépassement de la capacité d'une alvéole n'est jamais bloquant (il n'y
// a pas toujours un meilleur endroit disponible sur le moment) : il est
// juste signalé clairement (depassement: true) pour que l'employé et
// l'admin le voient et réagissent si besoin. En revanche, une palette dont
// la taille ne rentre physiquement pas dans l'alvéole (ex: palette centrale
// dans une alvéole limitée à l'EUR) est refusée.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const productId = String(body.productId || "").trim();
  const palettes: PaletteInput[] = Array.isArray(body.palettes) ? body.palettes : [];

  if (!productId || palettes.length === 0) {
    return NextResponse.json({ error: "Produit et au moins une palette sont obligatoires." }, { status: 400 });
  }
  if (palettes.length > 50) {
    return NextResponse.json({ error: "Trop de palettes en une fois (max 50)." }, { status: 400 });
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, poids_colis_kg, colis_par_palette_eur, colis_par_palette_centrale")
    .eq("id", productId)
    .single();
  if (productError || !product) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  const resultats = [];

  for (const p of palettes) {
    const typePalette = p.typePalette === "centrale" ? "centrale" : "eur";

    // 1. Résout (ou crée) l'alvéole cible.
    let alveole: { id: string; zone_id: string; code: string; capacite_kg: number | null; taille_palette_max: TypePalette | null } | null = null;

    if (p.alveoleId) {
      const { data, error } = await supabase
        .from("alveoles")
        .select("id, zone_id, code, capacite_kg, taille_palette_max")
        .eq("id", p.alveoleId)
        .single();
      if (error || !data) {
        return NextResponse.json({ error: `Alvéole introuvable (${p.alveoleId}).` }, { status: 404 });
      }
      alveole = data;
    } else if (p.newAlveole) {
      const code = p.newAlveole.code.trim().toUpperCase();
      const { data: existing } = await findAlveoleByCode(supabase, code);
      if (existing) {
        alveole = existing;
      } else {
        const { data, error } = await createAlveole(supabase, {
          zoneId: p.newAlveole.zoneId,
          code,
          capaciteKg: p.newAlveole.capaciteKg,
          taillePaletteMax: p.newAlveole.taillePaletteMax,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        alveole = data;
      }
    } else {
      return NextResponse.json({ error: "Chaque palette doit indiquer une alvéole." }, { status: 400 });
    }

    // 2. Vérifie que la palette rentre physiquement dans l'alvéole.
    if (!alveoleAcceptePalette(alveole.taille_palette_max, typePalette)) {
      return NextResponse.json(
        {
          error: `L'alvéole ${alveole.code} est limitée à la palette EUR : une palette centrale n'y rentre pas.`,
        },
        { status: 400 }
      );
    }

    // 3. Calcule le nombre de colis et le poids de cette palette.
    const colisParPalette =
      typePalette === "centrale" ? product.colis_par_palette_centrale : product.colis_par_palette_eur;
    const colis = colisParPalette ?? p.colisOverride ?? null;
    if (!colis) {
      return NextResponse.json(
        {
          error:
            "Nombre de colis par palette inconnu pour ce produit. Renseigne-le dans la fiche produit, ou indique le nombre de colis pour cette palette.",
        },
        { status: 400 }
      );
    }
    const poidsPaletteKg = product.poids_colis_kg != null ? Number(product.poids_colis_kg) * colis : null;

    // 4. Occupation actuelle de l'alvéole (avant ajout) pour calculer le dépassement.
    const { data: occupancyBefore } = await getOccupancy(supabase, alveole.id);
    const poidsActuelAvant = occupancyBefore?.poids_actuel_kg ?? 0;
    const poidsApres = poidsActuelAvant + (poidsPaletteKg ?? 0);
    const depassement = alveole.capacite_kg != null && poidsPaletteKg != null && poidsApres > alveole.capacite_kg;

    // 5. Enregistre les colis.
    const { error: addError } = await ajouterColis(supabase, {
      productId,
      alveoleId: alveole.id,
      colis,
      typePalette,
      addedBy: user.id,
    });
    if (addError) return NextResponse.json({ error: addError }, { status: 500 });

    // 6. Infos de la zone pour la fiche imprimée.
    const { data: zone } = await supabase
      .from("zones")
      .select("code, label")
      .eq("id", alveole.zone_id)
      .single();

    resultats.push({
      alveole_code: alveole.code,
      zone_code: zone?.code ?? "",
      zone_label: zone?.label ?? null,
      type_palette: typePalette,
      colis,
      poids_palette_kg: poidsPaletteKg,
      capacite_kg: alveole.capacite_kg,
      poids_actuel_kg: poidsApres,
      depassement,
    });
  }

  return NextResponse.json({ resultats });
}
