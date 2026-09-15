import * as React from "react";
import type PptxGenJS from "pptxgenjs";
import type { PptxSection, PptxSlide } from "@/artefacts/powerpoint-artefact";
import type { Rect } from "@/lib/pptx/layout";
import { placeSections } from "@/lib/pptx/layout";
import type { PptxPalette } from "@/lib/pptx/theme";
import { PPTX_THEME, cssHex } from "@/lib/pptx/theme";
import { formatValue } from "@/lib/format";

type Slide = PptxGenJS.Slide;

export type WriteCtx = {
  pptx: PptxGenJS;
  colors: PptxPalette;
  images: Map<string, string | null>;
};

function titleBand(
  slide: Slide,
  rect: Rect,
  title: string | undefined,
  colors: PptxPalette,
): Rect {
  if (!title) return rect;
  const h = Math.min(0.34, rect.h * 0.2);
  slide.addText(title, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h,
    fontFace: PPTX_THEME.fonts.title,
    fontSize: PPTX_THEME.sizes.title,
    bold: true,
    color: colors.text,
    margin: 0,
    valign: "middle",
  });
  return {
    x: rect.x,
    y: rect.y + h + 0.06,
    w: rect.w,
    h: Math.max(0.2, rect.h - h - 0.06),
  };
}

function writeHero(
  slide: Slide,
  section: Extract<PptxSection, { type: "hero" }>,
  rect: Rect,
  colors: PptxPalette,
) {
  const sub = section.subtitle ? rect.h * 0.35 : 0;
  slide.addText(section.title, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h - sub,
    fontFace: PPTX_THEME.fonts.title,
    fontSize: PPTX_THEME.sizes.hero,
    bold: true,
    color: colors.text,
    margin: 0,
    valign: "middle",
  });
  if (section.subtitle) {
    slide.addText(section.subtitle, {
      x: rect.x,
      y: rect.y + rect.h - sub,
      w: rect.w,
      h: sub,
      fontFace: PPTX_THEME.fonts.body,
      fontSize: PPTX_THEME.sizes.body,
      color: colors.muted,
      margin: 0,
    });
  }
}

function writeKpi(
  slide: Slide,
  section: Extract<PptxSection, { type: "kpi" }>,
  rect: Rect,
  colors: PptxPalette,
) {
  slide.addText(section.label, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: 0.28,
    fontFace: PPTX_THEME.fonts.body,
    fontSize: PPTX_THEME.sizes.caption,
    color: colors.muted,
    margin: 0,
  });
  const formatted =
    typeof section.value === "number" && section.format
      ? formatValue(section.value, section.format)
      : String(section.value);
  slide.addText(formatted, {
    x: rect.x,
    y: rect.y + 0.28,
    w: rect.w,
    h: 0.55,
    fontFace: PPTX_THEME.fonts.title,
    fontSize: PPTX_THEME.sizes.kpi,
    bold: true,
    color: colors.text,
    margin: 0,
    valign: "middle",
  });
  const restY = rect.y + 0.86;
  const restH = Math.max(0.2, rect.h - 0.86);
  const parts: {
    text: string;
    options: { color: string; italic?: boolean };
  }[] = [];
  if (section.variation !== undefined) {
    parts.push({
      text: variationLabel(section.variation),
      options: { color: variationColor(section.variation, colors) },
    });
  }
  if (section.comment) {
    parts.push({
      text: (parts.length ? "  ·  " : "") + section.comment,
      options: { color: colors.muted, italic: true },
    });
  }
  if (parts.length) {
    slide.addText(parts, {
      x: rect.x,
      y: restY,
      w: rect.w,
      h: restH,
      fontFace: PPTX_THEME.fonts.body,
      fontSize: PPTX_THEME.sizes.caption,
      margin: 0,
    });
  }
}

function writeQuote(
  slide: Slide,
  section: Extract<PptxSection, { type: "quote" }>,
  rect: Rect,
  colors: PptxPalette,
  pptx: PptxGenJS,
) {
  slide.addShape(pptx.ShapeType.rect, {
    x: rect.x,
    y: rect.y,
    w: 0.07,
    h: rect.h,
    fill: { color: colors.accent },
    line: { color: colors.accent },
  });
  const x = rect.x + 0.18;
  const w = rect.w - 0.18;
  const authorH = section.author ? 0.32 : 0;
  slide.addText(`« ${section.text} »`, {
    x,
    y: rect.y,
    w,
    h: rect.h - authorH,
    fontFace: PPTX_THEME.fonts.title,
    fontSize: PPTX_THEME.sizes.quote,
    italic: true,
    color: colors.text,
    margin: 0,
    valign: "middle",
  });
  if (section.author) {
    slide.addText(section.author, {
      x,
      y: rect.y + rect.h - authorH,
      w,
      h: authorH,
      fontFace: PPTX_THEME.fonts.body,
      fontSize: PPTX_THEME.sizes.caption,
      color: colors.muted,
      margin: 0,
    });
  }
}

