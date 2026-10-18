import { z } from "zod";

export const IntentSchema = z.object({
  role: z.string().min(2).max(80),
  keywords: z.array(z.string().max(40)).max(10).default([]),
  locations: z.array(z.string().max(60)).min(1).max(6),
  remoteOk: z.boolean().default(true),
  seniority: z.enum(["intern", "junior", "mid", "senior", "any"]).default("junior"),
  dealbreakers: z.array(z.string().max(60)).max(10).default([]),
});
