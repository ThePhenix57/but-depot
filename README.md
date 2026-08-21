# BUT Dépôt — Fiche rangement de marchandise

Application web pour la réception et le rangement de marchandise en
entrepôt : recherche par code EAN, ajout de nouveaux produits, gestion des
emplacements sur un plan visuel, impression de fiches A4, et comptes
nominatifs avec droits admin/employé.

Remplace le classeur Google Sheets utilisé précédemment. Voir
[`DEPLOIEMENT.md`](./DEPLOIEMENT.md) pour la mise en ligne.

## Fonctionnement

- **Employé** : scanne ou tape un code EAN sur `/recherche`.
  - Si le produit existe déjà : son nom et son ou ses emplacement(s)
    s'affichent, avec le plan de l'entrepôt qui met en surbrillance les
    zones concernées. Possibilité d'ajouter un emplacement supplémentaire,
    ou d'imprimer la fiche (A4 paysage).
  - Si le produit n'existe pas : formulaire pour l'enregistrer (nom +
    premier emplacement).
  - Un code d'emplacement qui n'existe pas encore sur le plan est créé
    automatiquement (à repositionner ensuite par un admin si besoin).
- **Admin / direction** (`/admin/zones` et `/admin/employes`) : déplace,
  redimensionne ou supprime les zones du plan ; crée les comptes employés
  (invitation par email) et gère leurs rôles.

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
src/lib/zones.ts           Logique "trouver ou créer une zone" partagée
src/middleware.ts          Protection des routes / rafraîchissement session
src/app/recherche/         Page principale (recherche EAN, plan, fiche)
src/app/admin/zones/       Gestion du plan de l'entrepôt (admin)
src/app/admin/employes/    Gestion des comptes employés (admin)
src/app/api/               Routes API (produits, emplacements, zones, employés)
src/components/            Composants réutilisables (plan, fiche imprimable, en-tête)
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

Le logo affiché est un bloc de remplacement en attendant le fichier
officiel. Voir `DEPLOIEMENT.md`, section 7, pour l'intégrer une fois reçu.
