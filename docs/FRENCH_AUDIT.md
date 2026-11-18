# French audit: what is still French in OpenBTP

Scope: whole repository at `main` (450c805), audited in the worktree `../OpenBTP-french-audit` (branch `audit/french-scout`). Read-only audit. No application code was changed.

Method: an AST scan of every `.ts/.tsx/.js/.mjs` under `src/`, `mcp-server/`, `scripts/`, `pdf-service/` and `prisma/`, checked against `src/lib/i18n/phrases.en.json` (2,725 phrases). Routes, Prisma schema, static assets, templates, shell/Docker/Helm files and Markdown docs were inspected separately. Full per-line inventory: [FRENCH_AUDIT_APPENDIX.md](./FRENCH_AUDIT_APPENDIX.md).

## 1. How the existing i18n works (and why it leaves gaps)

- French is the **source language written inline in the code**. English is produced at runtime by exact-match lookup in `phrases.en.json` (`tx()`, `<UiText>`, `translateText`, `localizeGeneratedHtml` for PDFs, `localizeApiBody` for API `error`/`message` fields).
- Anything **not an exact catalog key** (new strings, strings with interpolation, placeholders/attributes, toasts, `alert()` text, labels in constants) is shown in French even with the English locale (default locale is `en`).
- The existing guard `npm run test:i18n` reports 0 problems, but it only inspects JSX text with a narrow French lexicon (e.g. `client`, `nouveau` are not in it), `error:` in API routes, and `tx()` call sites. It does not look at placeholders, attributes, toasts, emails, PDFs, strings in constants, routes or schema. That is why it reports green while the app still shows French.
- `UNATTENDED_LOCALE = 'fr'` ([locale.ts](../src/lib/i18n/locale.ts)) is deliberate: scheduled jobs (check-in reminder emails etc.) always send French.

## 2. Headline numbers

| Area | Count |
|---|---|
| French strings with no catalog entry (excl. logs/comments, excl. the two French source dictionaries) | **3,702 occurrences / ~2,700 unique**, in ~520 files |
| French strings already in the catalog (translated at runtime, French in source by design) | ~4,990 |
| French `console.*` messages | ~1,970 (dev-only) |
| French code comment lines | ~6,400 in 677 files |
| Page routes with a French segment | 98 of 140 |
| API routes with a French segment | 233 of 342 |
| Prisma models/enums/fields in French | most of 130 models/enums |
| Markdown docs written in French | 34 files |

Gap breakdown by surface (occurrences with no catalog entry):

| Surface | Occurrences | Notes |
|---|---|---|
| Staff UI (pages + components) | ~1,640 | 145 JSX texts, 13 placeholders, 31 attributes, ~300 toast/alert messages, ~210 object props, ~940 other string constants |
| AI agent / RAG / MCP | ~644 | Agent tool descriptions and results, RAG prompts |
| Shared lib | ~512 | PPSS generator, contract generators, report builders, validators |
| API responses | ~360 | `error` / `message` strings with interpolation or not in catalog |
| Public portal + external pages | ~200 | Excludes its own `i18n.tsx` dictionary (fr/en/pt/ro) |
| Scripts, seed, prisma | ~213 | Includes `scripts/test-ppss.ts` |
| Emails / notifications | ~125 | |
| PDF / generated HTML | ~143 | Templates also hardcode `<html lang="fr">` |
| Excel / exports | ~66 | Sheet names and headers |

## 3. User-visible gaps (highest priority)

### 3.1 Placeholders (15 with no English entry)
- [chantiers/nouveau/page.tsx](../src/app/(dashboard)/chantiers/nouveau/page.tsx): `Ex: 123 Rue de la Paix, 75001 Paris`
- [admin/inventory/page.tsx](../src/app/admin/inventory/page.tsx): `Ex: Atelier principal - Mur est`
- [portail/magasinier/taches/page.tsx](../src/app/public/portail/magasinier/taches/page.tsx): `Ex. : Recharger la camionnette pour demain`
- [PhotosTabContent.tsx](../src/components/chantier/PhotosTabContent.tsx): `Ajoutez une description pour ces photos...`
- [ConversationList.tsx](../src/components/chat/ConversationList.tsx): `Nom du groupe`
- [RappelCheckinSettings.tsx](../src/components/configuration/RappelCheckinSettings.tsx): `2026-12-21:2027-01-01 # Congés d’hiver`
- [EtatAvancementSoustraitant.tsx](../src/components/etat-avancement/EtatAvancementSoustraitant.tsx): `Ajoutez vos commentaires ici...`
- [EmplacementQRScanner.tsx](../src/components/inventory/EmplacementQRScanner.tsx): `Saisir le code QR manuellement (ex: EMP-12345678-1-2)`
- [metres-plan/Header.tsx](../src/components/metres-plan/Header.tsx): `Nom du projet`
- [RapportVisiteEditeur.tsx](../src/components/rapports/RapportVisiteEditeur.tsx): `Nouveau tag (ex. Carreleur, Client…)`, `Commentaire de la photo…`
- [sav/DocumentUpload.tsx](../src/components/sav/DocumentUpload.tsx), [sav/PhotoUpload.tsx](../src/components/sav/PhotoUpload.tsx): `Description du document...`, `Description de la photo...`
- [tarifs/LigneTarif.tsx](../src/components/tarifs/LigneTarif.tsx): `Description du travail`
- [RichTextEditorTest.tsx](../src/components/ui/RichTextEditorTest.tsx): `Tapez du texte ici pour tester...`