function writeComparison(
  slide: Slide,
  section: Extract<PptxSection, { type: "comparison" }>,
  rect: Rect,
  colors: PptxPalette,
) {
  const body = titleBand(slide, rect, section.title, colors);
  const gap = 0.16;
  const colW = (body.w - gap) / 2;
  writeSide(slide, section.left, { ...body, w: colW }, colors);
  writeSide(
    slide,
    section.right,
    { ...body, x: body.x + colW + gap, w: colW },
    colors,
  );
}

function writeSide(
  slide: Slide,
  side: { title: string; items: string[] },
  rect: Rect,
  colors: PptxPalette,
) {
  slide.addText(side.title, {
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: 0.32,
    fontFace: PPTX_THEME.fonts.title,
    fontSize: PPTX_THEME.sizes.title,
    bold: true,
    color: colors.text,
    margin: 0,
  });
  slide.addText(
    side.items.map((item) => ({ text: item, options: { bullet: true } })),
    {
      x: rect.x,
      y: rect.y + 0.36,
      w: rect.w,
      h: rect.h - 0.36,
      fontFace: PPTX_THEME.fonts.body,
      fontSize: PPTX_THEME.sizes.body,
      color: colors.text,
      paraSpaceAfter: 6,
      margin: 0,
    },
  );
}

function writeTable(
  slide: Slide,
  section: Extract<PptxSection, { type: "table" }>,
  rect: Rect,
  colors: PptxPalette,
) {
  const body = titleBand(slide, rect, section.title, colors);
  const header = section.columns.map((column) => ({
    text: column.label,
    options: { fill: { color: colors.text }, color: colors.fill, bold: true },
  }));
  const rows = section.rows.map((row) =>
    section.columns.map((column) => ({
      text: formatValue(row[column.key], column.format),
      options: { fill: { color: colors.surface }, color: colors.text },
    })),
  );
  slide.addTable([header, ...rows], {
    x: body.x,
    y: body.y,
    w: body.w,
    h: body.h,
    fontFace: PPTX_THEME.fonts.body,
    fontSize: PPTX_THEME.sizes.caption,
    border: { pt: 0.5, color: colors.accent },
    valign: "middle",
    align: "left",
  });
}

function writeChart(
  slide: Slide,
  section: Extract<PptxSection, { type: "chart" }>,
  rect: Rect,
  colors: PptxPalette,
  pptx: PptxGenJS,
) {
  const body = titleBand(slide, rect, section.title, colors);
  const labels = section.rows.map((row) =>
    String(row[section.categoryKey] ?? ""),
  );
  const data = section.series.map((serie) => ({
    name: serie.name ?? serie.key,
    labels,
    values: section.rows.map((row) => {
      const raw = row[serie.key];
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : 0;
    }),
  }));
  const type =
    section.chart === "line"
      ? pptx.ChartType.line
      : section.chart === "pie"
        ? pptx.ChartType.pie
        : pptx.ChartType.bar;
  slide.addChart(type, data, {
    x: body.x,
    y: body.y,
    w: body.w,
    h: body.h,
    showLegend: true,
    chartColors: [...PPTX_THEME.colors.charts],
    barDir: "col",
    chartArea: { fill: { color: colors.surface } },
  });
}

async function writeImage(
  slide: Slide,
  section: Extract<PptxSection, { type: "image" }>,
  rect: Rect,
  ctx: WriteCtx,
) {
  const { colors } = ctx;
  const legendH = section.legend ? 0.28 : 0;
  const body = titleBand(slide, rect, section.title, colors);
  const imgH = body.h - legendH;
  const data = ctx.images.get(section.imageUrl);
  if (data) {
    const sizing =
      section.fit === "fill"
        ? {}
        : { sizing: { type: section.fit, w: body.w, h: imgH } };
    slide.addImage({
      data,
      x: body.x,
      y: body.y,
      w: body.w,
      h: imgH,
      ...sizing,
      altText: section.legend ?? section.title ?? "Image",
    });
  } else {
    slide.addShape(ctx.pptx.ShapeType.roundRect, {
      x: body.x,
      y: body.y,
      w: body.w,
      h: imgH,
      fill: { color: colors.surface },
      line: { color: colors.accent, width: 1 },
    });
    slide.addText("Image indisponible", {
      x: body.x,
      y: body.y,
      w: body.w,
      h: imgH,
      fontFace: PPTX_THEME.fonts.body,
      fontSize: PPTX_THEME.sizes.caption,
      color: colors.muted,
      align: "center",
      valign: "middle",
      margin: 0,
    });
  }
  if (section.legend) {
    slide.addText(section.legend, {
      x: body.x,
      y: body.y + imgH,
      w: body.w,
      h: legendH,
      fontFace: PPTX_THEME.fonts.body,
      fontSize: PPTX_THEME.sizes.caption,
      color: colors.muted,
      margin: 0,
    });
  }
}

