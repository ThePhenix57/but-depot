# BUT Dépôt — Fiche rangement de marchandise

Application web pour la réception et le rangement de marchandise en
entrepôt : recherche par code EAN, ajout de nouveaux produits, gestion des
emplacements sur un plan visuel, impression de fiches A4, et comptes
nominatifs avec droits admin/employé.

Remplace le classeur Google Sheets utilisé précédemment. Voir
[`DEPLOIEMENT.md`](./DEPLOIEMENT.md) pour la mise en ligne.

## Fonctionnement

Le plan de l'entrepôt a deux niveaux : des **zones** (les grandes allées,
ex. "F") affichées sur le plan visuel, et à l'intérieur de chaque zone des
**alvéoles** précises (ex. "F1-0-A") avec leur propre capacité de poids.

- **Employé** : scanne ou tape un code EAN sur `/recherche`.
  - Si le produit existe déjà : son nom, sa catégorie et ses alvéoles
    s'affichent, avec le plan qui met en surbrillance forte les zones où il
    est déjà stocké et en surbrillance légère les zones suggérées pour sa
    catégorie (ex. "Literie" → zones F à H).
  - Si le produit n'existe pas : formulaire pour l'enregistrer (nom,
    catégorie, poids/colis, colis par palette — ces derniers facultatifs).
  - Pour ranger une réception : indique le nombre de palettes, le type de
    chacune (**palette EUR** 1200x800mm ou **palette centrale/à chevron**
    2400x900mm) et l'alvéole choisie (existante ou nouvelle). Le site
    calcule le poids de chaque palette et alerte si la capacité de
    l'alvéole est dépassée (sans bloquer — l'alerte reste affichée et
    imprimée sur la fiche pour que ce soit vérifié). Imprime ensuite
    automatiquement une fiche A4 paysage par palette.
  - Un code d'alvéole qui n'existe pas encore est créé automatiquement (à
    compléter ensuite côté admin : capacité, taille de palette acceptée).
- **Admin / direction** :
  - `/admin/zones` — les grandes zones du plan.
  - `/admin/alveoles` — les alvéoles précises (création une par une ou en
    série sur une plage, capacité en kg, taille de palette max acceptée).
  - `/admin/categories` — associe chaque catégorie de produit aux zones où
    elle doit être rangée.
  - `/admin/produits` — catégorie, poids/colis et colis par palette de
    chaque produit.
  - `/admin/employes` — comptes employés (invitation par email) et rôles.

## Stack technique

- [Next.js 15](https://nextjs.org) (App Router, TypeScript) — hébergé sur
  [Vercel](https://vercel.com)
- [Supabase](https://supabase.com) — base de données Postgres,
  authentification par email/mot de passe, règles de sécurité (Row Level
  Security)
- [Tailwind CSS](https://tailwindcss.com) pour le style

## Développement local

```bash
npm install
cp .env.local.example .env.local   # puis renseigne tes clés Supabase
npm run dev
```

Le site est disponible sur http://localhost:3000. Il faut un projet
Supabase avec le schéma `supabase/schema.sql` déjà exécuté (voir
`DEPLOIEMENT.md`, étapes 1-3) et au moins un compte admin créé pour accéder
aux pages `/admin/*`.

## Structure du projet

```
supabase/schema.sql        Schéma de base de données + règles de sécurité
src/lib/supabase/          Clients Supabase (navigateur, serveur, admin)
src/lib/alveoles.ts        Logique "trouver/créer une alvéole, ajouter des colis" partagée
src/lib/palettes.ts        Types de palette (EUR / centrale) et règles de compatibilité
src/middleware.ts          Protection des routes / rafraîchissement session
src/app/recherche/         Page principale (recherche EAN, rangement, plan, fiches)
src/app/admin/zones/       Gestion des zones du plan (admin)
src/app/admin/alveoles/    Gestion des alvéoles précises (admin)
src/app/admin/categories/  Zones autorisées par catégorie de produit (admin)
src/app/admin/produits/    Catégorie/poids/colis par palette de chaque produit (admin)
src/app/admin/employes/    Gestion des comptes employés (admin)
src/app/api/               Routes API (produits, rangement, alvéoles, zones, catégories, employés)
src/components/            Composants réutilisables (plan, sélecteur d'alvéole, fiches imprimables, en-tête)
```

## Sécurité

- Chaque table est protégée par des règles Postgres (Row Level Security) :
  seuls les comptes `admin` peuvent modifier ou supprimer des zones, des
  produits ou des emplacements ; tout compte authentifié peut consulter et
  ajouter.
- La clé `service_role` Supabase (accès total, utilisée uniquement pour
  créer/supprimer des comptes employés) n'est utilisée que côté serveur et
  ne doit jamais être exposée au navigateur — voir les avertissements dans
  `.env.local.example`.
- 0 vulnérabilité connue sur les dépendances au moment de la rédaction
  (`npm audit`) — Next.js 15.5.23, dernière version stable patchée.

## Logo et couleurs BUT

Le logo fourni est utilisé dans `public/logo-but.png` (en-tête, page de
connexion, icône du site). Le rouge (`#ED1C24`) est échantillonné
directement depuis ce fichier — si ce n'est pas exactement le rouge de la
charte graphique officielle, ajuste les codes dans `tailwind.config.ts`.

Le site est aussi installable comme une application (icône + nom BUT, sans
barre d'adresse) — voir `DEPLOIEMENT.md`, section 8.
