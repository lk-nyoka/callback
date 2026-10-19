import "server-only";
import { strFromU8, unzipSync } from "fflate";
import { readVision } from "./nemotron";
import type { Trace } from "./trace";

// Turns an uploaded CV in (almost) any format into plain text.
// - PDF (text layer), Word .docx / .doc, OpenDocument .odt, RTF, HTML, TXT/MD
// - Photos, screenshots and scanned PDFs are read by NVIDIA Nemotron VL
//   on Nebius Token Factory (vision), then go through the same extraction.
// The file type is sniffed from its bytes, so a missing or wrong extension
// still works.

export type ParsedVia = "pdf" | "docx" | "doc" | "odt" | "rtf" | "html" | "text" | "vision" | "pdf+vision";
export interface Parsed {
  text: string;
  via: ParsedVia;
}

type Kind = "pdf" | "docx" | "odt" | "doc" | "rtf" | "html" | "text" | "image" | "heic" | "zip" | "unknown";

const IMAGE_MIME: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

function startsWith(b: Uint8Array, sig: number[], at = 0) {
  return sig.every((v, i) => b[at + i] === v);
}

export function sniff(filename: string, b: Uint8Array): { kind: Kind; mime?: string } {
  if (startsWith(b, [0x25, 0x50, 0x44, 0x46])) return { kind: "pdf" };
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47])) return { kind: "image", mime: IMAGE_MIME.png };
  if (startsWith(b, [0xff, 0xd8, 0xff])) return { kind: "image", mime: IMAGE_MIME.jpeg };
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return { kind: "image", mime: IMAGE_MIME.webp };
  if (startsWith(b, [0x47, 0x49, 0x46, 0x38])) return { kind: "image", mime: IMAGE_MIME.gif };
  if (startsWith(b, [0x66, 0x74, 0x79, 0x70], 4) && /^(heic|heix|hevc|mif1|msf1)/.test(strFromU8(b.subarray(8, 12)))) return { kind: "heic" };
  if (startsWith(b, [0xd0, 0xcf, 0x11, 0xe0])) return { kind: "doc" };
  if (startsWith(b, [0x50, 0x4b, 0x03, 0x04])) {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".odt")) return { kind: "odt" };
    if (lower.endsWith(".docx")) return { kind: "docx" };
    return { kind: "zip" };
  }
  const head = strFromU8(b.subarray(0, 512)).trimStart();
  if (head.startsWith("{\\rtf")) return { kind: "rtf" };
  if (/^<(!doctype html|html|\?xml)/i.test(head) || /\.html?$/i.test(filename)) return { kind: "html" };
  if (looksLikeText(b)) return { kind: "text" };
  return { kind: "unknown" };
}

function looksLikeText(b: Uint8Array) {
  const n = Math.min(b.length, 4096);
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const c = b[i];
    if (c === 0) return false;
    if (c < 9 || (c > 13 && c < 32)) bad++;
  }
  return n > 0 && bad / n < 0.02;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");

const tidy = (s: string) =>
  s
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Word 2007+ (.docx): paragraphs in word/document.xml.
export function docxText(zip: Record<string, Uint8Array>) {
  const parts = ["word/document.xml", ...Object.keys(zip).filter((k) => /^word\/(header|footer)\d*\.xml$/.test(k))];
  return tidy(
    parts
      .filter((p) => zip[p])
      .map((p) =>
        strFromU8(zip[p])
          .replace(/<w:tab\/>/g, "\t")
          .replace(/<w:(br|cr)\/>/g, "\n")
          .replace(/<\/w:p>/g, "\n")
          .replace(/<\/w:tc>/g, "\t")
          .replace(/<[^>]+>/g, ""),
      )
      .map(decodeEntities)
      .join("\n"),
  );
}

// OpenDocument text (.odt): content.xml.
export function odtText(zip: Record<string, Uint8Array>) {
  const xml = zip["content.xml"];
  if (!xml) return "";
  return tidy(
    decodeEntities(
      strFromU8(xml)
        .replace(/<text:tab\/>/g, "\t")
        .replace(/<text:line-break\/>/g, "\n")
        .replace(/<text:s(?: text:c="(\d+)")?\/>/g, (_, n) => " ".repeat(Number(n ?? 1)))
        .replace(/<\/text:(p|h)>/g, "\n")
        .replace(/<[^>]+>/g, ""),
    ),
  );
}

