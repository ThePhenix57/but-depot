# Déploiement de BUT Dépôt

Guide pas à pas pour mettre le site en ligne avec Supabase (base de données +
comptes) et Vercel (hébergement). Compte ~30-45 min la première fois.

On va faire ça ensemble, dans l'ordre : Supabase d'abord (la base doit
exister avant que le site puisse s'y connecter), puis Vercel.

---

## 🆕 Site déjà en ligne ? Mets ta base à jour

Si ton site fonctionne déjà (connexion OK), tu n'as **pas** besoin de
refaire les étapes 1 à 7 ci-dessous. Lance juste ces scripts, **dans cet
ordre**, dans Supabase : **SQL Editor** → **New query** → colle le contenu
du fichier → **Run** → répète avec le suivant :

1. `supabase/migration_001_alveoles_produits_categories.sql` — crée les
   tables alvéoles/catégories/produits si ta base ne les a pas encore (site
   mis en place avant l'ajout de ces fonctionnalités).
2. `supabase/migration_002_signalements_messages.sql` — ajoute le
   signalement/blocage d'alvéole et la messagerie.
3. `supabase/migration_003_categories.sql` — normalement plus nécessaire
   après le 1, mais sans danger à lancer quand même si tu as un doute.
4. `supabase/migration_004_journal.sql` — ajoute le journal des rangements
   (`/admin/journal`, réservé aux admins).
5. `supabase/migration_005_zones_plan_image.sql` — permet de positionner les
   zones directement sur la photo du plan (clic-glisser dans
   `/admin/zones`) au lieu de la grille de cases.
6. `supabase/migration_006_product_locations_legacy_zone_id.sql` — corrige
   une colonne `zone_id` héritée d'une très ancienne version du site sur
   `product_locations`, qui empêchait tout rangement.
7. `supabase/migration_007_zones_plusieurs_rectangles.sql` — permet à une
   zone de couvrir plusieurs rectangles séparés sur le plan (ex: un rack
   coupé en deux endroits différents).
8. `supabase/migration_008_journal_reset_securise.sql` — ajoute le code
   admin protégeant la réinitialisation du journal des rangements et ses
   sauvegardes.
9. `supabase/migration_009_journal_global_verifications.sql` — transforme le
   journal des rangements en journal global (rangement/sortie/vérification/
   signalement) et ajoute le suivi de dernière vérification sur chaque
   emplacement (page `/verifications`).
10. `supabase/migration_010_palette_conseillee.sql` — ajoute la "palette
    conseillée" (EUR ou centrale) sur la fiche produit, un simple conseil
    pour le déchargement/rangement.
11. `supabase/migration_011_planning.sql` — ajoute le planning des employés
    (`/admin/planning` pour le gérer, `/planning` pour le consulter et
    l'imprimer, rappel du jour sur la page d'accueil).
12. `supabase/migration_012_zones_ordre_inverse.sql` — ajoute un réglage par
    zone pour afficher les travées dans le même ordre que sur le terrain
    dans l'aperçu (`/admin/zones`, case "Inverser l'ordre des travées").
13. `supabase/migration_013_planning_recurrent.sql` — ajoute les "horaires
    habituels" (planning récurrent, appliqué pour toujours) sur
    `/admin/planning`, avec la possibilité d'exceptionner une semaine
    précise sans toucher à l'habituel.
14. `supabase/migration_014_anniversaires.sql` — ajoute la date de naissance
    sur le profil (`/admin/employes`), pour mettre en avant les
    anniversaires du jour sur la page d'accueil (avec confettis pour la
    personne concernée).
15. `supabase/migration_015_planning_repos.sql` — ajoute la possibilité de
    poser un "jour de repos" exceptionnel sur `/admin/planning` (vue
    Semaine), qui annule l'horaire habituel de ce jour au lieu de s'y
    ajouter (corrige les totaux d'heures faux quand on échange un jour
    travaillé contre un jour de repos dans la même semaine).
16. `supabase/migration_016_parametres_qr.sql` — ajoute une table de
    réglages globaux (une seule ligne) avec le préfixe collé devant le code
    d'une alvéole pour générer son QR (`/admin/alveoles`, section "Format
    du QR code") — utile pour coller au format attendu par un lecteur/PDA
    existant sans changer le code affiché en clair sur l'étiquette.
17. `supabase/migration_017_mouvements_delete_policy.sql` — corrige un bug
    de la réinitialisation du journal (`/admin/journal`) : il manquait
    l'autorisation de suppression sur la table du journal, donc la
    sauvegarde se faisait mais le vidage ne supprimait rien réellement.
18. `supabase/migration_018_objectifs.sql` — ajoute les objectifs/tâches de
    la semaine (`/admin/objectifs`) : objectifs globaux pour toute l'équipe,
    ou tâches pour un employé précis (toute la semaine ou un jour donné),
    affichés sur la page d'accueil.
19. `supabase/migration_019_role_dev.sql` — ajoute le rôle "dev" (voir plus
    bas, section "Rôle dev").
20. `supabase/migration_020_sav.sql` — ajoute le SAV (`/sav`) : tickets
    clients sur un tableau façon Trello, colonnes et champs personnalisés
    configurables par admin/dev, case "accès SAV" par employé (voir plus
    bas, section "SAV").
21. `supabase/migration_021_zones_speciales.sql` — ajoute les zones
    spéciales (`/admin/zones-speciales`) : zone tampon, Drive, CAM,
    chariot... personnalisables, avec génération de QR code (voir plus bas,
    section "Zones spéciales").
22. `supabase/migration_022_ean_multi_colis.sql` — ajoute la gestion des
    meubles livrés en plusieurs colis sous le même EAN-13 (voir plus bas,
    section "Meuble en plusieurs colis (EAN multi-colis)").

Chaque script est additif (n'efface jamais rien) et sûr à relancer plusieurs
fois. Une fois fait, remets le code à jour sur GitHub (dépôt
**but-entrepot**, pas `but-depot`) comme à l'étape 5 — Vercel redéploiera
tout seul.

⚠️ Ne lance **jamais** `schema.sql` sur une base qui a déjà de vraies
données (ça la réinitialiserait) — seuls les fichiers `migration_...sql`
sont prévus pour être exécutés sur une base existante, en plus de ce qui y
est déjà.

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
   ajoute les 4 valeurs :
   - `NEXT_PUBLIC_SUPABASE_URL` (notée à l'étape 3)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (notée à l'étape 3)
   - `SUPABASE_SERVICE_ROLE_KEY` (notée à l'étape 3)
   - `CRON_SECRET` — une longue suite de caractères aléatoires que tu
     inventes (ex: génère-en une sur https://www.uuidgenerator.net/) ;
     protège la réinitialisation automatique hebdomadaire du journal, voir
     plus bas "Réinitialisation automatique du journal".
4. Clique **Deploy**. Après 1-2 minutes, Vercel te donne une URL du type
   `but-depot.vercel.app` — c'est ton site, en ligne.

Le fichier `vercel.json` du projet déclare une tâche planifiée ("cron") qui
appelle `/api/mouvements/reset-auto` chaque dimanche à 23h UTC (~lundi 00h ou
01h heure de Paris selon l'heure d'été/hiver — Vercel Cron ne gère pas les
fuseaux horaires, donc l'heure exacte glisse d'une heure entre été et hiver,
mais ça reste bien "début de semaine, heure de Paris"). Vercel s'en occupe
tout seul dès que le projet est déployé avec `CRON_SECRET` défini — rien
d'autre à faire. Si tu préfères une autre fréquence ou un autre jour/heure,
modifie le champ `"schedule"` dans `vercel.json` (syntaxe cron classique) et
redéploie.

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

## Réinitialisation automatique du journal

Le journal des rangements (`/admin/journal`) se vide tout seul chaque
semaine (voir ci-dessus, `vercel.json` + `CRON_SECRET`) : une sauvegarde
complète est gardée avant, exactement comme pour une réinitialisation
manuelle depuis l'admin (motif "Réinitialisation automatique hebdomadaire").
Le bouton manuel de réinitialisation reste disponible pour une remise à zéro
exceptionnelle, mais tu n'as plus besoin de le faire chaque semaine.

## Rôle "dev"

En plus de "employé" et "admin", un compte peut avoir le rôle "dev" (menu
Employés → colonne Rôle) : un compte dev a exactement les mêmes accès qu'un
employé normal (planning, recherche/rangement, vérifications, page
d'accueil, messagerie globale et messages directs...), avec en plus le
droit de construire le plan de l'entrepôt, sans jamais avoir accès aux
à-côtés réservés à l'admin/direction. Concrètement, un compte dev peut en
plus :

- Créer et modifier des zones, dessiner/ajuster les rectangles sur le plan
  (`/admin/zones`).
- Créer des alvéoles (`/admin/alveoles`), sans pouvoir les modifier ni les
  supprimer.
- Créer des catégories et leur associer des zones (`/admin/categories`),
  sans pouvoir les modifier ni les supprimer.

Un compte dev n'a en revanche accès à rien de ce qui est réservé aux vrais
admins : Employés, la gestion des Produits (`/admin/produits`, ajout et
modification des fiches), Signalements, Journal des rangements, gestion du
Planning et des Objectifs de la semaine restent invisibles et inaccessibles
(y compris en tapant l'adresse directement), et il ne voit jamais la
discussion "Admin" de la messagerie.

## Correctif fuseau horaire (heure de Paris)

Les pages qui tournent côté serveur (page d'accueil, cron de réinitialisation
du journal...) s'exécutent sur les machines Vercel réglées en UTC, alors que
l'entrepôt est à l'heure de Paris (UTC+1 l'hiver, UTC+2 l'été). Sans
précaution, "aujourd'hui" pouvait afficher la veille entre minuit et 1h-2h du
matin heure de Paris (ex : 1h03 un lundi encore compté comme dimanche). Toutes
ces pages utilisent maintenant `maintenantParis()` (`src/lib/semaine.ts`) pour
calculer la date du jour à l'heure de Paris plutôt qu'en UTC. Aucune migration
n'est nécessaire pour ce correctif, uniquement du code.

## SAV

`/sav` (visible dans le menu si tu y as accès) : suivi des tickets SAV
clients sur un tableau façon Trello — glisser une carte change son statut.

Accès : les admins et les comptes dev y ont toujours accès. Un compte
"employe" y accède seulement si un admin a coché "Accès SAV" sur sa fiche
(`/admin/employes`, nouvelle colonne).

Un ticket contient : nom/prénom client, n° facture ou ticket, produit
(recherche par EAN dans le référentiel si le produit y est connu, sinon
saisie libre du nom/de la référence — le site ne bloque jamais faute de
trouver le produit), type de produit (meuble / électroménager / autre),
des cases à cocher qui changent selon ce type (ex. boîte d'origine,
chargeur, notice...), un commentaire libre pour l'agent SAV, et un fil de
commentaires (façon Trello) pour suivre l'avancement à plusieurs.

À l'ouverture de chaque ticket, un bandeau rappelle de faire la demande sur
**Ylios** (site SAV interne BUT) — ce site n'y est pas connecté (pas
d'API), c'est juste un rappel avec une case "Fait sur Ylios" à cocher une
fois que c'est fait là-bas.

Les colonnes du tableau (statuts) et les champs personnalisés du
formulaire sont entièrement configurables via le bouton "Réglages" (admin
et dev) : ajouter/renommer/réordonner une colonne, ajouter un champ (case
à cocher ou texte) réservé à un type de produit ou visible pour tous. Une
colonne qui contient encore des tickets ne peut pas être supprimée, pour
ne jamais perdre un ticket par erreur. La suppression définitive d'un
ticket reste réservée aux admins.

## Page "Produits" en consultation pour tous

`/produits` (menu, en haut avec Codes-barres/Vérifications) est accessible à
tout le monde — employé, dev, admin. Elle permet de chercher un produit par
nom ou EAN et d'afficher son code-barres Code128 ainsi que le(s) QR code(s)
des alvéoles où il est rangé, pour réimprimer une étiquette au besoin. Rien
n'y est modifiable ni supprimable : ajouter un produit ou changer sa
catégorie/son poids/sa palette conseillée reste réservé aux admins via
`/admin/produits`.

## Zones spéciales

`/admin/zones-speciales` (menu, réservé admin/dev) permet de créer des
zones qui n'ont pas de position sur le plan de l'entrepôt : zone tampon,
Drive, CAM, chariot, ou "autre" — juste un nom et un identifiant libre
(ex. nom "Chariot 1", identifiant "123"). Le QR généré utilise le même
préfixe que celui des alvéoles (réglage "Format du QR code" sur
`/admin/alveoles`) collé devant l'identifiant, donc lisible par le même
lecteur/PDA (ex. préfixe `9990000000226@` + identifiant `123` →
`9990000000226@123`). Les étiquettes s'impriment une par une (bouton
"Imprimer" sur chaque carte) ou en sélectionnant plusieurs cases à cocher
pour tout imprimer d'un coup. La suppression reste réservée aux admins (la
création/modification est ouverte aux comptes dev), même règle que pour
les alvéoles.

## Meuble en plusieurs colis (EAN multi-colis)

Pour un meuble livré en plusieurs colis sous le même produit, chaque colis
porte un code plus long que l'EAN-13 habituel : l'EAN-13 du produit suivi
de 2 chiffres de numéro de colis collés directement derrière (ex : EAN-13
`1234567890120` → colis 1 `123456789012001`, colis 2 `123456789012002`,
etc.).

Pour l'activer sur un produit : coche "Ce meuble est livré en plusieurs
colis sous le même EAN-13" au moment de créer la fiche (`/recherche`,
quand le produit n'est pas encore trouvé), ou depuis `/admin/produits`
(colonne "Plusieurs colis", avec le nombre de colis indicatif à côté).

Quand un employé scanne un de ces codes plus longs sur `/recherche`, le
site reconnaît qu'il ne correspond à aucun EAN exact, essaie les 13
premiers chiffres, et si un produit avec "plusieurs colis" correspond,
affiche sa fiche normalement avec un bandeau indiquant le numéro de colis
scanné. Le nombre de colis par meuble est purement indicatif (affiché pour
l'agent) et ne bloque jamais une recherche ou un rangement.

## Recherche manuelle sur but.fr (pas de recherche automatique)

Le site ne fait **pas** de recherche automatique sur but.fr pour un code
EAN inconnu : le robots.txt de but.fr interdit explicitement aux robots
l'accès aux pages de recherche et à l'API produit
(`/recherche/`, `/Api/Rest/`, `/Common/Search/`, `/Catalog/`), donc
construire un robot qui irait chercher automatiquement dessus
enfreindrait leurs règles. À la place, quand un produit n'est pas trouvé
sur `/recherche`, un bouton "Rechercher ce code sur but.fr" ouvre un
nouvel onglet avec une recherche but.fr pré-remplie du code scanné — c'est
l'employé qui consulte lui-même la page, comme s'il tapait l'adresse à la
main, ce qui reste autorisé (le robots.txt concerne les robots
automatiques, pas la navigation normale d'un humain).

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
par le **SQL Editor** de Supabase, avec un script de migration additif
(comme `migration_002_signalements_messages.sql`) — jamais en relançant
`schema.sql`, qui repartirait de zéro et effacerait les données réelles.
