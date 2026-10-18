"use client";

import type { CareerFact } from "@/lib/types";

// Tiny, safe markdown renderer (headings, lists, bold, fact-id citations).
// No HTML from the model is ever injected.
export function Markdown({ text, facts }: { text: string; facts?: Map<string, CareerFact> }) {
  // Give tables their own block even when the model omits the blank line.
  const normalised = text
    .replace(/^(?!\s*\|)(.+)\n(?=\s*\|)/gm, "$1\n\n")
    .replace(/^(\s*\|.*\|)\s*\n(?!\s*\|)/gm, "$1\n\n");
  const blocks = normalised.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-[0.97rem] leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), facts)}</li>
              ))}
            </Tag>
          );
        }
        // Simple pipe tables: | a | b |, with a |---| separator row.
        if (lines.length >= 2 && lines.every((l) => /^\s*\|.*\|\s*$/.test(l))) {
          const rows = lines.filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).map((l) => l.trim().slice(1, -1).split("|").map((c) => c.trim()));
          const [head, ...body] = rows;
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>{head.map((c, j) => <th key={j} className="border-b border-rule-strong py-1.5 pr-4 font-semibold">{inline(c, facts)}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((r, k) => (
                    <tr key={k} className="border-b border-rule align-top">{r.map((c, j) => <td key={j} className="py-1.5 pr-4">{inline(c, facts)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const h = b.match(/^#{1,4}\s+(.*)/);
        if (h) return <h3 key={i} className="font-semibold">{inline(h[1], facts)}</h3>;
        return <p key={i}>{lines.map((l, j) => <span key={j}>{inline(l, facts)}{j < lines.length - 1 && <br />}</span>)}</p>;
      })}
    </div>
  );
}

function inline(s: string, facts?: Map<string, CareerFact>): React.ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|\[fct_[A-Za-z0-9_-]+(?:\s*,\s*fct_[A-Za-z0-9_-]+)*\])/g);
  return parts.map((p, i) => {
    if (p.startsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("[fct_")) {
      const ids = p.slice(1, -1).split(/\s*,\s*/);
      const title = ids.map((id) => facts?.get(id)?.text ?? id).join("\n");
      return (
        <span key={i} title={title} className="ml-0.5 cursor-help rounded bg-verified-tint px-1 text-xs font-semibold text-verified">
          {ids.length} fact{ids.length > 1 ? "s" : ""}
        </span>
      );
    }
    return <span key={i}>{p.replace(/\*([^*]+)\*/g, "$1")}</span>;
  });
}
