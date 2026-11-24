import React, { useState } from "react";
import { Activity, CheckCircle2, Copy, RefreshCw, X } from "lucide-react";
import api from "../../api/client";

const SYNC_OHIO = "https://syncworks-backend-prod.onrender.com/api/v1";
const PATHS = [
  { label: "App process", path: "/sync-ai/health/live/" },
  { label: "Database and schema", path: "/sync-ai/health/ready/" },
  { label: "Authenticated AI status", path: "/sync-ai/status/" },
];
const codeOf = (error) => {
  if (error?.response?.status) return "HTTP " + Number(error.response.status);
  if (error?.code === "ECONNABORTED") return "TIMEOUT";
  if (error?.code === "ERR_NETWORK") return "NETWORK / CORS / DNS";
  return String(error?.code || "NO RESPONSE").slice(0, 60);
};
const explain = (record) => {
  if (record.result === "OK") return "Reachable";
  if (record.result === "HTTP 401") return "Sign in again; status requires authentication";
  if (record.result === "HTTP 403") return "Signed-in account lacks permission";
  if (record.result === "HTTP 404") return "API route or routing domain mismatch";
  if (record.result === "HTTP 502" || record.result === "HTTP 503") return "Backend or reverse proxy unavailable";
  if (record.result === "TIMEOUT") return "No response before timeout";
  if (record.result === "NETWORK / CORS / DNS") return "Browser could not complete the request; check Network tab";
  if (record.result === "CONFIGURATION / UNREADY") return "AI is disabled or its provider credentials are not configured on Ohio";
  return "Endpoint did not return the expected response";
};

export default function SyncConnectionDiagnostics({ onRecheck }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState([]);
  const [checkedAt, setCheckedAt] = useState("");
  const origin = (() => {
    try { return new URL(SYNC_OHIO).origin; }
    catch { return "unavailable"; }
  })();
  async function run() {
    if (busy) return;
    setBusy(true);
    setRecords([]);
    const next = [];
    // Separate probes distinguish network, reverse-proxy, DB, authentication
    // and model configuration. Responses are never copied to the report.
    for (const test of PATHS) {
      try {
        const response = await api.get(SYNC_OHIO + test.path, { timeout: 10000 });
        const healthy = test.label === "Authenticated AI status"
          ? response?.data?.enabled === true && response?.data?.configured === true
          : response?.data?.status === (test.label === "App process" ? "ok" : "ready");
        next.push({ label: test.label, result: healthy ? "OK" : "CONFIGURATION / UNREADY", detail: test.label === "Authenticated AI status" && response?.status === 200
          ? (!response?.data?.enabled ? "AI switch disabled" : !response?.data?.configured ? "Provider key not configured" : "Status response not ready")
          : "" });
      } catch (error) {
        next.push({ label: test.label, result: codeOf(error), detail: "" });
      }
      setRecords([...next]);
    }
    setCheckedAt(new Date().toISOString());
    setBusy(false);
    onRecheck?.();
  }
  const report = [
    "SYNC AI CONNECTION CHECK",
    "Time (UTC): " + (checkedAt || "not yet checked"),
    "API origin: " + origin,
    ...records.map((record) => record.label + ": " + record.result + (record.detail ? " — " + record.detail : "")),
  ].join("\n");
  return <>
    <button type="button" onClick={() => { setOpen(true); if (!checkedAt) run(); }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-[#061323]/85 px-2.5 text-[11px] font-bold text-cyan-100 hover:border-cyan-300">
      <Activity size={14}/> Check connection
    </button>
    {open && <div className="fixed inset-0 z-[280] flex justify-end bg-slate-950/75 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="SYNC AI connection diagnostics"
        className="flex h-full w-full max-w-md flex-col border-l border-cyan-400/30 bg-[#061323] text-white">
        <header className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Private pilot diagnostics</p><h2 className="text-lg font-black">SYNC AI Connection Test</h2></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close diagnostics" className="grid h-11 w-11 place-items-center rounded-lg border border-white/15"><X size={18}/></button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-xs leading-5 text-slate-300">Checks the app, database, and authenticated AI status independently. No AI prompts are sent, no work is executed, and no changes are made to your account.</p>
          <p className="break-all rounded-lg border border-white/10 bg-black/20 p-3 text-[11px] text-slate-300">API: {origin}</p>
          {PATHS.map((test) => {
            const result = records.find((r) => r.label === test.label);
            return <div key={test.label} className="rounded-xl border border-white/15 bg-slate-900/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-xs">{test.label}</strong>
                <span className={`text-[11px] font-black ${result?.result === "OK" ? "text-emerald-300" : result ? "text-amber-200" : "text-slate-400"}`}>{result?.result || (busy ? "Checking…" : "Not checked")}</span>
              </div>
              {result && <p className="mt-2 text-[11px] text-slate-300">{result.detail || explain(result)}</p>}
            </div>;
          })}
          {checkedAt && <p className="text-[11px] text-slate-400">Last checked {new Date(checkedAt).toLocaleString()}.</p>}
          <p className="text-[11px] text-slate-400">This report intentionally excludes account tokens, prompts, and personal data.</p>
        </div>
        <footer className="flex gap-2 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={run} disabled={busy} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-xs font-black disabled:opacity-50"><RefreshCw size={16}/>{busy ? "Checking…" : "Run tests again"}</button>
          <button type="button" disabled={!records.length} onClick={() => navigator.clipboard?.writeText(report)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-3 text-xs font-bold disabled:opacity-50"><Copy size={15}/> Copy report</button>
        </footer>
      </section>
    </div>}
  </>;
}