### 3.2 JSX text outside `<UiText>` with no catalog entry (161 occurrences)
Examples: `Nouveau client` ([clients/page.tsx](../src/app/(dashboard)/clients/page.tsx)), `Retour aux clients`, `Informations du client`, `Tous les statuts`, `Nouveau template`, `Nom du template *`, `Liste de prix`, `Prix unit.`, `Voir la fiche client`, `Nouveau rapport`, `Nouveau PIN`, `Liste des Remarques`, `Jours calendrier (tous les jours)`, `Retour au dashboard`, `Redirection vers la page de connexion` (logout and reset-password pages). Full list in the appendix, section "Staff UI".

### 3.3 Attributes (`title`, `alt`, `aria-label`, `message`, `subtitle`, `allOptionLabel`, `libelle`…) (31)
Examples: `Tous les clients`, `Tous les statuts` ([devis/page.tsx](../src/app/(dashboard)/devis/page.tsx)); `Êtes-vous sûr de vouloir supprimer ce dossier technique ? …` (confirm modals); `Aucun plan PDF trouvé dans ce chantier`; `Nouvelle conversation` (aria-label); `Voir le justificatif`; `Capturer la localisation GPS`; interpolated titles (`Modifier ${…}`, `Ouvrier chez ${…}`, `Créé le ${…} par ${…}`, `Documents de la société${…}`, `Rattaché à ${…}`, `Aperçu ${…}`). Interpolated strings can never hit the exact-match catalog, so they stay French.

### 3.4 Toasts, alerts, error states (≈316 with no entry)
`Impossible de charger les données`, `Erreur lors du chargement des templates`, `Erreur: ${…}`, `Le nom et le contenu HTML sont requis`, `Veuillez signer le bon de régie`, `Configuration sauvegardée avec succès !`, `${…} types de notifications initialisés avec succès !`, `Le fichier ne contient pas tous les en-têtes requis…`. Concentrated in [configuration/notifications/page.tsx](../src/app/(dashboard)/configuration/notifications/page.tsx), [chantiers/[chantierId]/commande/page.tsx](../src/app/(dashboard)/chantiers/[chantierId]/commande/page.tsx), [reception/[id]/page.tsx](../src/app/(dashboard)/chantiers/[chantierId]/reception/[id]/page.tsx), the public portal and `bon-regie` page.

### 3.5 API responses (~360)
Non-translated `error`/`message` bodies, mostly with interpolation: `Erreur lors de la création des dossiers: ${…}`, `Erreur générale: ${…}`, `ID du document manquant`, `Catégorie inconnue : « ${…} ».`, `${…} photo(s) uploadée(s) avec succès`, dashboard alerts (`${…} … expire dans ${…} jours`, `Retard de ${…} jours pour le retour de …`, `Tâche administrative "${…}" en attente…`). Hot spots: `chantiers/[chantierId]/documents/route.ts`, `dashboard/alertes/route.ts`, `contract-templates` routes.

