# BUT Dépôt — Fiche rangement de marchandise

Application web pour la réception et le rangement de marchandise en
entrepôt : recherche par code EAN, ajout de nouveaux produits, gestion des
emplacements sur un plan visuel, impression de fiches A4, et comptes
nominatifs avec droits admin/employé.

Remplace le classeur Google Sheets utilisé précédemment. Voir
[`DEPLOIEMENT.md`](./DEPLOIEMENT.md) pour la mise en ligne.

Interface entièrement repensée (cartes, boutons, icônes cohérents dans
toutes les pages — voir `src/components/ui/`) tout en gardant exactement
les mêmes fonctionnalités. Un tout petit lien en bas de chaque page
(« Tous droits réservés... ») mène à `/mentions-legales`, qui rappelle que
ce site est un outil interne à l'équipe du dépôt, sans lien avec les
systèmes officiels BUT.

## Fonctionnement

- **Page d'accueil** (`/`) : météo de la semaine (entrepôt de Houdemont),
  avec un message de prévention hydratation/pauses si une forte chaleur
  (35°C ou plus) est annoncée, un encadré rappelant les bons gestes et
  postures (port de charges, équipements de sécurité), et des accès rapides
  (Rechercher/ranger, Vérifications, Codes-barres).
- **Planning** (`/planning`, accessible à tout compte connecté, imprimable) :
  horaires de toute l'équipe pour la semaine (navigation semaine
  précédente/suivante), avec la ligne de la personne connectée mise en
  évidence, le total d'heures de la semaine par employé, et à l'impression
  une case "Signature" par ligne à faire remplir. Les horaires sont définis
  par un admin sur `/admin/planning`, qui a deux vues : "Horaires
  habituels" pour fixer l'horaire de chaque employé par jour de semaine une
  fois pour toutes (appliqué **pour toujours**, semaine après semaine), et
  "Semaine" pour exceptionner ponctuellement une semaine précise (congé,
  changement...) sans toucher à l'habituel. La page d'accueil rappelle à
  chacun ses horaires du jour ("tu commences à ... et finis à ...").
- **Vérifications** (`/verifications`, accessible à tout compte connecté) :
  liste les emplacements (produit + alvéole) qui n'ont pas été confirmés
  depuis plus d'un mois. Ce site n'étant pas connecté en direct au stock
  réel (PDA/gun), un produit peut avoir disparu sans que ça se voie ici — un
  bouton "Toujours là" par ligne confirme après vérification physique (et
  se journalise), sinon direction l'aperçu de la zone concernée pour
  "Vider" l'emplacement si le produit n'y est plus.

Le plan de l'entrepôt a deux niveaux : des **zones** (les grandes allées,
ex. "F") affichées sur le plan visuel, et à l'intérieur de chaque zone des
**alvéoles** précises (ex. "F1-0-A") avec leur propre capacité de poids.

