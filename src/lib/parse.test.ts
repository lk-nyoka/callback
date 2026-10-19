import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { docxText, htmlText, odtText, parseDocument, rtfText, sniff } from "./parse";

const docx = () =>
  zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "word/document.xml": strToU8(
      '<w:document><w:body><w:p><w:r><w:t>Thandi Mokoena</w:t></w:r></w:p><w:p><w:r><w:t>Data Intern &amp; Analyst</w:t><w:tab/><w:t>2025</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>SQL</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Excel</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>',
    ),
  });

describe("parse", () => {
  it("sniffs by bytes, not extension", () => {
    expect(sniff("cv", strToU8("%PDF-1.7")).kind).toBe("pdf");
    expect(sniff("cv.pdf", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2])).kind).toBe("image");
    expect(sniff("cv.txt", new Uint8Array([0xff, 0xd8, 0xff, 0xe0])).mime).toBe("image/jpeg");
    expect(sniff("cv", strToU8("{\\rtf1 hello}")).kind).toBe("rtf");
    expect(sniff("cv", strToU8("<!DOCTYPE html><p>x</p>")).kind).toBe("html");
    expect(sniff("cv", strToU8("Plain CV text\nLine two")).kind).toBe("text");
    expect(sniff("cv.doc", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1])).kind).toBe("doc");
    expect(sniff("cv.bin", new Uint8Array([0, 1, 2, 3, 0, 0])).kind).toBe("unknown");
  });

  it("reads .docx paragraphs, tabs, entities and tables", async () => {
    const r = await parseDocument("cv.docx", docx());
    expect(r.via).toBe("docx");
    expect(r.text).toContain("Thandi Mokoena");
    expect(r.text).toContain("Data Intern & Analyst\t2025");
    expect(r.text).toMatch(/SQL[\t\n]+Excel/);
  });

  it("reads a .docx even without the extension", async () => {
    expect((await parseDocument("upload", docx())).via).toBe("docx");
  });

  it("reads .odt", () => {
    const t = odtText({ "content.xml": strToU8('<office:text><text:h>Thandi</text:h><text:p>Built<text:s text:c="2"/>dashboards</text:p></office:text>') });
    expect(t).toBe("Thandi\nBuilt  dashboards");
  });

  it("reads RTF and skips font tables", () => {
    const t = rtfText("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}{\\*\\generator Word;}\\f0 Thandi Mokoena\\par Caf\\'e9 \\u8211? 2025\\par}");
    expect(t).toBe("Thandi Mokoena\nCafé – 2025");
  });

  it("reads HTML without scripts", () => {
    expect(htmlText("<html><head><title>x</title></head><body><h1>Thandi</h1><script>bad()</script><ul><li>SQL</li></ul></body></html>")).toBe("Thandi\n• SQL");
  });

  it("explains HEIC and unknown files", async () => {
    const heic = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
    await expect(parseDocument("p.heic", heic)).rejects.toThrow(/JPEG/);
    await expect(parseDocument("x.bin", new Uint8Array([0, 1, 2, 0]))).rejects.toThrow(/recognise/);
  });

  it("docxText includes headers", () => {
    expect(docxText({ "word/document.xml": strToU8("<w:p><w:t>Body</w:t></w:p>"), "word/header1.xml": strToU8("<w:p><w:t>Head</w:t></w:p>") })).toMatch(/^Body\n+Head$/);
  });
});
