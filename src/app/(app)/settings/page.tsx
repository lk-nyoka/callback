"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace";
import { api, shortModel } from "@/lib/client";

export default function SettingsPage() {
  const { state, refresh } = useWorkspace();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  if (!state) return <p className="text-muted">Loading…</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Your data</h1>
      <p className="mt-2 max-w-prose text-muted">This workspace is private to this browser. There is no account and no one else can see it.</p>

      <section className="mt-8 rounded-xl border border-rule bg-surface p-6">
        <h2 className="font-semibold">What Callback holds</h2>
        <ul className="mt-3 space-y-1 text-ink-2">
          <li>{state.documents.length} document{state.documents.length === 1 ? "" : "s"} and {state.facts.length} extracted facts</li>
          <li>{state.jobs.length} saved roles with their evidence</li>
          <li>{state.applications.length} application packs</li>
          <li>A log of model calls and fetched sources, shown under &ldquo;How this ran&rdquo;</li>
        </ul>
        <h2 className="mt-6 font-semibold">Where it goes</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-2">
          <li>Your CV text is sent to Nebius Token Factory for inference by {Object.values(state.env.models).map(shortModel).join(", ")}. It is not used to train anything by Callback.</li>
          <li>Job searches go to employers&apos; public job boards{state.env.tavily ? " and Tavily" : ""}. Your CV is never sent to them.</li>
          <li>Nothing is ever sent to an employer. You apply yourself.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="btn btn-quiet" href="/api/workspace">
            Export everything (JSON)
          </a>
          {!confirm ? (
            <button className="btn btn-quiet text-blocked" onClick={() => setConfirm(true)}>
              Delete everything
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm">This removes your CV, Vault, jobs and packs for good.</span>
              <button
                className="btn btn-primary bg-blocked"
                onClick={async () => {
                  await api("/api/workspace", { method: "DELETE" });
                  await refresh();
                  router.push("/vault");
                }}
              >
                Yes, delete
              </button>
              <button className="btn btn-quiet" onClick={() => setConfirm(false)}>
                Keep my data
              </button>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