- **Employé** : scanne ou tape un code EAN sur `/recherche`. Faire précéder
  le code d'un "%" (ex: "%42569") cherche par la fin du code EAN plutôt
  qu'une correspondance exacte — s'il y a plusieurs produits qui se
  terminent pareil, une petite liste s'affiche pour choisir le bon.
  - Si le produit existe déjà : son nom, sa catégorie et ses alvéoles
    s'affichent, avec le plan qui met en surbrillance forte les zones où il
    est déjà stocké et en surbrillance légère les zones suggérées pour sa
    catégorie (ex. "Literie" → zones F à H). Un petit schéma de chaque
    travée (rack) concernée montre en plus précisément l'étage et la
    position exacts (case mise en évidence) — le "chemin" une fois arrivé
    dans la bonne allée.
  - Sur le grand plan, cliquer n'importe quelle zone (même sans avoir
    cherché un produit) ouvre un aperçu de toutes ses travées : chaque
    alvéole y affiche ce qu'elle contient (produit + nombre de colis),
    libre (vert), occupée (bleu) ou bloquée (rouge). Ce site n'étant pas
    connecté en direct au stock réel (PDA/gun), une alvéole occupée peut
    cliquer pour l'ouvrir : un bouton "Vider" par produit remet l'alvéole à
    vide ici — utile quand un client a pris le dernier colis et que ça n'a
    été signalé que sur le PDA, jamais sur ce site.
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
  - Un champ "Scanner ou taper le code de l'alvéole" (au-dessus du choix
    d'emplacement) sélectionne directement l'alvéole quand on y scanne son
    étiquette QR (voir `/admin/alveoles` ci-dessous) — pratique avec un
    PDA/douchette au lieu de chercher dans la liste déroulante.
  - Depuis `/recherche`, un employé peut aussi **signaler un problème** sur
    une alvéole (ex. "lisse cassée") avec une durée d'expiration au choix
    (24h / 3j / 7j / jamais) — voir `/admin/signalements` ci-dessous.
- **Tous les comptes** :
  - Bulle de messagerie flottante (en bas à droite, sur toutes les pages) :
    chat global (visible de tous), chat admin (réservé aux admins), et
    messages directs à un collègue, avec mise à jour en direct (Supabase
    Realtime).
  - `/codebarre` — génère et imprime un code-barres (Code128) à partir d'un
    ou plusieurs codes tapés — pour remplacer une étiquette abîmée ou
    manquante sur un colis.
  - `/produits` — recherche un produit (nom ou EAN, même "%" pour les
    derniers chiffres) pour retrouver son code-barres Code128 et le(s) QR
    code(s) des alvéoles où il est rangé — pratique pour réimprimer une
    étiquette. Rien n'y est modifiable ni supprimable ; l'ajout et
    l'édition des fiches produit restent réservés aux admins via
    `/admin/produits`.
  - `/sav` (si accès accordé) — tickets SAV clients sur un tableau façon
    Trello (glisser une carte pour changer son statut). Chaque ticket :
    client, n° facture, produit (recherche EAN ou saisie libre), type de
    produit avec cases à cocher associées (boîte, chargeur, notice...),
    commentaire, fil de commentaires, et un rappel Ylios (site SAV interne
    BUT, non connecté à ce site) avec une case "Fait sur Ylios". Colonnes
    et champs personnalisés configurables par admin/dev via "Réglages".
    Accès : toujours pour admin/dev, sur case cochée par un admin pour un
    employé (`/admin/employes`).
- **Admin / direction** :
  - `/admin/zones` — les grandes zones du plan, positionnées directement sur
    la photo réelle de l'entrepôt (`public/plan-entrepot.jpg`) : clique
    "Créer, puis dessiner sur le plan" pour une nouvelle zone, ou "Ajouter
    un rectangle" pour donner à une zone existante un deuxième
    emplacement séparé sur le plan (ex: un même rack coupé en deux
    endroits différents) — chaque rectangle peut aussi être supprimé
    individuellement sans effacer toute la zone. Case "Inverser l'ordre des
    travées" par zone : sur le terrain le numéro de travée augmente en
    s'éloignant de l'accueil, dans un sens qui dépend de l'orientation de
    l'allée — cette case fait correspondre l'ordre affiché dans l'aperçu
    (clic sur une zone dans `/recherche`) à ce qu'on voit en marchant dans
    l'allée.
  - `/admin/planning` — deux vues : "Horaires habituels" (l'horaire par
    défaut de chaque employé et jour de semaine, appliqué pour toujours) et
    "Semaine" (pour poser une exception ponctuelle sur une semaine précise
    — congé, changement — sans modifier l'habituel). Clique une case pour
    définir/modifier/supprimer un horaire (début, fin, pause facultative).
  - `/admin/alveoles` — les alvéoles précises (création une par une ou en
    série sur une plage, capacité en kg, taille de palette max acceptée,
    blocage/déblocage manuel). Bouton "QR" par alvéole et "Imprimer les
    étiquettes QR" en lot (une feuille A4 à découper) — chaque étiquette
    encode le code de l'alvéole, à coller sur le rack pour la scanner.
  - `/admin/categories` — associe chaque catégorie de produit aux zones où
    elle doit être rangée.
  - `/admin/produits` — bouton "+ Ajouter un produit" (EAN, nom, poids,
    palette conseillée) pour créer une fiche rapidement sans passer par
    `/recherche`, puis pour chaque produit : catégorie, poids/colis, colis
    par palette et palette conseillée (EUR ou centrale — un simple conseil
    pour le déchargement/rangement). Recherche par nom ou EAN, avec le même
    "%" pour chercher par les derniers chiffres (ex. "%42569"). Bouton "Voir
    les codes" par produit : code-barres Code128 du produit, et QR code de
    chaque alvéole où il est actuellement rangé. Case "Plusieurs colis" par
    produit (+ nombre de colis indicatif) pour un meuble livré sous
    plusieurs codes-barres (EAN-13 + 2 chiffres de numéro de colis collés
    derrière, ex. EAN "1234567890120" → colis 1 "123456789012001") — voir
    `/recherche` pour la case équivalente à la création d'une fiche, et
    `DEPLOIEMENT.md` (section "Meuble en plusieurs colis") pour le détail.
  - `/admin/zones-speciales` — zones sans position sur le plan (zone
    tampon, Drive, CAM, chariot, ou "autre") : nom + identifiant libres,
    avec génération et impression de QR code au même format que les
    alvéoles (même préfixe configurable sur `/admin/alveoles`). Ouvert aux
    comptes dev pour créer/modifier ; suppression réservée aux admins.
  - `/admin/employes` — comptes employés (invitation par email) et rôles.
  - `/admin/signalements` — problèmes signalés par les employés sur des
    alvéoles ; un clic bloque l'alvéole concernée (elle disparaît alors des
    choix proposés lors d'un rangement, jusqu'à déblocage manuel dans
    `/admin/alveoles`).
  - `/admin/journal` — historique **global** (rangement, sortie/vidage,
    vérification, signalement), filtrable par date, par EAN (les derniers
    chiffres suffisent, ex. "42569") et par type. Réservé aux admins, y
    compris côté base (RLS). Chaque ligne peut afficher son code-barres
    produit et le QR code de son alvéole ("Voir les codes"). Une "Zone
    sensible" permet de vider tout le journal — protégée par un code admin
    à définir une fois, avec confirmation, raison obligatoire, et une
    sauvegarde complète (qui/quand/pourquoi/contenu) consultable ensuite
    avec ce même code.

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
supabase/schema.sql                          Schéma de base pour une installation neuve
supabase/migration_001_alveoles_produits_categories.sql  Migration additive (alvéoles/catégories/produits) pour une base créée avant leur ajout
supabase/migration_002_signalements_messages.sql  Migration additive (signalements + messagerie) pour un site déjà en ligne
supabase/migration_003_categories.sql             Rafraîchit le cache de schéma si "categories" reste introuvable après le 001
supabase/migration_004_journal.sql                Migration additive : journal des rangements (admin uniquement)
supabase/migration_005_zones_plan_image.sql        Migration additive : positionnement des zones en % sur la photo du plan
supabase/migration_006_product_locations_legacy_zone_id.sql  Migration additive : corrige une colonne "zone_id" héritée sur product_locations
supabase/migration_007_zones_plusieurs_rectangles.sql  Migration additive : une zone peut couvrir plusieurs rectangles séparés
supabase/migration_008_journal_reset_securise.sql  Migration additive : code admin + sauvegardes pour la réinitialisation du journal
supabase/migration_009_journal_global_verifications.sql  Migration additive : journal global (types) + suivi de vérification des emplacements
supabase/migration_010_palette_conseillee.sql  Migration additive : palette conseillée sur la fiche produit
supabase/migration_011_planning.sql  Migration additive : planning des employés
supabase/migration_012_zones_ordre_inverse.sql  Migration additive : ordre d'affichage des travées par zone
supabase/migration_013_planning_recurrent.sql  Migration additive : horaires habituels (planning récurrent, pour toujours)
supabase/migration_014_anniversaires.sql  Migration additive : date de naissance sur le profil (anniversaires)
supabase/migration_015_planning_repos.sql  Migration additive : jour de repos exceptionnel sur le planning
supabase/migration_016_parametres_qr.sql  Migration additive : réglages globaux (préfixe du QR code des alvéoles)
supabase/migration_017_mouvements_delete_policy.sql  Migration additive : corrige la réinitialisation du journal (suppression bloquée par RLS)
supabase/migration_018_objectifs.sql  Migration additive : objectifs/tâches de la semaine
supabase/migration_019_role_dev.sql  Migration additive : rôle "dev" (plan/alvéoles/catégories en création seule)
src/lib/qr.ts              Construit le texte encodé dans le QR d'une alvéole (préfixe + code)
src/lib/requireAdminStrict.ts  Garde-fou serveur : renvoie ailleurs tout compte qui n'est pas strictement admin (sections interdites au rôle dev)
src/app/api/mouvements/reset-auto/route.ts  Réinitialisation hebdomadaire automatique du journal (appelée par vercel.json, cron Vercel)
src/app/admin/objectifs/page.tsx  Objectifs de la semaine (équipe + par employé, par jour ou pour toute la semaine)
vercel.json                 Déclare la tâche planifiée (cron) qui réinitialise le journal chaque semaine
src/lib/semaine.ts        Utilitaires de dates (semaine du lundi au dimanche) pour le planning
src/lib/planningMerge.ts  Combine horaires habituels + exceptions ponctuelles en horaire "effectif"
src/components/Confetti.tsx  Animation de confettis (canvas, sans dépendance) affichée le jour de son anniversaire
public/plan-entrepot.jpg                    Photo/plan de l'entrepôt affiché en fond dans /admin/zones et /recherche
src/lib/supabase/          Clients Supabase (navigateur, serveur, admin)
src/lib/alveoles.ts        Logique "trouver/créer une alvéole, ajouter des colis" partagée
src/lib/meteo.ts           Récupération de la météo (Open-Meteo) pour la page d'accueil
src/lib/palettes.ts        Types de palette (EUR / centrale) et règles de compatibilité
src/middleware.ts          Protection des routes / rafraîchissement session
src/app/recherche/         Page principale (recherche EAN, rangement, plan, fiches, signaler un problème)
src/app/codebarre/         Génère et imprime des codes-barres Code128 à partir de codes tapés
src/app/messagerie/        Page complète du chat (accès normal : la bulle flottante, voir ChatBulle.tsx)
src/app/admin/zones/       Gestion des zones du plan (admin)
src/app/admin/alveoles/    Gestion des alvéoles précises, blocage/déblocage (admin)
src/app/admin/categories/  Zones autorisées par catégorie de produit (admin)
src/app/admin/produits/    Catégorie/poids/colis par palette de chaque produit (admin)
src/app/admin/employes/    Gestion des comptes employés (admin)
src/app/admin/signalements/ Problèmes signalés par les employés, action "Bloquer l'alvéole" (admin)
src/app/api/               Routes API (produits, rangement, alvéoles, zones, catégories, employés, signalements, messages, profils)
src/components/            Composants réutilisables (plan, sélecteur d'alvéole, fiches imprimables, en-tête, formulaire de signalement)
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
- Les pages serveur qui calculent "aujourd'hui" (page d'accueil, cron de
  réinitialisation du journal...) utilisent `maintenantParis()`
  (`src/lib/semaine.ts`) plutôt que `new Date()` brut, pour rester à l'heure
  de Paris même si le serveur (Vercel) tourne en UTC — sans ça, la date
  pouvait être en retard d'un jour entre minuit et 1h-2h du matin.

## Logo et couleurs BUT

Le logo fourni est utilisé dans `public/logo-but.png` (en-tête, page de
connexion, icône du site). Le rouge (`#ED1C24`) est échantillonné
directement depuis ce fichier — si ce n'est pas exactement le rouge de la
charte graphique officielle, ajuste les codes dans `tailwind.config.ts`.

Le site est aussi installable comme une application (icône + nom BUT, sans
barre d'adresse) — voir `DEPLOIEMENT.md`, section 8.
