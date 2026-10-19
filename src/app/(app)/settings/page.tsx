"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconDownload, IconLock, IconTrash } from "@/components/icons";
import { SectionTitle } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { api, shortModel } from "@/lib/client";

export default function SettingsPage() {
  const { state, refresh } = useWorkspace();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  if (!state) return <p className="text-muted">Loading…</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle title="Your data" sub="This workspace is private to this browser. There is no account and no one else can see it." />

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Documents", state.documents.length],
          ["Facts", state.facts.length],
          ["Roles", state.jobs.length],
          ["Packs", state.applications.length],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-[20px] px-4 py-3.5">
            <p className="text-xs text-muted">{k}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <section className="glass-strong mt-4 rounded-[26px] p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <IconLock size={16} /> What Callback holds
        </h2>
        <p className="mt-2 text-ink-2">Your documents, the facts extracted from them, saved roles with their evidence, your packs, and a log of model calls and fetched sources (shown under &ldquo;How this ran&rdquo;).</p>
        <h2 className="mt-6 font-semibold">Where it goes</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-2">
          <li>Your CV text is sent to Nebius Token Factory for inference by {Object.values(state.env.models).map(shortModel).join(", ")}. It is not used to train anything by Callback.</li>
          <li>Job searches go to employers&apos; public job boards{state.env.tavily ? " and Tavily" : ""}. Your CV is never sent to them.</li>
          <li>Nothing is ever sent to an employer. You apply yourself.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="btn btn-quiet" href="/api/workspace">
            <IconDownload size={15} /> Export everything (JSON)
          </a>
          {!confirm ? (
            <button className="btn btn-quiet text-blocked" onClick={() => setConfirm(true)}>
              <IconTrash size={15} /> Delete everything
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm">This removes your CV, Vault, jobs and packs for good.</span>
              <button
                className="btn bg-blocked text-white hover:brightness-110"
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