### 3.6 Emails, PDFs, Excel
- Emails/notifications: ~125 uncatalogued strings (e.g. [rappel.ts](../src/lib/checkin/rappel.ts), [envoi.ts](../src/lib/checkin/envoi.ts), [attestation.ts](../src/lib/checkin/attestation.ts), [rapport-hebdo.ts](../src/lib/rapports/rapport-hebdo.ts), `emailService.ts`). The scheduled ones are French on purpose (`UNATTENDED_LOCALE`).
- PDF/HTML: [bon-preparation-pdf.ts](../src/lib/pdf/bon-preparation-pdf.ts) (`<html lang="fr">`, `Tél :`), [commande-pdf-storage.ts](../src/lib/pdf/commande-pdf-storage.ts) (`Adresse non définie`, `Client non spécifié`), plus `lang="fr"` in most templates in `src/lib/pdf/templates/`. Contract/PPSS generators ([ppss-generator.ts](../src/lib/ppss-generator.ts), 167 strings; [contrat-generator-pdf-lib.ts](../src/lib/contrat-generator-pdf-lib.ts), 60) are entirely French.
- Excel sheet names: `Journal Ouvrier`, `Entreprises`, `Contacts`, `Bon de commande`, `Remarques Réception`, `Bordereau`, `Résumé`, `Toutes les mesures`, `Métadonnées`, `Informations`, `Lignes d'état…`, `Lignes de commande`.
- Locale formatting hardcoded to `fr-FR` (23 call sites outside `i18n/`): portal journal/planning, `mobile/notes`, `mobile/documents`, `checkin/[token]`, dashboard page, `RapportVisiteEditeur`, `RecentSAVWidget`, `RegistreDeclarations`, `CoutMatiereModal`, `RappelsCheckinSection`, `rapport-hebdo.ts`, `checkin/attestation.ts`, `emailService.ts`, `RappelCheckinSettings`, `RenouvellementContratsSettings`.
- Generated filenames: `Devis_${n}_sans_prix.pdf`, `Planning_Ressources_…`, `Planning_Gantt_…`, `Planning_Chantiers_…`, `bon-regie-…`, `choix-client-…`, `commande-…`, `depenses-…`, `metre-…`, `reception-…`, `rapport-…`, `bon-preparation-…`.

### 3.7 PWA / metadata
- [layout.tsx](../src/app/layout.tsx): `description: 'Application de gestion de chantiers'`.
- [manifest.json/route.ts](../src/app/manifest.json/route.ts) (two places): `description: 'Application de gestion de chantiers'`; [manifest-mobile.json/route.ts](../src/app/manifest-mobile.json/route.ts): `Application mobile de gestion de chantiers` (two places).
- [public/sw.js](../public/sw.js): French comments and French `console.warn` messages.

### 3.8 AI agent / RAG / MCP (~644)
Agent tool descriptions and returned text are French: `src/lib/agent/tools/*` ([dossier.ts](../src/lib/agent/tools/dossier.ts) 136, [devis.ts](../src/lib/agent/tools/devis.ts) 100, [rentabilite.ts](../src/lib/agent/tools/rentabilite.ts) 63, [documents-soustraitants.ts](../src/lib/agent/tools/documents-soustraitants.ts) 47, `ouvriers`, `soustraitants`, `contacts`, `etats`, `lecture`), [rag-service.ts](../src/lib/rag/rag-service.ts) (55 strings + `fr-FR`), and [mcp-server/package.json](../mcp-server/package.json) description. These may be intentional if the LLM prompt language must stay French.

## 4. URLs and routes

**Every user-facing path is French.** 98 of 140 page routes and 233 of 342 API routes contain a French segment.

Page route top-level segments (count of pages under each): `/chantiers` (27), `/sous-traitants` (12), `/public/...` (12), `/mobile/...` (7), `/outillage` (5), `/devis` (4), `/choix-clients` (4), `/admin/...` (3), `/reception`, `/metres-plan`, `/metres`, `/administratif`, `/utilisateurs`, `/sav`, `/rapports`, `/planning-ressources`, `/planification-chargements`, `/mediatheque`, `/logistique`, `/etats-avancement`, `/documents-expires`, `/contrats`, `/clients`, `/ca-a-venir`, `/bons-regie`, `/bon-regie`, `/test-contrat`.

French sub-segments under them: `nouveau`, `modifier`, `etats`, `etats-avancement`, `commande(s)`, `reception`, `nouvelle-remarque`, `fiches-techniques`, `depenses`, `rapports`, `selection-postes`, `documents-societe`, `ouvriers`, `taches`, `tache-rapide`, `historique`, `magasinier`, `portail`, `dupliquer`, `envoyer`, `envoyer-contrat`, `generer-contrat`, `generer-dossier`, `generer-ppss`, `finaliser`, `terminer`, `valider`, `devalider`, `rouvrir`, `signer`, `pieces-jointes`, `gestionnaires`, `marges`, `cout-matiere`, `rappels`, `rappels-checkin`, `rappel-checkin`, `renouvellement-contrats`, `declaration(s)-sous-traitance`, `pdf-sans-prix`, `miroir-nas`, `ouvriers-internes`, `chantiers-eligibles`, `bons-commande-sous-traitants`, `bons-preparation`, `commandes-soustraitants`, `soustraitant-etats`, `soustraitant-logo`, `utilisateurs`, `usines`, `pays`, `prets`.

