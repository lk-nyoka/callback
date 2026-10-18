"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ErrorNote, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { api } from "@/lib/client";
import type { CareerFact, FactType, SearchIntent } from "@/lib/types";

const TYPE_ORDER: FactType[] = ["experience", "project", "achievement", "education", "certification", "skill"];
const TYPE_LABEL: Record<FactType, string> = {
  experience: "Experience",
  project: "Projects",
  achievement: "Achievements",
  education: "Education",
  certification: "Certifications",
  skill: "Skills",
};

export default function VaultPage() {
  const { state, refresh } = useWorkspace();
  if (!state) return <p className="text-muted">Loading your Vault…</p>;
  const hasDocs = state.documents.length > 0;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Career Vault</h1>
      <p className="mt-2 max-w-prose text-muted">
        Callback only uses facts you confirm here. Each one is linked to the exact words in your CV, so every claim in an application can be traced back to its source.
      </p>
      {!hasDocs ? <Upload onDone={refresh} /> : <Review facts={state.facts} refresh={refresh} docs={state.documents} />}
      {hasDocs && <IntentForm intent={state.intent} confirmed={state.facts.filter((f) => f.status === "user_confirmed").length} />}
    </div>
  );
}

function Upload({ onDone }: { onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState<"file" | "sample" | null>(null);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function send(file: File) {
    setBusy("file");
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api("/api/documents", { method: "POST", body: fd });
      await onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function sample() {
    setBusy("sample");
    setErr("");
    try {
      await api("/api/demo", { method: "POST" });
      await onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="mt-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) send(f);
        }}
        className={`rounded-xl border-2 border-dashed p-10 text-center ${drag ? "border-verified bg-verified-tint" : "border-rule-strong bg-surface"}`}
      >
        <p className="text-lg font-semibold">Upload your CV</p>
        <p className="mt-1 text-sm text-muted">PDF or TXT, up to 5 MB. Read by Nemotron 3.5 Lightning, stored only in your private workspace.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" disabled={!!busy} onClick={() => input.current?.click()}>
            {busy === "file" ? <Spinner /> : null}
            {busy === "file" ? "Reading your CV…" : "Choose a file"}
          </button>
          <button className="btn btn-quiet" disabled={!!busy} onClick={sample}>
            {busy === "sample" ? <Spinner /> : null}
            {busy === "sample" ? "Reading sample CV…" : "Use a sample CV"}
          </button>
        </div>
        <input ref={input} type="file" accept=".pdf,.txt,.md" className="sr-only" onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
        <p className="mt-4 text-xs text-muted">The sample is a fictional junior data analyst in Johannesburg.</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted">
          This is a hackathon build with no accounts: your workspace is tied to this browser. Remove ID numbers and your home address from your CV before uploading.
        </p>
      </div>
      <div className="mt-4">
        <ErrorNote>{err}</ErrorNote>
      </div>
    </section>
  );
}

function Review({ facts, refresh, docs }: { facts: CareerFact[]; refresh: () => Promise<void>; docs: { filename: string }[] }) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const live = facts.filter((f) => f.status !== "rejected");
  const pending = facts.filter((f) => f.status === "extracted").length;
  const confirmed = facts.filter((f) => f.status === "user_confirmed").length;
  async function confirmAll() {
    setBusy(true);
    try {
      await api("/api/facts", { method: "PATCH", json: { action: "confirm_all_extracted" } });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
        <div>
          <p className="text-sm text-muted">From {docs.map((d) => d.filename).join(", ")}</p>
          <p className="mt-1 font-medium">
            {confirmed} confirmed{pending > 0 && <span className="text-caution">, {pending} waiting for you</span>}
          </p>
        </div>
        {pending > 0 && (
          <button className="btn btn-quiet btn-sm" onClick={confirmAll} disabled={busy}>
            Confirm all {pending} as read
          </button>
        )}
      </div>
      <ErrorNote>{err}</ErrorNote>
      {TYPE_ORDER.map((t) => {
        const group = live.filter((f) => f.type === t);
        if (!group.length) return null;
        return (
          <div key={t} className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted">{TYPE_LABEL[t]}</h2>
            <ul className="space-y-3">
              {group.map((f) => (
                <FactRow key={f.id} fact={f} refresh={refresh} />
              ))}
            </ul>
          </div>
        );
      })}
      <AddFact refresh={refresh} />
    </section>
  );
}

function FactRow({ fact, refresh }: { fact: CareerFact; refresh: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(fact.text);
  const [busy, setBusy] = useState(false);
  async function patch(body: Partial<CareerFact>) {
    setBusy(true);
    try {
      await api(`/api/facts/${fact.id}`, { method: "PATCH", json: body });
      await refresh();
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }
  const confirmed = fact.status === "user_confirmed";
  return (
    <li className={`rounded-xl border bg-surface p-4 ${confirmed ? "border-rule" : "border-caution/50"}`}>
      {editing ? (
        <div className="space-y-2">
          <label className="sr-only" htmlFor={`f-${fact.id}`}>Fact text</label>
          <textarea id={`f-${fact.id}`} className="field min-h-20" value={text} onChange={(e) => setText(e.target.value)} />
          <p className="text-xs text-muted">Edits must stay true to your source. The quote below doesn&apos;t change.</p>
        </div>
      ) : (
        <p className="font-medium">{fact.text}</p>
      )}
      <p className="quote mt-2 border-l-2 border-rule-strong pl-3 text-ink-2">
        {fact.quoteStart >= 0 ? <>&ldquo;{fact.evidenceQuote}&rdquo;</> : <span className="not-italic text-muted">Added by you</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button className="btn btn-primary btn-sm" disabled={busy || text.trim().length < 3} onClick={() => patch({ text, status: "user_confirmed" })}>
              Save and confirm
            </button>
            <button className="btn btn-quiet btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            {confirmed ? (
              <span className="mr-1 text-sm font-semibold text-verified">✓ Confirmed</span>
            ) : (
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => patch({ status: "user_confirmed" })}>
                Confirm
              </button>
            )}
            <button className="btn btn-quiet btn-sm" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button className="btn btn-quiet btn-sm" disabled={busy} onClick={() => patch({ status: "rejected" })}>
              Not true, remove
            </button>
          </>
        )}
      </div>
    </li>
  );
}

