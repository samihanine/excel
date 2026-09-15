# Agent d'analyse Power BI

Application front (TanStack Start) : un chat avec un agent LLM qui interroge un modèle sémantique Power BI en DAX et produit des artefacts (dashboards, feuilles Excel, documents, présentations PowerPoint). Tout est stocké dans le localStorage du navigateur.

# Stack

- TanStack Start + TanStack Router (routes fichiers dans `src/routes`)
- React 19, TypeScript strict, Vite, Bun
- Tailwind CSS 4, shadcn/ui sur Base UI (`src/components/ui`)
- TanStack Query (tout appel asynchrone), TanStack Table (Excel)
- Zod 4 (schémas, validation des artefacts et du stockage)
- OpenAI (LLM), Power BI REST `executeQueries` (DAX), mathjs, exceljs, recharts, pptxgenjs

# Règles de code

- Code court, explicite, standardisé. Pas de vérification défensive inutile, pas d'abstraction pour un seul usage, pas de commentaire évident.
- **Peu de fichiers** : étends un fichier existant avant d'en créer un. Un nouveau fichier seulement pour un nouvel agent, outil, artefact, route, ou un composant réutilisé à plusieurs endroits. Jamais un fichier par petite fonction.
- Un composant = un fichier court (< ~150 lignes). Si ça dépasse, découpe par responsabilité, pas par taille.
- Pas de `any`. Types inférés depuis les schémas Zod (`z.infer`).
- Imports via `@/`. Types en `import type` séparés.
- UI : composants de `src/components/ui` d'abord ; ne jamais réécrire un primitif qui existe.
- Asynchrone : toujours TanStack Query (`useQuery` / `useMutation`) ; jamais de `useEffect` + fetch.
- Stockage : uniquement via `store` (`src/lib/storage.ts`), avec un schéma Zod déclaré dans `src/schemas`.
- États à gérer partout : chargement, vide, erreur (`getErrorMessage`).
- Accessibilité : `aria-label` sur les boutons icône, `Label` sur les champs.
- Pas de tests : pas de dossier `test`, pas de Vitest. Vérifie avec `bun run typecheck`, `bun run lint`, `bun run build`, puis dans le navigateur.
- Les erreurs lint restantes dans `src/components/ui` sont générées par shadcn : ne pas les corriger, ne pas en ajouter ailleurs.
- Commentaires et libellés en français.

# Règles de design

- Sobre et épuré : fond clair, bordures fines, `rounded-4xl` sur les boutons/badges, `rounded-xl`/`2xl` sur les cartes.
- Palette de la charte (or Dior) : `--gold`, `--chart-1` … `--chart-8`. Les graphiques utilisent ces variables ; **jamais de couleur hex libre**, ni choisie par l'agent.
- Titres en Cormorant Garamond (classe par défaut des `CardTitle`/`h2`), texte en Inter.
- Densité : boutons `size="sm"` / `icon-sm` dans les barres d'outils, `icon-xs` sous les visuels. Champs de saisie et boutons d'une même ligne ont la même hauteur (`h-9`).
- Onglets d'artefacts = badges pills (pas de barre pleine largeur). Le bouton `+` ajoute un onglet.
- Feedback minimal : texte « Copié », `Spinner` dans les boutons en cours, `Skeleton` pour les visuels en chargement.

# Fonctionnement agent / outil / artefact

**Agent** (`createAgent` dans `src/lib/create-agent.ts`) : nom, description, prompt de méthode, liste d'outils, liste d'artefacts, modèle. `createConversation` écrit dans le stockage un dossier avec l'historique LLM initial : prompt système (généré : méthode + doc de chaque outil + doc de chaque artefact avec son JSON Schema), message « Dataset sélectionné » (structure du modèle + contexte métier), puis les fichiers de contexte choisis. `sendMessage` boucle : le LLM répond toujours `{"tool": "...", "parameters": {...}}` ; l'outil est exécuté, sa sortie renvoyée en message système, jusqu'à `answerUser` (ou `MAX_TOOL_CALLS`). Chaque étape est persistée (`messages[].steps`, `history`). Le texte affiché dans le chat peut différer du texte envoyé au LLM (`displayContent`), ce qui permet d'ajouter des instructions invisibles : artefacts autorisés, visuels cités (@).