export async function writeSection(
  slide: Slide,
  section: PptxSection,
  rect: Rect,
  ctx: WriteCtx,
) {
  switch (section.type) {
    case "hero":
      writeHero(slide, section, rect, ctx.colors);
      return;
    case "kpi":
      writeKpi(slide, section, rect, ctx.colors);
      return;
    case "quote":
      writeQuote(slide, section, rect, ctx.colors, ctx.pptx);
      return;
    case "comparison":
      writeComparison(slide, section, rect, ctx.colors);
      return;
    case "table":
      writeTable(slide, section, rect, ctx.colors);
      return;
    case "chart":
      writeChart(slide, section, rect, ctx.colors, ctx.pptx);
      return;
    case "image":
      await writeImage(slide, section, rect, ctx);
  }
}

function variationLabel(value: string | number) {
  if (typeof value === "number") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${formatValue(value, "percent")}`;
  }
  return value;
}

function variationColor(value: string | number, colors: PptxPalette) {
  const n = typeof value === "number" ? value : Number(value.replace(",", "."));
  if (!Number.isFinite(n)) return colors.muted;
  return n >= 0 ? PPTX_THEME.colors.success : PPTX_THEME.colors.danger;
}

function PreviewTitle({
  children,
  colors,
}: {
  children: string;
  colors: PptxPalette;
}) {
  return (
    <p
      className="truncate text-[0.7rem] font-semibold tracking-wide"
      style={{ fontFamily: PPTX_THEME.fonts.title, color: cssHex(colors.text) }}
    >
      {children}
    </p>
  );
}

function SlideImage({
  url,
  fit,
  alt,
}: {
  url: string;
  fit: "contain" | "cover" | "fill";
  alt: string;
}) {
  const [ok, setOk] = React.useState(true);
  if (!ok) {
    return (
      <div className="flex h-full items-center justify-center text-[0.65rem] opacity-60">
        Image indisponible
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className="h-full w-full"
      style={{ objectFit: fit }}
      onError={() => setOk(false)}
    />
  );
}

function ChartPreview({
  section,
}: {
  section: Extract<PptxSection, { type: "chart" }>;
}) {
  const serie = section.series[0];
  const values = section.rows.map((row) => {
    const raw = row[serie.key];
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  });
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-full min-h-0 flex-col justify-end gap-1">
      {section.chart === "pie"
        ? section.rows.map((row, index) => (
            <p key={index} className="truncate text-[0.65rem]">
              {String(row[section.categoryKey] ?? "")} ·{" "}
              {formatValue(row[serie.key], "number")}
            </p>
          ))
        : values.map((value, index) => (
            <div key={index} className="flex items-center gap-1">
              <span className="w-12 truncate text-[0.6rem] opacity-70">
                {String(section.rows[index][section.categoryKey] ?? "")}
              </span>
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${(value / max) * 70}%`,
                  background: cssHex(
                    PPTX_THEME.colors.charts[
                      index % PPTX_THEME.colors.charts.length
                    ],
                  ),
                }}
              />
            </div>
          ))}
    </div>
  );
}

