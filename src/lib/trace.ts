import { nanoid } from "nanoid";
import type { ModelCall, SourceFetch } from "./types";

// Collects every model call and source fetch made while serving one request,
// so the transparency panel can show exactly what ran.
export class Trace {
  calls: ModelCall[] = [];
  fetches: SourceFetch[] = [];

  addCall(c: Omit<ModelCall, "id" | "createdAt">) {
    this.calls.push({ ...c, id: nanoid(10), createdAt: new Date().toISOString() });
  }

  addFetch(f: Omit<SourceFetch, "id" | "createdAt">) {
    this.fetches.push({ ...f, id: nanoid(10), createdAt: new Date().toISOString() });
  }
}
