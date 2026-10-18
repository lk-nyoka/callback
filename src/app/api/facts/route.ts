import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { jsonError, mutate } from "@/lib/workspace";

const Body = z.object({
  text: z.string().min(3).max(400),
  type: z.enum(["experience", "skill", "education", "certification", "project", "achievement"]),
  // Bulk actions on existing facts
});

// Add a fact the user states directly (e.g. to support a blocked claim).
export async function POST(req: Request) {
  try {
    const b = Body.parse(await req.json());
    const fact = await mutate((s) => {
      const f = {
        id: `fct_${nanoid(8)}`,
        text: b.text.trim(),
        type: b.type,
        documentId: "user",
        evidenceQuote: "Added by you",
        quoteStart: -1,
        status: "user_confirmed" as const,
        userEdited: true,
        createdAt: new Date().toISOString(),
      };
      s.facts.push(f);
      return f;
    });
    return NextResponse.json(fact);
  } catch (e) {
    return jsonError(e, 400);
  }
}

const Bulk = z.object({ action: z.enum(["confirm_all_extracted"]) });

export async function PATCH(req: Request) {
  try {
    Bulk.parse(await req.json());
    const n = await mutate((s) => {
      let c = 0;
      s.facts.forEach((f) => {
        if (f.status === "extracted") {
          f.status = "user_confirmed";
          c++;
        }
      });
      return c;
    });
    return NextResponse.json({ confirmed: n });
  } catch (e) {
    return jsonError(e, 400);
  }
}