// Rich Text Format: drop control words and groups, keep the text.
export function rtfText(rtf: string) {
  let out = "";
  let depth = 0;
  const skipAt: number[] = [];
  for (let i = 0; i < rtf.length; i++) {
    const c = rtf[i];
    if (c === "{") {
      depth++;
      if (/^\{\\\*|^\{\\(fonttbl|colortbl|stylesheet|info|pict|header|footer|listtable|listoverridetable|rsidtbl|generator|themedata|colorschememapping|datastore|latentstyles)/.test(rtf.slice(i, i + 24))) skipAt.push(depth);
      continue;
    }
    if (c === "}") {
      if (skipAt.at(-1) === depth) skipAt.pop();
      depth--;
      continue;
    }
    const skipping = skipAt.length > 0;
    if (c === "\\") {
      const m = /^\\([a-z]+)(-?\d+)? ?|^\\'([0-9a-f]{2})|^\\([\\{}~_-])/i.exec(rtf.slice(i));
      if (!m) continue;
      i += m[0].length - 1;
      if (skipping) continue;
      if (m[3]) out += String.fromCharCode(parseInt(m[3], 16));
      else if (m[4]) out += m[4] === "~" ? " " : m[4] === "_" || m[4] === "-" ? "-" : m[4];
      else if (m[1] === "par" || m[1] === "line" || m[1] === "row") out += "\n";
      else if (m[1] === "tab" || m[1] === "cell") out += "\t";
      else if (m[1] === "u" && m[2]) {
        out += String.fromCodePoint((Number(m[2]) + 65536) % 65536);
        if (rtf[i + 1] === "?") i++;
      } else if (m[1] === "bullet") out += "•";
      continue;
    }
    if (skipping || c === "\r" || c === "\n") continue;
    out += c;
  }
  return tidy(out);
}

export function htmlText(html: string) {
  return tidy(
    decodeEntities(
      html
        .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, "\n")
        .replace(/<li[^>]*>/gi, "• ")
        .replace(/<[^>]+>/g, ""),
    ),
  );
}

async function pdfText(bytes: Uint8Array, trace?: Trace): Promise<Parsed> {
  const { extractText, getDocumentProxy, extractImages } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  const joined = tidy(Array.isArray(text) ? text.join("\n\n") : text);
  if (joined.length >= 200) return { text: joined, via: "pdf" };

  // No usable text layer: a scanned or exported-as-image PDF. Read the page
  // images with Nemotron VL (first 4 pages; a CV is rarely longer).
  const { encode } = await import("fast-png");
  const pages: string[] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
    const imgs = (await extractImages(pdf, p)).sort((a, b) => b.width * b.height - a.width * a.height);
    const img = imgs[0];
    if (!img || img.width < 200 || img.height < 200) continue;
    const channels = img.channels as 1 | 3 | 4;
    const png = encode({ width: img.width, height: img.height, data: img.data, channels, depth: 8 });
    pages.push(await readVision(png, "image/png", `Read scanned CV page ${p}`, trace));
  }
  const vision = tidy(pages.join("\n\n"));
  return vision.length > joined.length ? { text: vision, via: "pdf+vision" } : { text: joined, via: "pdf" };
}

export async function parseDocument(filename: string, bytes: Uint8Array, trace?: Trace): Promise<Parsed> {
  const { kind, mime } = sniff(filename, bytes);
  switch (kind) {
    case "pdf":
      return pdfText(bytes, trace);
    case "docx":
    case "odt":
    case "zip": {
      let zip: Record<string, Uint8Array>;
      try {
        zip = unzipSync(bytes, { filter: (f) => /^(word\/(document|header\d*|footer\d*)\.xml|content\.xml)$/.test(f.name) });
      } catch {
        throw new Error("That file looks damaged. Try saving it again as PDF or Word.");
      }
      if (zip["word/document.xml"]) return { text: docxText(zip), via: "docx" };
      if (zip["content.xml"]) return { text: odtText(zip), via: "odt" };
      throw new Error("That zip file isn't a CV document. Upload a PDF, Word, text or image file.");
    }
    case "doc": {
      const { default: WordExtractor } = await import("word-extractor");
      const doc = await new WordExtractor().extract(Buffer.from(bytes));
      return { text: tidy([doc.getHeaders?.({ includeFooters: true }) ?? "", doc.getBody()].join("\n")), via: "doc" };
    }
    case "rtf":
      return { text: rtfText(new TextDecoder("latin1").decode(bytes)), via: "rtf" };
    case "html":
      return { text: htmlText(new TextDecoder().decode(bytes)), via: "html" };
    case "text":
      return { text: tidy(new TextDecoder().decode(bytes)), via: "text" };
    case "image":
      return { text: tidy(await readVision(bytes, mime!, "Read CV image", trace)), via: "vision" };
    case "heic":
      throw new Error("HEIC photos can't be read here yet. On iPhone, share the photo as JPEG (or take a screenshot of it) and upload that.");
    default:
      throw new Error("We couldn't recognise that file. Upload a PDF, Word (.docx or .doc), OpenDocument, RTF, text, or a photo or screenshot of your CV.");
  }
}
