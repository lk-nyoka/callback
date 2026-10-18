import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, mutate } from "@/lib/workspace";

const Body = z.object({
  status: z.enum(["extracted", "user_confirmed", "rejected"]).optional(),
  text: z.string().min(3).max(400).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = Body.parse(await req.json());
    const fact = await mutate((s) => {
      const f = s.facts.find((x) => x.id === id);
      if (!f) throw new Error("Fact not found");
      if (b.text && b.text !== f.text) {
        f.text = b.text.trim();
        f.userEdited = true;
      }
      if (b.status) f.status = b.status;
      return f;
    });
    return NextResponse.json(fact);
  } catch (e) {
    return jsonError(e, 400);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await mutate((s) => {
      s.facts = s.facts.filter((f) => f.id !== id);
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e, 400);
  }
}
