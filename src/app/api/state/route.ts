import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getWorkspace, jsonError, publicState } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await getWorkspace();
    return NextResponse.json({
      ...publicState(s),
      env: { tavily: !!config.tavilyApiKey, nebius: !!config.nebiusApiKey, ultra: config.enableUltra, models: config.models, dailyCap: config.dailyApplicationCap },
    });
  } catch (e) {
    return jsonError(e);
  }
}
