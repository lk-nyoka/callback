"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, type ClientState } from "@/lib/client";

interface Ctx {
  state: ClientState | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const WorkspaceCtx = createContext<Ctx>({ state: null, error: null, refresh: async () => {} });

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ClientState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setState(await api<ClientState>("/api/state"));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  const path = usePathname();
  // Re-sync on every navigation so long-running actions are always reflected.
  useEffect(() => {
    refresh();
  }, [refresh, path]);
  return <WorkspaceCtx.Provider value={{ state, error, refresh }}>{children}</WorkspaceCtx.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceCtx);
