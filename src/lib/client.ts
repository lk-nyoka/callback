"use client";

import type { Application, CareerFact, JobPosting, ModelCall, SearchIntent, SourceFetch } from "./types";

export type ClientJob = Omit<JobPosting, "descriptionText"> & { descriptionPreview: string };

export interface ClientState {
  documents: { id: string; filename: string; uploadedAt: string; chars: number }[];
  facts: CareerFact[];
  intent: SearchIntent | null;
  jobs: ClientJob[];
  applications: Application[];
  modelCalls: ModelCall[];
  sourceFetches: SourceFetch[];
  watchRuns: { at: string; newJobs: number; changed: number }[];
  env: { tavily: boolean; nebius: boolean; ultra: boolean; models: Record<string, string>; dailyCap: number };
}

export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export function shortModel(id: string) {
  if (/lightning/i.test(id)) return "Nemotron 3.5 Lightning";
  if (/ultra/i.test(id)) return "Nemotron 3 Ultra";
  if (/super/i.test(id)) return "Nemotron 3 Super";
  if (/nano/i.test(id)) return "Nemotron 3 Nano";
  return id;
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
