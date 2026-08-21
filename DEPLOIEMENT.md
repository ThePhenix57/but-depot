# Déploiement de BUT Dépôt

Guide pas à pas pour mettre le site en ligne avec Supabase (base de données +
comptes) et Vercel (hébergement). Compte ~30-45 min la première fois.

On va faire ça ensemble, dans l'ordre : Supabase d'abord (la base doit
exister avant que le site puisse s'y connecter), puis Vercel.

---

## 1. Créer le projet Supabase

1. Va sur https://supabase.com et crée un compte (ou connecte-toi).
2. Clique **New project**.
3. Choisis un nom (ex. `but-depot`), un mot de passe de base de données
   (génère-le et **note-le dans un endroit sûr**, on n'en aura plus besoin
   après mais Supabase le demande), et une région proche de toi (ex.
   `eu-west-3` Paris ou `eu-central-1` Frankfurt).
4. Clique **Create new project**. Attends 1-2 minutes que le projet soit prêt.

## 2. Exécuter le script de base de données

⚠️ **Si tu avais déjà exécuté une version précédente de `schema.sql`** (les
tables `zones`/`products` existaient avant l'ajout des alvéoles et
catégories) **et qu'il n'y a pas encore de vraies données à garder**,
exécute d'abord ceci dans le SQL Editor pour repartir propre (sinon le
nouveau script échouera sur des tables déjà existantes avec une structure
différente) :

```sql
drop table if exists public.product_locations cascade;
drop table if exists public.category_zones cascade;
drop table if exists public.alveoles cascade;
drop table if exists public.categories cascade;
drop table if exists public.products cascade;
drop table if exists public.zones cascade;
```

S'il y a déjà des données réelles que tu veux garder, dis-le moi avant de
lancer ça — on écrira une migration à la place.

1. Dans le tableau de bord du projet, va dans **SQL Editor** (menu de
   gauche).
2. Clique **New query**.
3. Ouvre le fichier `supabase/schema.sql` de ce projet, copie tout son
   contenu, colle-le dans l'éditeur SQL de Supabase.
4. Clique **Run** (ou `Ctrl+Enter`). Tu dois voir "Success. No rows
   returned" à la fin. Ça crée toutes les tables, les règles de sécurité et
   quelques zones/alvéoles d'exemple.

Si tu vois une erreur, copie le message et on regarde ensemble avant de
continuer — ne relance pas le script plusieurs fois d'affilée.

## 3. Récupérer les clés API

Supabase a récemment réorganisé cette partie du tableau de bord ; selon la
version que tu as, l'un ou l'autre chemin ci-dessous fonctionne.

**Le plus simple : le bouton "Connect"**
En haut de la page de ton projet (à côté du nom du projet), clique le
bouton **Connect**. Un panneau s'ouvre avec l'URL et les clés déjà prêtes à
copier.

**Sinon, via les réglages :**
1. **Project Settings** (icône engrenage) → **Data API** : tu y trouves le
   **Project URL** → ce sera `NEXT_PUBLIC_SUPABASE_URL`.
2. **Project Settings** → **API Keys** :
   - Si tu vois un onglet **"Legacy API Keys"**, ouvre-le pour retrouver les
     noms utilisés dans ce guide : **anon public** → ce sera
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, et **service_role** (clique "Reveal")
     → ce sera `SUPABASE_SERVICE_ROLE_KEY`.
   - Sinon (nouveau système de clés), utilise la **Publishable key** →
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, et la **Secret key** (clique "Reveal")
     → `SUPABASE_SERVICE_ROLE_KEY`. Elles s'utilisent exactement pareil,
     seul le nom a changé.

Dans les deux cas, note ces trois valeurs, on en aura besoin à l'étape 6.

⚠️ La clé **service_role** est secrète : elle donne un accès total à la
base, sans les règles de sécurité normales. Elle ne doit **jamais** être
mise dans le code, ni partagée, ni collée ailleurs que dans les variables
d'environnement Vercel (étape 6). Ne préfixe jamais cette variable par
`NEXT_PUBLIC_`.

## 4. Activer l'envoi d'emails d'invitation (comptes employés)

