/**
 * Thème PowerPoint — un seul endroit à modifier pour couleurs, polices et fonds.
 * Hex sans `#` (contrat PptxGenJS). L'agent ne choisit jamais d'hex : uniquement
 * les clés de `backgrounds`.
 */
export const PPTX_THEME = {
  fonts: {
    title: "Cormorant Garamond",
    body: "Calibri",
  },
  sizes: {
    hero: 32,
    title: 16,
    body: 12,
    kpi: 28,
    caption: 10,
    quote: 18,
  },
  slide: { width: 13.333, height: 7.5 },
  spacing: { margin: 0.4, gap: 0.12 },
  colors: {
    gold: "C9B37A",
    ink: "1C1914",
    ivory: "F6F3EB",
    cream: "EBE6D8",
    muted: "7A7468",
    paper: "FFFCF6",
    success: "3D6B4F",
    danger: "8B3A2A",
    charts: [
      "C9B37A",
      "1C1914",
      "D4C4A0",
      "6B6458",
      "B8A06A",
      "4A453C",
      "E8DFCC",
      "8A8376",
    ],
  },
  backgrounds: {
    ivory: {
      fill: "F6F3EB",
      text: "1C1914",
      muted: "7A7468",
      accent: "C9B37A",
      surface: "FFFCF6",
    },
    cream: {
      fill: "EBE6D8",
      text: "1C1914",
      muted: "7A7468",
      accent: "C9B37A",
      surface: "F6F3EB",
    },
    gold: {
      fill: "C9B37A",
      text: "1C1914",
      muted: "4A453C",
      accent: "1C1914",
      surface: "D4C4A0",
    },
    ink: {
      fill: "1C1914",
      text: "F6F3EB",
      muted: "A89F90",
      accent: "C9B37A",
      surface: "2A2620",
    },
  },
} as const;

export const PPTX_BACKGROUND_KEYS = ["ivory", "cream", "gold", "ink"] as const;

export type PptxBackground = (typeof PPTX_BACKGROUND_KEYS)[number];
export type PptxPalette =
  (typeof PPTX_THEME.backgrounds)[keyof typeof PPTX_THEME.backgrounds];

export const cssHex = (hex: string) => `#${hex}`;
