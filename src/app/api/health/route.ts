import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { storageHealth } from "@/lib/store";

export const dynamic = "force-dynamic";

// Deployment check. Reports which services are configured, never their values.
export async function GET() {
  const storage = await storageHealth();
  return NextResponse.json({
    ok: storage.ok && !!config.nebiusApiKey,
    storage,
    nebius: !!config.nebiusApiKey,
    tavily: !!config.tavilyApiKey,
    cron: !!config.cronSecret,
    demoMode: config.demoMode,
    models: config.models,
  });
}
