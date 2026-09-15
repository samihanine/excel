import type { Powerpoint } from "@/artefacts/powerpoint-artefact";
import { placeSections, toRect } from "@/lib/pptx/layout";
import { writeSection } from "@/lib/pptx/sections";
import { PPTX_THEME } from "@/lib/pptx/theme";

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function loadImage(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

async function prefetchImages(doc: Powerpoint) {
  const urls = [
    ...new Set(
      doc.slides.flatMap((slide) =>
        slide.sections.flatMap((section) =>
          section.type === "image" ? [section.imageUrl] : [],
        ),
      ),
    ),
  ];
  const entries = await Promise.all(
    urls.map(async (url) => [url, await loadImage(url)] as const),
  );
  return new Map(entries);
}

/** Construit le fichier .pptx à partir du schéma validé. */
export async function buildPowerpoint(doc: Powerpoint, title: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = doc.title ?? title;
  pptx.author = "Analyste";
  pptx.theme = {
    headFontFace: PPTX_THEME.fonts.title,
    bodyFontFace: PPTX_THEME.fonts.body,
  };

  const images = await prefetchImages(doc);

  if (doc.slides.length === 0) {
    const slide = pptx.addSlide();
    slide.background = { color: PPTX_THEME.backgrounds.ivory.fill };
    slide.addText("Présentation vide", {
      x: 0.8,
      y: 3,
      w: 11.7,
      h: 1,
      fontFace: PPTX_THEME.fonts.title,
      fontSize: 28,
      color: PPTX_THEME.colors.ink,
    });
    return pptx;
  }

  for (const spec of doc.slides) {
    const slide = pptx.addSlide();
    const colors = PPTX_THEME.backgrounds[spec.background];
    slide.background = { color: colors.fill };
    slide.color = colors.text;
    const placed = placeSections(spec.sections);
    for (const [index, item] of placed.entries()) {
      await writeSection(
        slide,
        spec.sections[index],
        toRect(item, PPTX_THEME.slide, PPTX_THEME.spacing),
        { pptx, colors, images },
      );
    }
  }

  return pptx;
}

export async function downloadPowerpoint(filename: string, doc: Powerpoint) {
  const pptx = await buildPowerpoint(doc, filename);
  const fileName = filename.endsWith(".pptx") ? filename : `${filename}.pptx`;
  await pptx.writeFile({ fileName });
}
