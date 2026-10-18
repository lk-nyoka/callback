import { NextResponse } from "next/server";
import { IntentSchema } from "@/lib/schemas";
import { jsonError, mutate } from "@/lib/workspace";

export async function POST(req: Request) {
  try {
    const intent = IntentSchema.parse(await req.json());
    await mutate((s) => {
      s.intent = intent;
    });
    return NextResponse.json(intent);
  } catch (e) {
    return jsonError(e, 400);
  }
}