**Outil** (`createTool` dans `src/lib/create-tool.ts`) : `name`, `description`, `prompt` (mode d'emploi détaillé pour le LLM), `parameters` et `response` (Zod), `function(params, context)`. Le contexte donne `conversationId`, `dataset`, `artefacts`. Les outils d'artefact (`listArtefacts`, `readArtefact`, `upsertArtefact`) et `answerUser` sont ajoutés automatiquement par `createAgent`.

**Artefact** (`createArtefact` dans `src/lib/create-artefact.ts`) : `name` (= `type` stocké), `description`, `prompt` (quand et comment l'utiliser), `schema` Zod du contenu, `empty` (contenu vide valide pour l'onglet `+`). L'agent le crée/modifie via `upsertArtefact` (remplacement complet ou `path` pointé). L'UI le rend via la table `renderers` de `display-artefact.tsx`. Les données d'un dashboard sont dynamiques (DAX rejoué côté client) ; celles d'un Excel/document/PowerPoint sont dans le JSON de l'artefact.

**Principe** : l'agent principal reste généraliste ; tout le savoir-faire (règles DAX, composition d'un rapport, structure d'un Excel…) vit dans le `prompt` de l'outil ou de l'artefact concerné. Pour ajouter une capacité : créer un fichier dans `src/tools` ou `src/artefacts`, l'enregistrer dans `src/agents/main-agent.ts`, ajouter un renderer si c'est un artefact.

# Fichiers du repo

## Racine

- `AGENTS.md` : ce document.
- `package.json` : scripts `dev`, `build`, `build:html` (HTML monofichier), `typecheck`, `lint`, `format`, `pbi:token`, `dump:src`.
- `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `components.json` (shadcn), `.env` (`VITE_PUBLIC_PBIX_ACCESS_TOKEN`, `VITE_PUBLIC_AI_API_KEY` : valeurs initiales des tokens).
- `scripts/get-pbix-access-token.ts` : obtient un jeton Power BI (Azure CLI), l'écrit dans `.env` et ouvre `/tokens?pbi-token=…`. `scripts/build-single-html.ts` : inline le build client en un seul `dist/charts.html`. `scripts/dump-src.ts` : concatène `src` dans `.local/src.txt`.
- `public/` : favicon, manifest, `pattern-toile.svg` (filigrane du fond).

## `src/agents`

- `index.ts` : registre des agents, `defaultAgent`, `getAgent(name)`.
- `main-agent.ts` : agent « Analyste » — méthode de travail générale, outils `runDax` + `calculate`, artefacts dashboard/excel/document/powerpoint.

## `src/tools`

- `run-dax-tool.ts` : exécute une requête DAX (interdit `INFO.*`), renvoie colonnes + 50 premières lignes ; son prompt contient toutes les règles DAX (quotes, SUMMARIZECOLUMNS, comparaisons d'années, alias camelCase).
- `math-tool.ts` : `calculate` — évalue des expressions mathjs avec variables et affectations chaînées.
- `upsert-artefact-tool.ts` : crée/modifie un artefact (validation par le schéma du type, `setAtPath` pour les retouches).
- `read-artefact-tool.ts`, `list-artefact-tool.ts` : lecture des artefacts de la conversation.
- `answer-user-tool.ts` : réponse finale (termine la boucle).

## `src/artefacts`

- `dashboard-artefact.ts` : `{ title, description, visuals[] }` ; prompt = quand faire un rapport, quel type de visuel, combien.
- `excel-artefact.ts` : colonnes typées (`formula` mathjs entre colonnes), `rows` stockées, `styles` (règles de fond : gold/muted/success/warning/danger).
- `document-artefact.ts` : `{ title?, content }` — HTML simple ou markdown (`**gras**`, `*italique*`, `__souligné__`) ; correction, traduction, rédaction, mail.
- `powerpoint-artefact.ts` : `{ version: 1, title?, slides[] }` — sections typées (`hero`, `kpi`, `chart`, `table`, `comparison`, `quote`, `image`) sur une grille 12×12.

## `src/schemas`

- `conversation-schema.ts` : `llmMessage`, `agentStep`, `chatMessage`, `artefactRecord`, `conversation` (agent, dataset, `contextFileIds`, `pinned`, messages, historique LLM, artefacts).
- `dataset-schema.ts` : dataset lié à un modèle sémantique (titre, contexte métier, structure générée, exemples).
- `context-file-schema.ts` : fichier texte de contexte (titre, contenu, sélectionné par défaut).
- `visual-spec-schema.ts` : `chartSpec` (recharts, sans couleur), visuels `chart` / `table` / `matrix` / `text`, `valueFormat`.

## `src/lib`

- `storage.ts` : localStorage typé Zod — `defineValue`, `defineCollection`, objet `store` (tokens, dataset sélectionné, conversation courante, datasets, fichiers de contexte, conversations). Émet `agent-storage-change` pour React.
- `create-agent.ts` : `createAgent` (prompt système, création de conversation, boucle outils), `titleFromMessage`.
- `create-tool.ts`, `create-artefact.ts` : types et helpers de déclaration, `findArtefact`.
- `artefacts.ts` : `saveArtefact`, `updateArtefactData`, `artefactIdFromName` (partagés agent/UI).
- `dax.ts` : client Power BI — `runDax`, `listPowerBiDatasets`, `fetchSemanticModelStructure`/`formatSemanticModelStructure` (INFO.VIEW.* → texte pour le prompt), erreurs et hints DAX.
- `llm.ts` : client OpenAI (`complete`, `checkAiToken`), type `Model`.
- `math.ts` : instance mathjs sandboxée, `evaluateExpression`, `evaluateFormula`.
- `excel.ts` : `computeRows` (formules), `matchesRule`/`cellBackground` (styles), `importExcelFile`, `downloadExcel`, `excelToTsv`.
- `pptx/theme.ts` : polices, tailles, couleurs et fonds nommés (`ivory`, `cream`, `gold`, `ink`) du PowerPoint — seul fichier à modifier pour changer le thème.
- `pptx/layout.ts` : grille 12×12, placement automatique ou `col`/`row` explicites, conversion en pouces.
- `pptx/sections.tsx` : aperçu HTML et écriture PptxGenJS de chaque type de section.
- `pptx/generate.ts` : assemblage du `.pptx` (images mises en cache) et téléchargement.
- `format.ts` : `formatValue` (fr-FR : number, integer, currency, percent, date), `renderTemplate` (`{{alias|format}}`).
- `download.ts` : `conversationDump`, `downloadJson`, `slugify`.
- `retry.ts` : `withRetry`, `getErrorMessage`.
- `constants.ts` : `MAX_TOOL_CALLS`. `utils.ts` : `cn`.

## `src/hooks`

- `use-store.ts` : `useStoredValue`, `useCollection` (`useSyncExternalStore` sur le store).
- `use-chat.ts` : état du chat — conversation, dataset, fichiers de contexte (brouillon puis figés), artefacts autorisés, mentions @, `send`, `ensureConversation`.
- `use-dax.ts` : `useDaxQuery` (cache par dataset + requête), `daxQueryKey`.
- `use-tokens.ts` : validation périodique des tokens Power BI / IA, `useSetupGuard` (redirige vers `/tokens` ou `/datasets`).
- `use-mobile.ts` : media query mobile (shadcn).

## `src/routes`

- `__root.tsx` : document HTML, styles, devtools. `index.tsx` : page principale (chat à gauche, artefacts à droite, `ResizablePanelGroup`). `datasets.tsx` : ajout depuis les modèles Power BI + édition. `tokens.tsx` : saisie/validation des tokens.
- `router.tsx`, `routeTree.gen.ts` (généré), `styles.css` (thème, palette or, filigrane), `logo.svg`.

## `src/components`

- `chat.tsx` : en-tête (dataset, fichiers de contexte + sheet, tokens, export, nouvelle conversation, historique), messages, saisie.
- `chat-input.tsx` : textarea, chips des visuels cités, multi-select des artefacts autorisés, envoi.
- `chat-messages.tsx` : bulles + étapes d'outils dépliables et durée de génération. `create-conversation-button.tsx`, `conversation-history-sheet.tsx` (liste épinglées d'abord, épingler, export JSON, export N dernières, suppression). Les réponses de l'agent et les visuels `text` acceptent `**gras**`, `*italique*` et retours à la ligne (`rich-text.tsx`).
- `select-dataset.tsx`, `dataset-form.tsx` (édition + rafraîchir la structure), `context-files-sheet.tsx` (CRUD des fichiers de contexte), `multi-select.tsx` (menu à cases), `token-field.tsx`, `page-header.tsx`.
- `display-artefact.tsx` : onglets badges (sélection remontée dans `useChat` → artefact actif transmis à l'agent à chaque message), bouton `+`, suppression de l'onglet actif, export PDF d'un dashboard (`window.print` + CSS `@media print` sur `data-print-area`), table `renderers` par type. `add-artefact-sheet.tsx` : création d'un onglet vide de n'importe quel type (`artefact.empty`), import `.xlsx` pour Excel.
- `dashboard-view.tsx` : grille de `visual-card.tsx` (chargement DAX, rendu par `kind`, boutons DAX / @ / supprimer). `visual-table.tsx` (table paginée), `visual-matrix.tsx` (matrice pivotée), `chart.tsx` (recharts depuis `chartSpec`), `dax-sheet.tsx` (voir, modifier, relancer, enregistrer la requête).
- `excel-view.tsx` : TanStack Table (tri, pagination, copie cellule/colonne/tout, export .xlsx). `text-artefact-view.tsx` : document éditable (titre, barre de style type Gmail, copie, enregistrement). `powerpoint-view.tsx` : aperçu 16:9 des slides + téléchargement `.pptx`.
- `ui/` : primitives shadcn générées — ne pas modifier à la main.