function SectionPreview({
  section,
  colors,
}: {
  section: PptxSection;
  colors: PptxPalette;
}) {
  switch (section.type) {
    case "hero":
      return (
        <div className="flex h-full flex-col justify-center">
          <h3
            className="text-xl leading-tight font-semibold"
            style={{ fontFamily: PPTX_THEME.fonts.title }}
          >
            {section.title}
          </h3>
          {section.subtitle ? (
            <p className="mt-1 text-xs" style={{ color: cssHex(colors.muted) }}>
              {section.subtitle}
            </p>
          ) : null}
        </div>
      );
    case "kpi":
      return (
        <div className="flex h-full flex-col justify-center">
          <p
            className="text-[0.65rem] tracking-wider uppercase"
            style={{ color: cssHex(colors.muted) }}
          >
            {section.label}
          </p>
          <p
            className="text-2xl font-semibold"
            style={{ fontFamily: PPTX_THEME.fonts.title }}
          >
            {typeof section.value === "number" && section.format
              ? formatValue(section.value, section.format)
              : String(section.value)}
          </p>
          {section.variation !== undefined ? (
            <p
              className="text-[0.7rem]"
              style={{
                color: cssHex(variationColor(section.variation, colors)),
              }}
            >
              {variationLabel(section.variation)}
              {section.comment ? ` · ${section.comment}` : ""}
            </p>
          ) : section.comment ? (
            <p
              className="text-[0.7rem] italic"
              style={{ color: cssHex(colors.muted) }}
            >
              {section.comment}
            </p>
          ) : null}
        </div>
      );
    case "quote":
      return (
        <blockquote
          className="flex h-full flex-col justify-center border-l-2 pl-3"
          style={{ borderColor: cssHex(colors.accent) }}
        >
          <p
            className="text-sm italic"
            style={{ fontFamily: PPTX_THEME.fonts.title }}
          >
            « {section.text} »
          </p>
          {section.author ? (
            <p
              className="mt-1 text-[0.65rem]"
              style={{ color: cssHex(colors.muted) }}
            >
              {section.author}
            </p>
          ) : null}
        </blockquote>
      );
    case "comparison":
      return (
        <div className="flex h-full min-h-0 flex-col gap-1">
          {section.title ? (
            <PreviewTitle colors={colors}>{section.title}</PreviewTitle>
          ) : null}
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 text-[0.7rem]">
            {[section.left, section.right].map((side) => (
              <div key={side.title}>
                <p className="font-semibold">{side.title}</p>
                <ul className="mt-1 list-disc pl-4">
                  {side.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    case "table":
      return (
        <div className="flex h-full min-h-0 flex-col gap-1">
          {section.title ? (
            <PreviewTitle colors={colors}>{section.title}</PreviewTitle>
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden text-[0.65rem]">
            <table className="w-full border-collapse">
              <thead>
                <tr
                  style={{
                    background: cssHex(colors.text),
                    color: cssHex(colors.fill),
                  }}
                >
                  {section.columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-1 py-0.5 text-left font-medium"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.slice(0, 6).map((row, index) => (
                  <tr
                    key={index}
                    style={{ background: cssHex(colors.surface) }}
                  >
                    {section.columns.map((column) => (
                      <td key={column.key} className="px-1 py-0.5">
                        {formatValue(row[column.key], column.format)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case "chart":
      return (
        <div className="flex h-full min-h-0 flex-col gap-1">
          {section.title ? (
            <PreviewTitle colors={colors}>{section.title}</PreviewTitle>
          ) : null}
          <ChartPreview section={section} />
        </div>
      );
    case "image":
      return (
        <div className="flex h-full min-h-0 flex-col gap-1">
          {section.title ? (
            <PreviewTitle colors={colors}>{section.title}</PreviewTitle>
          ) : null}
          <div
            className="min-h-0 flex-1 overflow-hidden rounded-md"
            style={{ background: cssHex(colors.surface) }}
          >
            <SlideImage
              url={section.imageUrl}
              fit={section.fit}
              alt={section.legend ?? section.title ?? "Image"}
            />
          </div>
          {section.legend ? (
            <p
              className="truncate text-[0.65rem]"
              style={{ color: cssHex(colors.muted) }}
            >
              {section.legend}
            </p>
          ) : null}
        </div>
      );
  }
}

/** Aperçu 16:9 d'une slide, même grille que le fichier PowerPoint. */
export function SlidePreview({ slide }: { slide: PptxSlide }) {
  const colors = PPTX_THEME.backgrounds[slide.background];
  const placed = placeSections(slide.sections);
  return (
    <div
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{
        aspectRatio: `${PPTX_THEME.slide.width} / ${PPTX_THEME.slide.height}`,
        background: cssHex(colors.fill),
        color: cssHex(colors.text),
        fontFamily: PPTX_THEME.fonts.body,
      }}
    >
      <div
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridTemplateRows: "repeat(12, minmax(0, 1fr))",
          gap: 6,
          padding: 14,
        }}
      >
        {placed.map((item, index) => (
          <div
            key={item.id}
            className="min-h-0 min-w-0 overflow-hidden"
            style={{
              gridColumn: `${item.col + 1} / span ${item.span.cols}`,
              gridRow: `${item.row + 1} / span ${item.span.rows}`,
            }}
          >
            <SectionPreview section={slide.sections[index]} colors={colors} />
          </div>
        ))}
      </div>
    </div>
  );
}
