// Robustly pull a JSON value out of model output.
// Nemotron on Token Factory returns reasoning in a separate field, but we still
// defend against <think> blocks, code fences, and leading prose.

export function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export function extractJson<T = unknown>(raw: string): T {
  const text = stripReasoning(raw);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      return JSON.parse(c.trim()) as T;
    } catch {
      /* try next */
    }
    const start = c.search(/[\[{]/);
    if (start === -1) continue;
    const open = c[start];
    const close = open === "{" ? "}" : "]";
    // scan for the matching bracket, respecting strings
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < c.length; i++) {
      const ch = c[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(c.slice(start, i + 1)) as T;
          } catch {
            break;
          }
        }
      }
    }
  }
  throw new Error("No valid JSON found in model output");
}
