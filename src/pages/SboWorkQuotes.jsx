// src/pages/SboWorkQuotes.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import { getQueue, removeQueueItem } from "../components/tickets/useLocalTemplates";

function Pill({ children, tone = "slate" }) {
  const m = {
    slate: "border-slate-800 bg-slate-950/40 text-slate-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };
  return <span className={"inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold " + (m[tone] || m.slate)}>{children}</span>;
}

export default function SboWorkQuotes() {
  const [tick, setTick] = useState(0);

  const items = useMemo(() => {
    const q = getQueue();
    return Array.isArray(q.quotes) ? q.quotes : [];
  }, [tick]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Quote Queue"
        subtitle="SBO-only • drafts marked Ready to Send"
        rightActions={
          <button
            className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs"
            onClick={() => setTick((v) => v + 1)}
            type="button"
          >
            Refresh
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-3">
        <Pill tone="amber">{items.length} item(s)</Pill>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8 text-slate-400">
            No quotes ready yet. Mark “Ready to Send” from a ticket.
          </div>
        ) : (
          items.map((x) => (
            <div key={x.ticket_id} className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-extrabold">Ticket #{x.ticket_id}</div>
                  <div className="text-sm text-slate-300 mt-1">{x.customer_name || "—"} • {x.customer_phone || "—"}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Status: <span className="text-slate-200 font-semibold">{x.status || "—"}</span> • Total: ${Number(x.total || 0).toFixed(2)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/tickets/${x.ticket_id}`} className="h-9 px-3 rounded-xl border border-cyan-500/35 bg-cyan-500/15 hover:bg-cyan-500/20 text-xs text-cyan-200 inline-flex items-center">
                    Open
                  </Link>
                  <button
                    className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs"
                    onClick={() => {
                      removeQueueItem("quote", x.ticket_id);
                      setTick((v) => v + 1);
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}