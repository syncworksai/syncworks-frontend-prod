import React, { useMemo } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Play, Wrench } from "lucide-react";
import { hasPaidJob, pilotNextAction } from "../../utils/businessPilotWorkflow";

export default function SboFirstJobGuide({
  tickets, loading, onIntake, onImport, onDispatch, onTickets, onFinance, onReports, onPilot, onTicket,
}) {
  const rows = Array.isArray(tickets) ? tickets : [];
  const paid = hasPaidJob(rows);
  const next = useMemo(() => pilotNextAction(rows), [rows]);
  const targets = {
    intake: onIntake, dispatch: onDispatch, ticket: () => onTicket(next.ticketId),
    reports: onReports,
  };

  return (
    <section aria-labelledby="first-job-guide" className="rounded-[1.7rem] border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-indigo-500/10 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-200">
            {paid ? "Keep business moving" : "Start here · first real job"}
          </div>
          <h2 id="first-job-guide" className="mt-1 text-xl font-black tracking-tight text-white">
            {loading ? "Finding your next step…" : next.title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300">
            {loading ? "Checking your visible ticket history." : next.description}
          </p>
        </div>
        <button type="button" onClick={onPilot} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-xs font-black text-cyan-100 hover:border-cyan-400/50">
          <ClipboardList className="h-4 w-4" aria-hidden="true" /> Pilot test checklist
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={loading ? undefined : targets[next.target]} disabled={loading}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-black text-slate-950 disabled:opacity-50">
          <Play className="h-4 w-4" aria-hidden="true" /> {loading ? "Loading…" : next.action} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onIntake}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/75 px-4 text-sm font-bold text-white hover:border-cyan-400/40">
          + Log a customer call
        </button>
        <button type="button" onClick={onImport}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 text-sm font-bold text-emerald-200 hover:border-emerald-400">
          Import existing customers
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { title: "1. Log customer", detail: "One-call intake", onClick: onIntake, icon: CheckCircle2 },
          { title: "2. Assign work", detail: "Technician board", onClick: onDispatch, icon: Wrench },
          { title: "3. Complete & bill", detail: "Ticket workflow", onClick: onTickets, icon: CheckCircle2 },
          { title: "4. Get paid", detail: "Invoices & payments", onClick: onFinance, icon: CheckCircle2 },
        ].map((item) => (
          <button type="button" key={item.title} onClick={item.onClick}
            className="flex min-h-[80px] flex-col justify-center rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left hover:border-cyan-400/40">
            <span className="text-xs font-black text-white">{item.title}</span>
            <span className="mt-1 text-[11px] text-slate-400">{item.detail}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-4 text-slate-500">
        Steps are shortcuts, not claims that your workflow passed testing. Use a real customer with permission, or a separate demo business so test jobs do not distort financial reports.
      </p>
    </section>
  );
}