API groups with the most French routes: `/api/chantiers` (74), `/api/sous-traitants` (24), `/api/public` (18), `/api/fiches-techniques` (9), `/api/devis`, `/api/planning`, `/api/outillage`, `/api/metres-plan`, `/api/logistique`, `/api/dashboard`, `/api/commandes` (6 each), `/api/planification-chargements`, `/api/documents`, `/api/choix-clients` (5 each).

Other URL-ish items:
- Inconsistent spellings for the same concept: `sous-traitants` (UI + API) vs `soustraitants` (planning, `/api/soustraitants`, `/portail/[type]`, `soustraitant-etats`); `bon-regie` (singular, public + API) vs `bons-regie` (dashboard).
- Developer artefacts committed as routes/files: `src/app/mobile/logistique 2/` (duplicate folder with a space), `src/app/@eaDir/` (Synology metadata), `templates/contrat-cadre-sous-traitance-secotech 2.html` (identical duplicate), `/dashboard-test`, `/test-contrat`, `/api/debug/chantiers`.
- ~936 hardcoded path strings in `href=`, `router.push/replace`, `fetch`, `redirect` across ~187 files reference these French paths; renaming routes is a global change (needs redirects for bookmarks/QR codes/emailed links/`sw.js` cache list/middleware matchers).
- Public share links/QR codes printed or emailed (`/public/portail/...`, `/public/reception/...`, `/public/bon-regie`, `/checkin/[token]`, `/reception/externe`, `/share`) embed French segments; changing them breaks already distributed links unless redirected.
- Host, Helm and Docker config are English/neutral: `deploy/helm/**` has no French (the tagged `values-cl01.yaml` is clean).

## 5. Data model and stored values

- Prisma schema: models and fields are French (`Chantier`, `soustraitant`, `pret`, `Depense`, `LigneEtatAvancement`, `BonRegie`, `ReceptionChantier`, `RemarqueReception`, `TacheMagasinier`, `ChoixClient`, `DetailChoix`, `Usine`, `Chargement`, `Pays`, `ProspectEntreprise`…; fields `nom` ×23, `statut` ×19, `quantite` ×12, `prixUnitaire` ×10, `telephone` ×7, `prenom`, `adresse`, `ville`, `codePostal`, `dateDebut`, `dateFin`, `dateCreation`, `montant`). Also mixed snake/camel naming (`soustraitant_etat_avancement`, `admintask`, `companysettings`).
- Enum/stored status values are French and are also compared in code and shown as labels: `BROUILLON`, `SOUMIS`, `VALIDE`, `PARTIELLEMENT_VALIDE`, `REJETE`, `PREVU`, `EN_COURS`, `TERMINE`, `EN_ATTENTE`, `ACCEPTE`, `REFUSE`, `CONVERTI`, `EXPIRE`, `VALIDEE`, `A_REMPLACER`, `NOUVELLE_PROPOSITION`, `PRE_CHOIX`, `CHOIX_DEFINITIF`, `DISPONIBLE`, `PRETE`, `EN_PANNE`, `EN_REPARATION`, `MANQUE_CONSOMMABLE`, `SOUS_TRAITANT`, `OUVRIER_INTERNE`, `MAGASINIER`, `CHANTIER`, `SYSTEME`, `ADMINISTRATIF`, `SOL`/`MUR`/`DECOR`, `BRILLANT`/`MAT`/`SATINE`/`POLI`/`ANTIDERAPANT`, `CIMENT`. Stored English-localization commit explicitly kept these unchanged.
- JSON/API field names are French (`nom`, `prenom`, `montantHT`, `statut`, `erreur` field handled by `localizeApiBody`).
- Browser storage / cookie keys are mostly English or neutral (`openbtp-locale`, `portalLang`, `features_cache`); `portalSession`, `recentMaterialSearches` fine.

## 6. Templates, static assets, scripts, docs

