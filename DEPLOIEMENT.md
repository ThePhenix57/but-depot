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

1. Dans le tableau de bord du projet, va dans **SQL Editor** (menu de
   gauche).
2. Clique **New query**.
3. Ouvre le fichier `supabase/schema.sql` de ce projet, copie tout son
   contenu, colle-le dans l'éditeur SQL de Supabase.
4. Clique **Run** (ou `Ctrl+Enter`). Tu dois voir "Success. No rows
   returned" à la fin. Ça crée toutes les tables, les règles de sécurité et
   3 emplacements d'exemple (A12, B03, C05).

Si tu vois une erreur, copie le message et on regarde ensemble avant de
continuer — ne relance pas le script plusieurs fois d'affilée.

## 3. Récupérer les clés API

1. Toujours dans le tableau de bord Supabase : **Project Settings**
   (l'icône engrenage) → **API**.
2. Note ces trois valeurs, on en aura besoin à l'étape 5 :
   - **Project URL** → ce sera `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** (sous "Project API keys") → ce sera
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (cliquer "Reveal" pour la voir) → ce sera
     `SUPABASE_SERVICE_ROLE_KEY`

⚠️ La clé **service_role** est secrète : elle donne un accès total à la
base, sans les règles de sécurité normales. Elle ne doit **jamais** être
mise dans le code, ni partagée, ni collée ailleurs que dans les variables
d'environnement Vercel (étape 5). Ne préfixe jamais cette variable par
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

## 5. Déployer sur Vercel

1. Mets le code sur GitHub (crée un dépôt, pousse le contenu de ce dossier).
2. Va sur https://vercel.com, connecte-toi (tu peux te connecter avec ton
   compte GitHub directement).
3. Clique **Add New** → **Project**, choisis le dépôt GitHub que tu viens de
   créer.
4. Avant de cliquer "Deploy", ouvre la section **Environment Variables** et
   ajoute les 3 valeurs notées à l'étape 3 :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Clique **Deploy**. Après 1-2 minutes, Vercel te donne une URL du type
   `but-depot.vercel.app` — c'est ton site, en ligne.

## 6. Créer le premier compte admin

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

## 7. Ajouter le vrai logo BUT

Le site utilise pour l'instant un bloc rouge "BUT" en attendant le vrai
fichier logo :

1. Place le fichier logo dans `public/logo-but.png` (ou `.svg`).
2. Dans `src/components/Header.tsx` et `src/app/login/page.tsx`, remplace le
   bloc de remplacement (commenté `{/* Remplace ce bloc... */}`) par une
   balise `<img src="/logo-but.png" ... />` ou `next/image`.
3. Si les couleurs officielles BUT diffèrent du rouge provisoire
   (`#E2001A`) utilisé dans `tailwind.config.ts`, dis-le moi et on ajuste
   les codes couleur.

## Mises à jour futures

Une fois déployé, toute modification du code poussée sur la branche
principale de GitHub redéploie automatiquement le site sur Vercel — pas
besoin de repasser par cette procédure. Seule une modification du schéma de
base de données (nouvelle table, nouvelle colonne) demanderait de repasser
par le **SQL Editor** de Supabase.
