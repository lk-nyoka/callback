import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { config } from "./config";
import type {
  Application,
  CareerFact,
  JobPosting,
  ModelCall,
  SearchIntent,
  SourceDocument,
  SourceFetch,
} from "./types";

// Each visitor gets an isolated workspace (cookie-scoped). The whole workspace
// is one JSON document, which maps 1:1 to a single jsonb row in Postgres
// (Supabase adapter) for deployment. Local dev uses files in .data/.

export interface WorkspaceState {
  id: string;
  createdAt: string;
  documents: SourceDocument[];
  facts: CareerFact[];
  intent: SearchIntent | null;
  jobs: JobPosting[];
  applications: Application[];
  modelCalls: ModelCall[];
  sourceFetches: SourceFetch[];
  watchRuns: { at: string; newJobs: number; changed: number }[];
}

export function emptyWorkspace(id: string): WorkspaceState {
  return {
    id,
    createdAt: new Date().toISOString(),
    documents: [],
    facts: [],
    intent: null,
    jobs: [],
    applications: [],
    modelCalls: [],
    sourceFetches: [],
    watchRuns: [],
  };
}

interface Adapter {
  load(id: string): Promise<WorkspaceState | null>;
  save(state: WorkspaceState): Promise<void>;
  remove(id: string): Promise<void>;
  list(): Promise<string[]>;
}

const fileAdapter: Adapter = {
  async load(id) {
    try {
      const raw = await fs.readFile(filePath(id), "utf8");
      return JSON.parse(raw) as WorkspaceState;
    } catch {
      return null;
    }
  },
  async save(state) {
    await fs.mkdir(config.dataDir, { recursive: true });
    const p = filePath(state.id);
    const tmp = p + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(state));
    await fs.rename(tmp, p);
  },
  async remove(id) {
    await fs.rm(filePath(id), { force: true });
  },
  async list() {
    try {
      const files = await fs.readdir(config.dataDir);
      return files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
    } catch {
      return [];
    }
  },
};

function filePath(id: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("bad workspace id");
  return path.join(config.dataDir, `${id}.json`);
}

// Supabase adapter (PostgREST). Table: workspaces(id text primary key, state jsonb, updated_at timestamptz)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdapter: Adapter = {
  async load(id) {
    const r = await fetch(`${supabaseUrl}/rest/v1/workspaces?id=eq.${encodeURIComponent(id)}&select=state`, {
      headers: sbHeaders(),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`supabase load ${r.status}`);
    const rows = (await r.json()) as { state: WorkspaceState }[];
    return rows[0]?.state ?? null;
  },
  async save(state) {
    const r = await fetch(`${supabaseUrl}/rest/v1/workspaces`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: state.id, state, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(`supabase save ${r.status}: ${await r.text()}`);
  },
  async remove(id) {
    await fetch(`${supabaseUrl}/rest/v1/workspaces?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: sbHeaders(),
    });
  },
  async list() {
    const r = await fetch(`${supabaseUrl}/rest/v1/workspaces?select=id`, { headers: sbHeaders(), cache: "no-store" });
    if (!r.ok) return [];
    return ((await r.json()) as { id: string }[]).map((x) => x.id);
  },
};

function sbHeaders() {
  return {
    apikey: supabaseKey!,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
  };
}

// In a deployed environment, never silently fall back to local files (they
// vanish between serverless invocations). Fail loudly instead.
const deployed = !!process.env.VERCEL;
const misconfigured: Adapter = {
  async load() {
    throw new Error("Storage is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  },
  async save() {
    throw new Error("Storage is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  },
  async remove() {},
  async list() {
    return [];
  },
};

const adapter: Adapter = supabaseUrl && supabaseKey ? supabaseAdapter : deployed ? misconfigured : fileAdapter;
export const storageMode = supabaseUrl && supabaseKey ? "supabase" : deployed ? "unconfigured" : "local-files";

// Serialise writes per workspace within a process to avoid lost updates.
const locks = new Map<string, Promise<unknown>>();

export async function loadWorkspace(id: string): Promise<WorkspaceState> {
  return (await adapter.load(id)) ?? emptyWorkspace(id);
}

export async function updateWorkspace<T>(
  id: string,
  fn: (s: WorkspaceState) => T | Promise<T>,
): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  let result!: T;
  const next = prev.then(async () => {
    const s = await loadWorkspace(id);
    result = await fn(s);
    // keep logs bounded
    s.modelCalls = s.modelCalls.slice(-300);
    s.sourceFetches = s.sourceFetches.slice(-300);
    await adapter.save(s);
  });
  locks.set(id, next.catch(() => {}));
  await next;
  return result;
}

export async function deleteWorkspace(id: string) {
  await adapter.remove(id);
}

export async function listWorkspaces() {
  return adapter.list();
}
