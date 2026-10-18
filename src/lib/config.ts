// Central configuration. Model IDs live here and only here.

export type Tier = "lightning" | "super" | "ultra";

export const config = {
  nebiusApiKey: process.env.NEBIUS_API_KEY ?? "",
  nebiusBaseUrl: (process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1/").replace(/\/?$/, "/"),
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  models: {
    lightning: process.env.MODEL_LIGHTNING ?? "nvidia/Nemotron-3_5-Lightning",
    super: process.env.MODEL_SUPER ?? "nvidia/nemotron-3-super-120b-a12b",
    ultra: process.env.MODEL_ULTRA ?? "nvidia/Nemotron-3-Ultra-550b-a55b",
  } satisfies Record<Tier, string>,
  enableUltra: (process.env.ENABLE_ULTRA ?? "true") === "true",
  dailyApplicationCap: Number(process.env.DAILY_APPLICATION_CAP ?? 10),
  dataDir: process.env.CALLBACK_DATA_DIR ?? ".data",
  cronSecret: process.env.CRON_SECRET ?? "",
};

// A failed call degrades one tier, never escalates.
export const FALLBACK: Record<Tier, Tier | null> = {
  ultra: "super",
  super: "lightning",
  lightning: null,
};