Par défaut, Supabase envoie les emails d'invitation via son propre service
avec des limites basses (utile pour tester, pas pour un usage régulier avec
toute l'équipe).

Pour un usage réel :

1. **Authentication** → **Email Templates** dans Supabase : tu peux
   personnaliser le texte de l'email "Invite user" si tu veux (facultatif).
2. **Project Settings** → **Authentication** → section **SMTP Settings** :
   configure un fournisseur d'envoi d'email (ex. Resend, Brevo/Sendinblue,
   Postmark — tous ont un plan gratuit largement suffisant pour une équipe
   d'entrepôt). Ça évite que les invitations finissent bloquées par les
   limites du service email par défaut de Supabase.

Cette étape peut être faite plus tard — tant qu'elle n'est pas faite, les
invitations fonctionnent mais avec un volume limité par jour.

## 5. Mettre le code sur GitHub

GitHub sert de "coffre" pour le code : Vercel se branche dessus et
redéploie automatiquement le site à chaque changement. C'est gratuit et
recommandé (sinon il faudrait redéployer à la main à chaque modification).

1. Va sur https://github.com et crée un compte (gratuit) si tu n'en as pas
   déjà un.
2. Clique **New repository** (bouton vert, ou le "+" en haut à droite →
   "New repository").
3. Donne-lui un nom (ex. `but-depot`), laisse-le en **Private** (recommandé,
   c'est un outil interne), ne coche aucune case d'initialisation (pas de
   README/gitignore — on a déjà les nôtres), clique **Create repository**.
4. Deux façons d'y mettre le code, choisis celle qui t'arrange :

   **Sans ligne de commande (le plus simple) :**
   Sur la page du dépôt tout neuf, clique le lien **"uploading an existing
   file"**. Dézippe le fichier `but-depot.zip` que je t'ai envoyé sur ton
   ordinateur, puis glisse-dépose tout son contenu (les fichiers ET dossiers
   à l'intérieur de `but-depot/`, pas le dossier `but-depot` lui-même) dans
   la zone d'upload. Valide avec **Commit changes**.

   **Avec Git (si tu l'as déjà utilisé) :**
   ```bash
   cd but-depot
   git init
   git add .
   git commit -m "Premier envoi"
   git branch -M main
   git remote add origin https://github.com/TON-COMPTE/but-depot.git
   git push -u origin main
   ```
   (remplace `TON-COMPTE` par ton nom d'utilisateur GitHub ; Git te
   demandera de te connecter à ton compte GitHub au moment du `push`.)

Après ça, ton code est sur GitHub — prêt pour l'étape suivante.

## 6. Déployer sur Vercel

1. Va sur https://vercel.com, connecte-toi (tu peux te connecter avec ton
   compte GitHub directement, c'est le plus simple).
2. Clique **Add New** → **Project**, choisis le dépôt GitHub que tu viens de
   créer (autorise Vercel à y accéder si demandé).
3. Avant de cliquer "Deploy", ouvre la section **Environment Variables** et
   ajoute les 3 valeurs notées à l'étape 3 :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Clique **Deploy**. Après 1-2 minutes, Vercel te donne une URL du type
   `but-depot.vercel.app` — c'est ton site, en ligne.

## 7. Créer le premier compte admin

Le tout premier compte doit être créé manuellement (avant ça, il n'y a
personne pour utiliser la page "Employés" de l'admin) :

1. Dans Supabase : **Authentication** → **Users** → **Add user** → **Create
   new user**.
2. Renseigne ton email et un mot de passe temporaire, décoche "Auto Confirm
   User" seulement si tu veux confirmer par email — sinon laisse-le coché
   pour pouvoir te connecter tout de suite.
3. Une fois le compte créé, va dans **Table Editor** → table `profiles` :
   une ligne a été créée automatiquement pour ce compte (rôle `employe` par
   défaut). Modifie la colonne `role` de cette ligne en `admin`.
4. Va sur ton site (`https://but-depot.vercel.app/login`) et connecte-toi
   avec cet email/mot de passe. Tu as maintenant accès à **Zones** et
   **Employés** dans le menu — utilise la page Employés pour inviter tout le
   monde ensuite (ça évite de repasser par Supabase pour les comptes
   suivants).

## 8. Installer le site comme une application (sans barre d'adresse)

Le site a un manifeste d'application (`src/app/manifest.ts`) qui le rend
installable : une fois installé, il s'ouvre dans sa propre fenêtre avec
juste l'icône et le nom BUT, sans barre d'adresse ni URL visible — c'est la
façon normale de "cacher" l'URL pour un outil interne comme celui-ci.

- **Sur ordinateur (Chrome/Edge)** : ouvre le site, clique l'icône
  d'installation dans la barre d'adresse (ou menu ⋮ → "Installer BUT
  Dépôt..."). Une fenêtre dédiée s'ouvre, sans barre d'adresse.
- **Sur téléphone/tablette Android (Chrome)** : menu ⋮ → "Ajouter à l'écran
  d'accueil". Sur iPhone/iPad (Safari) : bouton Partager → "Sur l'écran
  d'accueil".

Pour remplacer aussi `but-entrepot.vercel.app` par un vrai nom de domaine
(ex. `depot.but.fr`), il faut posséder ce domaine et le connecter dans
Vercel (**Settings → Domains**) — dis-moi si c'est quelque chose que tu
veux mettre en place, ça se fait à part.

## Mises à jour futures

Une fois déployé, toute modification du code poussée sur la branche
principale de GitHub redéploie automatiquement le site sur Vercel — pas
besoin de repasser par cette procédure. Seule une modification du schéma de
base de données (nouvelle table, nouvelle colonne) demanderait de repasser
par le **SQL Editor** de Supabase.
