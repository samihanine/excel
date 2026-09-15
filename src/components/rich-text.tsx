import * as React from "react";

/** Mise en forme minimale : **gras**, *italique*. Les retours à la ligne se gèrent via `whitespace-pre-line`. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

const ALLOWED_TAGS = new Set([
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "BR",
  "P",
  "DIV",
  "UL",
  "OL",
  "LI",
]);

export function looksLikeHtml(text: string) {
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

/** Convertit le markdown simple (**gras**, *italique*, __souligné__) en HTML. */
export function markdownToHtml(text: string) {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<u>$1</u>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

/** Ne garde que les balises de mise en forme simple (gras, italique, listes…). */
export function sanitizeHtml(html: string) {
  if (typeof document === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  clean(template.content);
  return template.innerHTML
    .replaceAll("<b>", "<strong>")
    .replaceAll("</b>", "</strong>")
    .replaceAll("<i>", "<em>")
    .replaceAll("</i>", "</em>");
}

function clean(root: ParentNode) {
  for (const node of [...root.childNodes]) {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE") {
      el.remove();
      continue;
    }
    for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
    clean(el);
    if (!ALLOWED_TAGS.has(el.tagName)) el.replaceWith(...el.childNodes);
  }
}

/** HTML prêt à afficher : markdown agent ou HTML déjà saisi, puis nettoyé. */
export function toDisplayHtml(content: string) {
  return sanitizeHtml(
    looksLikeHtml(content) ? content : markdownToHtml(content),
  );
}