- `templates/*.html` (6 files, all French): `contrat-cadre-sous-traitance-secotech.html` (+ ` 2` duplicate), `contrat-professionnel.html`, `contrat-sous-traitant-professionnel.html`, `contrat-sous-traitant.html`, `ppss-template.html`. These are legal contract bodies. They name a French company (`secotech`) and French legal terms.
- `public/guide-carreleurs/` (HTML guide) and `public/fonts`, `public/images`: guide content likely French (not scanned in detail).
- `identité_visuel/` directory and file names (`Logo complet - Clair.png`, `Ecran chargement.png`…) are French.
- Root scripts: `start-app-auto.sh`, `stop-app-auto.sh`, `install.sh`, `stop-app.sh`, `start-app.sh` echo French messages. `pdf-service/server.js` (17 lines), `Dockerfile` (15), `docker-compose.yml` (14) have French comments/messages. `pdf-service` package is named `secotech-pdf-service` ("Service PDF dédié pour Synology NAS"). `init-db/LIRE_MOI.md`.
- Seed and scripts: `prisma/seed.ts`, `scripts/test-ppss.ts` (162 strings), `scripts/insert-professional-template.js`, `scripts/migrate-mois-with-year.ts`, `scripts/README_BACKUP.md`.
- SQL/structure dumps at repo root: `structure_complete_nas.sql`, `structure_database_nas.sql`, `schema_prisma_complet.prisma`.
- French-named root docs (file names and content): `ANALYSE_PROBLEME_TAGS`, `ANONYMISATION`, `CONFIGURATION_*`, `CORRECTION_ENV_PRODUCTION`, `DEMARRAGE_RAPIDE`, `DIAGNOSTIC_NAS`, `GUIDE_DEMARRAGE_NAS`, `GUIDE_UTILISATEUR` (461 French lines), `MODULES_AUTO_INIT`, `PROPOSITION_METRES`, `README_DEMARRAGE_AUTO_NAS`, `README_IMPORT_NAS`, `README_TEMPLATES_CONTRATS`, `docs/CONTRAT_CADRE_V2.md`, `docs/OUVRIERS_MAGASINIERS.md`, `docs/RENTABILITE_MATERIAUX_PLAN.md`; plus French content in `ARCHITECTURE.md` (201 lines), `DOCUMENTATION.md` (193), `NOTIFICATIONS_README.md`, `README.md` (84), `INSTALLATION.md`, `CHANGELOG.md`, `docs/DEPLOYMENT.md` (110), `docs/MODULES_SYSTEM.md`, `docs/RAG_OPTIMIZATIONS.md`. 34 Markdown files total.

## 7. Code-level French (non user-facing)

- ~6,400 comment lines in 677 files.
- ~1,970 French `console.log/warn/error` messages (often emoji-prefixed).
- French identifiers throughout (`chantier`, `soustraitant`, `ouvrier`, `devis`, `metre`, `etat`, …), component/file/folder names (`EtatAvancementUnifie`, `LigneCommandeSoustraitantRow`, `RapportVisiteEditeur`…), API field names.

## 8. Caveats on this scan

- Heuristic (diacritics, elisions, a French word list). Expect false positives: e.g. `use client` directive, French default data, intentionally French prompts, DB values.
- Not counted: user-entered data, French text inside images/PDF attachments, French inside `public/guide-carreleurs` and `uploads/`, `nas-documents/`.
- Strings wrapped in `tx()`/`<UiText>` with a catalog hit are treated as handled. Template literals with `${}` are always counted as gaps because exact lookup can't match them (some may be handled by `translateDynamic` for four known prefixes).
- The English default locale means a missing entry is user-visible; the French locale remains fully functional.

## 9. Suggested order of attack

1. Extend `scripts/i18n-check.mjs` to cover placeholders, attributes, toasts, templates and use a broader lexicon, then fix what it finds (3.1–3.5). Move interpolated strings to parameterised keys (`tx('Photos deleted: {count}', …)`) instead of exact-match phrases.
2. Make server-side outputs locale-aware: emails, PDFs (`lang`), Excel sheet names, `fr-FR` formatters, download filenames; decide whether `UNATTENDED_LOCALE` should become a setting.
3. Metadata/PWA strings (3.7).
4. Decide on routes: if English URLs are wanted, add `next.config.js` redirects from every old path, update the ~936 hardcoded references, `sw.js`, middleware/proxy matchers, QR/email link builders, and unify `soustraitants`/`sous-traitants` and `bon-regie`/`bons-regie`.
5. Decide whether DB names/enums are in scope (very costly; usually keep and map at the edge).
6. Translate or archive French docs, scripts' console output, templates.
7. Delete dev artefacts (`logistique 2`, `@eaDir`, `… 2.html`, `dashboard-test`, `test-contrat`, `api/debug`).