function AddFact({ refresh }: { refresh: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [type, setType] = useState<FactType>("experience");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-10 rounded-xl border border-rule bg-sunk p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("/api/facts", { method: "POST", json: { text, type } });
          setText("");
          await refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-semibold">Add something your CV leaves out</h2>
      <p className="mt-1 text-sm text-muted">Only add what you could prove in an interview. Facts you add are marked as yours.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="newfact">New fact</label>
        <input id="newfact" className="field" placeholder="e.g. Wrote unit tests with pytest for my load-shedding project" value={text} onChange={(e) => setText(e.target.value)} />
        <label className="sr-only" htmlFor="newtype">Type</label>
        <select id="newtype" className="field sm:w-44" value={type} onChange={(e) => setType(e.target.value as FactType)}>
          {TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <button className="btn btn-primary shrink-0" disabled={busy || text.trim().length < 3}>
          Add fact
        </button>
      </div>
    </form>
  );
}

function IntentForm({ intent, confirmed }: { intent: SearchIntent | null; confirmed: number }) {
  const router = useRouter();
  const { refresh } = useWorkspace();
  const [role, setRole] = useState(intent?.role ?? "Data Analyst");
  const [locations, setLocations] = useState((intent?.locations ?? ["Johannesburg"]).filter((l) => !/remote/i.test(l)).join(", "));
  const [remoteOk, setRemoteOk] = useState(intent?.remoteOk ?? true);
  const [seniority, setSeniority] = useState<SearchIntent["seniority"]>(intent?.seniority ?? "junior");
  const [keywords, setKeywords] = useState((intent?.keywords ?? []).join(", "));
  const [dealbreakers, setDealbreakers] = useState((intent?.dealbreakers ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  return (
    <section className="mt-14 border-t border-rule pt-10">
      <h2 className="text-2xl font-semibold tracking-tight">What you&apos;re looking for</h2>
      <p className="mt-1 text-muted">Hard filters run in code before any model is used, so nothing is spent on roles you would never take.</p>
      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            const locs = split(locations);
            await api("/api/intent", {
              method: "POST",
              json: { role, locations: remoteOk ? [...locs, "Remote"] : locs, remoteOk, seniority, keywords: split(keywords), dealbreakers: split(dealbreakers) },
            });
            await api("/api/discover", { method: "POST" });
            await refresh();
            router.push("/jobs");
          } catch (e) {
            setErr((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <Field label="Role" id="role">
          <input id="role" className="field" value={role} onChange={(e) => setRole(e.target.value)} required />
        </Field>
        <Field label="Level" id="seniority">
          <select id="seniority" className="field" value={seniority} onChange={(e) => setSeniority(e.target.value as SearchIntent["seniority"])}>
            <option value="intern">Internship or graduate</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid-level</option>
            <option value="senior">Senior</option>
            <option value="any">Any</option>
          </select>
        </Field>
        <Field label="Where you can work" id="loc" hint="Comma separated">
          <input id="loc" className="field" value={locations} onChange={(e) => setLocations(e.target.value)} />
        </Field>
        <Field label="Extra keywords" id="kw" hint="Optional">
          <input id="kw" className="field" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="analytics, insights" />
        </Field>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" checked={remoteOk} onChange={(e) => setRemoteOk(e.target.checked)} className="size-4 accent-[var(--verified)]" />
          Include remote roles open to where you live
        </label>
        <Field label="Dealbreakers" id="db" hint="Roles mentioning these are skipped">
          <input id="db" className="field" value={dealbreakers} onChange={(e) => setDealbreakers(e.target.value)} placeholder="commission only, unpaid" />
        </Field>
        <div className="flex flex-col justify-end gap-2 sm:col-span-2">
          <ErrorNote>{err}</ErrorNote>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" disabled={busy || confirmed < 3}>
              {busy && <Spinner />}
              {busy ? "Checking employer job boards…" : "Find roles"}
            </button>
            {confirmed < 3 && <span className="text-sm text-muted">Confirm at least 3 facts first.</span>}
            {busy && <span className="text-sm text-muted">Usually under a minute: boards, links, then fit scoring with Nemotron 3 Super.</span>}
          </div>
        </div>
      </form>
    </section>
  );
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label} {hint && <span className="font-normal text-muted">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
