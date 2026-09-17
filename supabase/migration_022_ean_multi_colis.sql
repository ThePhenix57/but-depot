-- Meubles livrés en plusieurs colis sous le même produit (EAN-13) : chaque
-- colis porte un code plus long, l'EAN-13 du produit suivi de 2 chiffres
-- (numéro de colis, ex: "01", "02"...) collés directement derrière — ex.
-- EAN-13 "1234567890120" -> colis 1 "123456789012001".
-- "colis_multiples" indique que ce produit fonctionne ainsi ;
-- "nb_colis_par_meuble" est juste indicatif (affiché pour l'agent, ne
-- bloque rien). Voir /api/produits/recherche pour la logique de recherche
-- qui reconnaît un de ces codes plus longs et retrouve le bon produit.
alter table public.products add column if not exists colis_multiples boolean not null default false;
alter table public.products add column if not exists nb_colis_par_meuble integer;

notify pgrst, 'reload schema';
