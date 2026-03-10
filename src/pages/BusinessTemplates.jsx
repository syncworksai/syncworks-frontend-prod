// src/pages/BusinessTemplates.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import { useAuth } from "../auth/AuthContext";

function Btn({ children, tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    rose: "bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    amber: "bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/20 text-amber-200",
  };
  return (
    <button
      className={
        "inline-flex items-center justify-center h-9 text-xs rounded-xl px-3 border transition whitespace-nowrap " +
        (tones[tone] || tones.slate) +
        " " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="font-semibold">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export default function BusinessTemplates() {
  const { mode } = useAuth();
  const isSboLike = mode === "SBO" || mode === "EMPLOYEE" || mode === "PROPERTY_MGR" || mode === "PM";

  const [items, setItems] = useState([]);
  const [kind, setKind] = useState("QUOTE"); // QUOTE | INVOICE

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const res = await api.get("/doc-templates/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setItems(list);
    } catch (e) {
      setItems([]);
      setErr(e?.response?.data?.detail || "Failed to load templates (missing X-Business-Id?)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    function onBizChanged() {
      load();
    }
    window.addEventListener("sw:activeBusinessChanged", onBizChanged);
    return () => window.removeEventListener("sw:activeBusinessChanged", onBizChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return (items || []).filter((t) => (t?.kind || "").toUpperCase() === kind);
  }, [items, kind]);

  async function create() {
    setErr("");
    setMsg("");
    const nm = (name || "").trim();
    if (!nm) return setErr("Template name is required.");
    const amt = safeNum(amount);

    try {
      await api.post("/doc-templates/", {
        kind,
        name: nm,
        payload: { amount: amt, notes: (notes || "").trim() },
        is_active: true,
      });
      setName("");
      setAmount("");
      setNotes("");
      setMsg("Template saved ✅");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to save template");
    }
  }

  async function remove(id) {
    if (!id) return;
    setErr("");
    setMsg("");
    try {
      await api.delete(`/doc-templates/${id}/`);
      setMsg("Template deleted.");
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Delete failed");
    }
  }

  if (!isSboLike) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100">
        <ModeBar title="Templates" subtitle="Quote/Invoice templates are provider-only." />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
            Switch to SBO/Employee mode to manage business templates.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Business Templates" subtitle="Shared quote/invoice templates for your active business." />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {err ? (
          <div className="text-sm text-red-200 bg-red-900/10 border border-red-800 rounded-xl p-3">{err}</div>
        ) : null}
        {msg ? (
          <div className="text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">
            {msg}
          </div>
        ) : null}

        <div className="flex items-center gap-2 flex-wrap">
          <Btn tone={kind === "QUOTE" ? "cyan" : "slate"} onClick={() => setKind("QUOTE")}>
            Quote Templates
          </Btn>
          <Btn tone={kind === "INVOICE" ? "cyan" : "slate"} onClick={() => setKind("INVOICE")}>
            Invoice Templates
          </Btn>

          <div className="ml-auto flex items-center gap-2">
            <Btn onClick={load} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Btn>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title={`Create ${kind === "QUOTE" ? "Quote" : "Invoice"} Template`}>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Template name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Amount (e.g. 125)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <textarea
              className="mt-2 w-full min-h-[120px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Notes / line items / scope..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="mt-3 flex gap-2 flex-wrap">
              <Btn tone="cyan" onClick={create}>
                Save Template
              </Btn>
              <div className="text-[11px] text-slate-500 self-center">
                Uses backend storage per business (shared across employees).
              </div>
            </div>
          </Card>

          <Card title="Saved Templates" right={<div className="text-xs text-slate-500">{filtered.length}</div>}>
            <div className="space-y-2">
              {filtered.length ? (
                filtered.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{t.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Amount: ${safeNum(t?.payload?.amount).toFixed(2)}
                      </div>
                      {t?.payload?.notes ? (
                        <div className="text-xs text-slate-500 mt-2 whitespace-pre-wrap">{t.payload.notes}</div>
                      ) : null}
                      <div className="text-[11px] text-slate-600 mt-2">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                      </div>
                    </div>

                    <Btn tone="rose" onClick={() => remove(t.id)}>
                      Delete
                    </Btn>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No templates yet for this type.</div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
