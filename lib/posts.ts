// Shared blog types and helpers (server and browser).

export type PostStatus = "draft" | "published";

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover: string;
  body: string; // Markdown
  category: string;
  tags: string[];
  author: string;
  status: PostStatus;
  publishedAt: string; // yyyy-mm-dd
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
};

export const blankPost = (): Post => ({
  id: "", title: "", slug: "", excerpt: "", cover: "", body: "", category: "", tags: [], author: "Spinex Team",
  status: "draft", publishedAt: "", seoTitle: "", seoDescription: "", createdAt: "", updatedAt: "",
});

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 80);
}

export function readingMinutes(md: string) {
  const words = md.replace(/[#>*_`\[\]()!-]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function safeUrl(url: string) {
  const u = url.trim();
  return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(u) ? u : "#";
}

function inline(text: string) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    const href = safeUrl(url.replace(/&amp;/g, "&"));
    const external = /^https?:\/\//i.test(href);
    return `<a href="${esc(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  return s;
}

// A line that is just one image: ![alt](url)
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

export type TocItem = { id: string; text: string; level: 2 | 3 };

// Small, safe Markdown renderer: headings, paragraphs, lists, quotes, images, links, code, dividers.
// All text is escaped first, so authors can't inject HTML or scripts.
export function renderMarkdown(md: string): { html: string; toc: TocItem[] } {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const toc: TocItem[] = [];
  const used = new Set<string>();
  let i = 0;

  const headingId = (text: string) => {
    let id = slugify(text) || "section";
    let n = 2;
    while (used.has(id)) id = `${slugify(text)}-${n++}`;
    used.add(id);
    return id;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
      continue;
    }

    const h = line.match(/^(#{2,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length as 2 | 3;
      const text = h[2].trim();
      const id = headingId(text);
      toc.push({ id, text, level });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { out.push("<hr />"); i++; continue; }

    const img = line.trim().match(IMAGE_LINE);
    if (img) {
      out.push(`<figure><img src="${esc(safeUrl(img[2]))}" alt="${esc(img[1])}" loading="lazy" />${img[1] ? `<figcaption>${esc(img[1])}</figcaption>` : ""}</figure>`);
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) q.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote><p>${inline(q.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      out.push(`<ul>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      out.push(`<ol>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</ol>`);
      continue;
    }

    // A paragraph: this line (whatever it starts with, e.g. an incomplete "![…" ) plus following lines
    // until a blank line or another block. Only a complete image line ends it, not any "![" text.
    const para: string[] = [lines[i++]];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,3}\s|>|```|\s*[-*]\s+|\s*\d+[.)]\s+|-{3,}\s*$)/.test(lines[i]) &&
      !IMAGE_LINE.test(lines[i].trim())
    ) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return { html: out.join("\n"), toc };
}
