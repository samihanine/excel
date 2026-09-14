export const OUTPUT_MODES = [
  { value: "auto", label: "Auto" },
  { value: "dashboard-simple", label: "Dashboard simple" },
  { value: "dashboard-complet", label: "Dashboard complet" },
  { value: "aucun", label: "Aucun dashboard" },
] as const;

export type OutputMode = (typeof OUTPUT_MODES)[number]["value"];

const MODE_INSTRUCTION: Record<OutputMode, string> = {
  auto: [
    "Mode de rendu : auto.",
    "« Rapport / analyse / compare » → dashboard complet (3 à 6 visuels de types différents : text KPI, bar ou pie, line, table).",
    "Répartition, ranking ou comparaison par dimension (par zone, catégorie, mois…) → dashboard avec le type de visuel adapté (bar, pie, line, table).",
    "Un seul chiffre → texte seulement, pas d'artefact.",
  ].join(" "),
  "dashboard-simple":
    "Mode de rendu : dashboard simple. Crée un artefact dashboard avec UN visuel du type le plus adapté (bar, line, pie, table ou text) et une synthèse courte. Une seule requête DAX métier.",
  "dashboard-complet":
    "Mode de rendu : dashboard complet. Crée un artefact dashboard avec 3 à 6 visuels de types DIFFÉRENTS (text KPI, bar, line, pie, table selon la donnée) sur le même sujet. Une requête DAX validée par visuel, puis upsertArtefact.",
  aucun:
    "Mode de rendu : aucun dashboard. N'appelle pas upsertArtefact. Réponds en texte avec les chiffres.",
};

const SHARED = [
  "La structure du modèle (tables, colonnes, mesures) est déjà dans le contexte système : interdiction d'appeler INFO.VIEW.* ou d'explorer le schéma.",
  "Écris directement la requête métier.",
].join(" ");

/** Ajoute l'instruction de rendu à la requête envoyée au LLM, pas au texte affiché. */
export function appendOutputMode(text: string, mode: OutputMode) {
  return `${text.trim()}\n\n[${MODE_INSTRUCTION[mode]} ${SHARED}]`;
}
