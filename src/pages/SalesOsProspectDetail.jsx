// src/pages/SalesOsPipelineBoard.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function CardShell({ children }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">{children}</div>;
}

function readSalesSettings() {
  try {
    const raw = localStorage.getItem("sw_salesos_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function safeStr(v) {
  return (v ?? "").toString();
}

function parseCsvText(text) {
  // Simple CSV parser: supports quoted fields, commas, CRLF.
  const rows = [];
  let i = 0;
  const len = text.length;

  function readLine() {
    if (i >= len) return null;
    let out = "";
    let inQuotes = false;
    while (i < len) {
      const ch = text[i];

      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          out += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i += 1;
        continue;
      }

      if (!inQuotes && (ch === "\n" || ch === "\r")) {
        if (ch === "\r" && text[i + 1] === "\n") i += 2;
        else i += 1;
        break;
      }

      out += ch;
      i += 1;
    }
    return out;
  }

  function splitCsvLine(line) {
    const cols = [];
    let cur = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') {
          cur += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (!inQuotes && ch === ",") {
        cols.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    cols.push(cur);
    return cols.map((c) => c.trim());
  }

  let header = null;
  while (true) {
    const line = readLine();
    if (line === null) break;
    if (!line.trim()) continue;

    const cols = splitCsvLine(line);
    if (!header) {
      header = cols.map((h) => h.trim());
      continue;
    }
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = cols[idx] ?? "";
    });
    rows.push(obj);
  }
  return { header: header || [], rows };
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function IconBtn({ title, onClick, disabled, tone = "slate", children }) {
  const cls =
    tone === "cyan"
      ? "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
      : tone === "indigo"
      ? "bg-indigo-500/15 border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-200"
      : tone === "rose"
      ? "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15 text-rose-200"
      : "bg-slate-950/60 border-slate-800 hover:bg-slate-900/40 text-slate-200";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "h-9 w-9 rounded-xl border flex items-center justify-center transition",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        cls
      )}
    >
      {children}
    </button>
  );
}

function ProspectCard({ p, onOpen, onOpenEmail, onOpenCalendar, onDelete, savingId }) {
  return (
    <CardShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onOpen(p)}
            className="text-left font-semibold text-slate-100 hover:underline truncate"
            title="Open Prospect Ticket"
          >
            {p.full_name}
          </button>
          <div className="text-xs text-slate-400 mt-1 truncate">
            {p.email || "No email"} • {p.phone || "No phone"}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <IconBtn title="Add to calendar" tone="cyan" onClick={() => onOpenCalendar(p)}>
            📅
          </IconBtn>

          <IconBtn
            title={p.email ? "Email prospect" : "No email on file"}
            tone="indigo"
            disabled={!p.email}
            onClick={() => onOpenEmail(p)}
          >
            ✉️
          </IconBtn>

          <IconBtn
            title="Delete prospect"
            tone="rose"
            disabled={savingId === p.id}
            onClick={() => onDelete(p)}
          >
            {savingId === p.id ? "…" : "🗑️"}
          </IconBtn>
        </div>
      </div>
    </CardShell>
  );
}

export default function SalesOsPipelineBoard() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const pipelineId = (params.get("pipeline_id") || "").trim();

  const [stages, setStages] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [members, setMembers] = useState([]);

  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [savingId, setSavingId] = useState(null);

  // Agent filter (agency view)
  const [agentFilter, setAgentFilter] = useState("all"); // "all" | memberId

  // ✅ Status filter (stage filter)
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | stageId

  // Calendar modal
  const [calModal, setCalModal] = useState({ open: false, prospect: null });
  const [calForm, setCalForm] = useState({
    title: "",
    start_at: "",
    end_at: "",
    location: "",
    description: "",
  });
  const [creatingEvent, setCreatingEvent] = useState(false);

  // ✅ CSV Import modal (page-level)
  const [csvModal, setCsvModal] = useState({ open: false });
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState({ header: [], rows: [] });
  const [csvErrors, setCsvErrors] = useState([]);
  const [importingCsv, setImportingCsv] = useState(false);

  const agentOptions = useMemo(() => {
    const list = Array.isArray(members) ? members : [];
    return list
      .filter((m) => m.role === "AGENT" || m.role === "OWNER" || m.role === "MANAGER")
      .map((m) => ({
        id: String(m.id),
        label: m.user_display?.name || m.user_display?.email || `Member #${m.id}`,
        role: m.role,
      }));
  }, [members]);

  const stageNameById = useMemo(() => {
    const m = new Map();
    (stages || []).forEach((s) => m.set(String(s.id), s.name));
    return m;
  }, [stages]);

  const statusLabel = useMemo(() => {
    if (statusFilter === "ALL") return "All Statuses";
    return stageNameById.get(String(statusFilter)) || `Stage #${statusFilter}`;
  }, [statusFilter, stageNameById]);

  function cycleStatusFilter() {
    const ordered = Array.isArray(stages) ? stages : [];
    if (!ordered.length) return;

    if (statusFilter === "ALL") {
      setStatusFilter(String(ordered[0].id));
      return;
    }
    const idx = ordered.findIndex((s) => String(s.id) === String(statusFilter));
    if (idx < 0) {
      setStatusFilter("ALL");
      return;
    }
    const next = ordered[idx + 1];
    setStatusFilter(next ? String(next.id) : "ALL");
  }

  const filteredProspects = useMemo(() => {
    const list = Array.isArray(prospects) ? prospects : [];

    let out = list;
    if (agentFilter !== "all") {
      out = out.filter((p) => String(p.assigned_member_id || "") === String(agentFilter));
    }
    if (statusFilter !== "ALL") {
      out = out.filter((p) => String(p.stage_id || "") === String(statusFilter));
    }
    return out;
  }, [prospects, agentFilter, statusFilter]);

  const columns = useMemo(() => {
    const map = new Map();
    (stages || []).forEach((s) => map.set(s.id, []));
    (filteredProspects || []).forEach((p) => {
      if (!map.has(p.stage_id)) map.set(p.stage_id, []);
      map.get(p.stage_id).push(p);
    });

    // If status filter active, show only that column
    if (statusFilter !== "ALL") {
      const st = (stages || []).find((s) => String(s.id) === String(statusFilter));
      if (!st) return [];
      return [{ stage: st, items: map.get(st.id) || [] }];
    }

    return (stages || []).map((s) => ({ stage: s, items: map.get(s.id) || [] }));
  }, [stages, filteredProspects, statusFilter]);

  const load = useCallback(async () => {
    if (!pipelineId) return;
    setLoading(true);
    setErr("");
    try {
      const [s, p] = await Promise.all([
        api.get(`/sales/stages/?pipeline_id=${encodeURIComponent(pipelineId)}`),
        api.get(`/sales/prospects/?pipeline_id=${encodeURIComponent(pipelineId)}`),
      ]);

      const stageList = Array.isArray(s.data) ? s.data : s.data?.results || [];
      const prospectList = Array.isArray(p.data) ? p.data : p.data?.results || [];

      setStages(stageList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
      setProspects(prospectList);

      try {
        const m = await api.get(`/sales/members/?pipeline_id=${encodeURIComponent(pipelineId)}`);
        const ml = Array.isArray(m.data) ? m.data : m.data?.results || [];
        setMembers(ml);
      } catch {
        setMembers([]);
      }
    } catch (e) {
      setStages([]);
      setProspects([]);
      setMembers([]);
      setErr(e?.response?.data?.detail || "Failed to load pipeline board.");
    } finally {
      setLoading(false);
    }
  }, [pipelineId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createProspect() {
    if (!pipelineId) return;
    const full_name = prompt("Prospect full name:");
    if (!full_name) return;

    const email = prompt("Prospect email (optional):") || "";
    const phone = prompt("Prospect phone (optional):") || "";

    const firstStage = stages[0];
    if (!firstStage) {
      alert("No stages found. Create stages first (Sales OS → Stages).");
      return;
    }

    setCreating(true);
    try {
      await api.post("/sales/prospects/", {
        pipeline_id: Number(pipelineId),
        stage_id: firstStage.id,
        full_name,
        email,
        phone,
      });
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to create prospect.");
    } finally {
      setCreating(false);
    }
  }

  function openProspect(p) {
    nav(`/sales/prospects/${p.id}?pipeline_id=${encodeURIComponent(p.pipeline_id || pipelineId)}`);
  }

  async function deleteProspect(p) {
    if (!p?.id) return;
    if (!confirm(`Delete prospect "${p.full_name}"?\n\nThis cannot be undone.`)) return;
    setSavingId(p.id);
    try {
      await api.delete(`/sales/prospects/${p.id}/`);
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Delete failed.");
    } finally {
      setSavingId(null);
    }
  }

  // Email (simple mailto)
  function openEmail(p) {
    const full = p?.full_name || "";
    const first = full.trim().split(" ")[0] || "there";
    const meet = (readSalesSettings()?.zoom_link || readSalesSettings()?.teams_link || "").trim();

    const subject = `Quick follow-up, ${first}`;
    const body = [
      `Hey ${first},`,
      ``,
      `Ready to take the next step — what time works best for a quick call?`,
      meet ? `\nHere’s my meeting link: ${meet}` : ``,
      ``,
      `— Sent from SyncWorks Sales OS`,
    ]
      .filter(Boolean)
      .join("\n");

    const to = encodeURIComponent(p?.email || "");
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  // Calendar
  function openCalendar(p) {
    const settings = readSalesSettings();
    const meet = (settings?.zoom_link || "").trim() || (settings?.teams_link || "").trim() || "";

    const now = new Date();
    const later = new Date(now);
    later.setMinutes(later.getMinutes() + 30);

    const desc = [
      p?.full_name ? `Prospect: ${p.full_name}` : "",
      p?.email ? `Email: ${p.email}` : "",
      p?.phone ? `Phone: ${p.phone}` : "",
      meet ? `Meeting Link: ${meet}` : "",
      p?.notes ? `\nNotes:\n${p.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    setCalForm({
      title: `Appointment: ${p?.full_name || "Prospect"}`,
      start_at: now.toISOString().slice(0, 16),
      end_at: later.toISOString().slice(0, 16),
      location: meet || "",
      description: desc,
    });
    setCalModal({ open: true, prospect: p });
  }

  async function createEvent() {
    const p = calModal.prospect;
    if (!p?.pipeline_id) return alert("Missing pipeline_id.");
    if (!calForm.title.trim()) return alert("Title required.");
    if (!calForm.start_at || !calForm.end_at) return alert("Start/end required.");

    setCreatingEvent(true);
    try {
      await api.post(`/sales/events/`, {
        pipeline_id: Number(p.pipeline_id),
        prospect_id: p.id,
        assigned_member_id: p.assigned_member_id || null,
        title: calForm.title.trim(),
        location: calForm.location,
        description: calForm.description,
        start_at: new Date(calForm.start_at).toISOString(),
        end_at: new Date(calForm.end_at).toISOString(),
      });

      try {
        await api.patch(`/sales/prospects/${p.id}/`, {
          next_follow_up_at: new Date(calForm.start_at).toISOString(),
        });
      } catch {
        // ignore
      }

      setCalModal({ open: false, prospect: null });
      alert("Appointment created ✅");
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to create event.");
    } finally {
      setCreatingEvent(false);
    }
  }

  // CSV Import
  function openCsvImport() {
    setCsvModal({ open: true });
    setCsvFile(null);
    setCsvPreview({ header: [], rows: [] });
    setCsvErrors([]);
  }

  async function handleCsvPick(file) {
    setCsvFile(file || null);
    setCsvErrors([]);
    setCsvPreview({ header: [], rows: [] });

    if (!file) return;

    const text = await file.text();
    const parsed = parseCsvText(text);

    const errs = [];
    const headerLower = new Map(parsed.header.map((h) => [h.trim().toLowerCase(), h]));
    if (!headerLower.has("full_name")) errs.push(`Missing required column: full_name`);

    const rows = parsed.rows.slice(0, 100);
    rows.forEach((r, idx) => {
      const key = headerLower.get("full_name") || "full_name";
      const full = safeStr(r[key]).trim();
      if (!full) errs.push(`Row ${idx + 2}: full_name is required`);
    });

    setCsvErrors(errs);
    setCsvPreview({ header: parsed.header, rows });
  }

  function downloadCsvTemplate() {
    const template = [
      "full_name,email,phone,stage_id,notes,status_label,assigned_member_id,next_follow_up_at",
      'Jane Doe,jane@email.com,555-111-2222,1,"Spoke briefly; wants call next week",Warm,12,2026-02-28T14:00:00Z',
      'Bob Smith,bob@email.com,555-333-4444,,"New lead from referral",Hot,,',
    ].join("\n");

    downloadTextFile("syncworks_salesos_import_template.csv", template);
  }

  async function importCsv() {
    if (!pipelineId) return alert("Missing pipeline_id.");
    if (!csvFile) return alert("Pick a CSV file first.");

    if (csvErrors.length) {
      if (!confirm(`CSV has warnings/errors:\n\n- ${csvErrors.slice(0, 8).join("\n- ")}\n\nImport anyway?`)) return;
    }

    setImportingCsv(true);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("pipeline_id", pipelineId);

      // If status filter is active, allow backend to use it as a default stage
      if (statusFilter !== "ALL") {
        fd.append("default_stage_id", String(statusFilter));
      }

      const res = await api.post(`/sales/prospects/import-csv/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const created = res.data?.created_count ?? res.data?.created ?? null;
      const skipped = res.data?.skipped_count ?? res.data?.skipped ?? null;
      const errors = res.data?.errors ?? [];

      setCsvErrors(Array.isArray(errors) ? errors : []);
      alert(`CSV import done ✅\nCreated: ${created ?? "?"}\nSkipped: ${skipped ?? "?"}`);

      setCsvModal({ open: false });
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || "CSV import failed. (Backend endpoint required)");
    } finally {
      setImportingCsv(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Sales OS • Pipeline Board"
        subtitle={pipelineId ? `Pipeline #${pipelineId}` : "Pick a pipeline"}
        rightActions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={"/sales/dashboard" + (pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : "")}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
            >
              Dashboard
            </Link>

            <Link
              to={"/sales/stages" + (pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : "")}
              className={cx(
                "text-xs rounded-2xl px-3 py-2 border transition",
                pipelineId
                  ? "bg-fuchsia-500/15 border-fuchsia-500/35 hover:bg-fuchsia-500/20 text-fuchsia-200"
                  : "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed pointer-events-none"
              )}
              title="Manage stages/statuses"
            >
              Stages
            </Link>

            <button
              type="button"
              onClick={createProspect}
              disabled={!pipelineId || creating}
              className={cx(
                "text-xs rounded-2xl px-3 py-2 border transition",
                !pipelineId || creating
                  ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
              )}
            >
              {creating ? "Creating..." : "+ New Prospect"}
            </button>

            <button
              type="button"
              onClick={load}
              disabled={!pipelineId || loading}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {!pipelineId ? (
          <div className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
            Missing <b>pipeline_id</b>. Open from Sales OS dashboard.
          </div>
        ) : null}

        {err ? (
          <div className="mt-6 text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div>
        ) : null}

        {/* Filters + PAGE-LEVEL IMPORT */}
        {pipelineId ? (
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <div className="text-xs text-slate-400">Agent:</div>
            <select
              className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              title="Filter prospects by assigned agent"
            >
              <option value="all">All agents</option>
              {agentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} {a.role ? `(${a.role})` : ""}
                </option>
              ))}
            </select>

            <div className="ml-4 text-xs text-slate-400">Status:</div>
            <button
              type="button"
              onClick={cycleStatusFilter}
              disabled={!stages.length}
              className={cx(
                "text-xs rounded-full px-3 py-2 border transition",
                !stages.length
                  ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15 text-amber-200"
              )}
              title="Cycle status filter"
            >
              🏷 {statusLabel} <span className="opacity-70 ml-1">↻</span>
            </button>

            <select
              className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={!stages.length}
              title="Pick a status directly"
            >
              <option value="ALL">All Statuses</option>
              {stages.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
              title="Clear status filter"
            >
              Clear
            </button>

            {/* ✅ PAGE-LEVEL Upload/Import */}
            <button
              type="button"
              onClick={openCsvImport}
              className="text-xs rounded-2xl px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 text-emerald-200"
              title="Upload a previous pipeline CSV and import it"
            >
              ⬆️ Upload / Import CSV
            </button>

            <div className="ml-auto text-xs text-slate-500">
              Showing: <span className="text-slate-200">{filteredProspects.length}</span> prospects
            </div>
          </div>
        ) : null}

        {/* Board */}
        {pipelineId ? (
          <div className="mt-5 overflow-x-auto">
            <div className="flex gap-4 min-w-[980px]">
              {columns.map((col) => (
                <div key={col.stage.id} className="w-80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-slate-100">
                      {col.stage.name} <span className="text-xs text-slate-400">({col.items.length})</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {col.items.map((p) => (
                      <ProspectCard
                        key={p.id}
                        p={p}
                        onOpen={openProspect}
                        onOpenEmail={openEmail}
                        onOpenCalendar={openCalendar}
                        onDelete={deleteProspect}
                        savingId={savingId}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Calendar modal */}
      {calModal.open ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-extrabold">Create Appointment</div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  Prospect: <span className="text-slate-200">{calModal.prospect?.full_name}</span>
                </div>
              </div>
              <button type="button" onClick={() => setCalModal({ open: false, prospect: null })} className="text-slate-300 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="Title"
                value={calForm.title}
                onChange={(e) => setCalForm((s) => ({ ...s, title: e.target.value }))}
              />

              <input
                className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                placeholder="Location or meeting link"
                value={calForm.location}
                onChange={(e) => setCalForm((s) => ({ ...s, location: e.target.value }))}
              />

              <div className="flex flex-col gap-1">
                <div className="text-xs text-slate-400">Start</div>
                <input
                  type="datetime-local"
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                  value={calForm.start_at}
                  onChange={(e) => setCalForm((s) => ({ ...s, start_at: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-xs text-slate-400">End</div>
                <input
                  type="datetime-local"
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                  value={calForm.end_at}
                  onChange={(e) => setCalForm((s) => ({ ...s, end_at: e.target.value }))}
                />
              </div>

              <textarea
                className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 min-h-[140px]"
                placeholder="Description"
                value={calForm.description}
                onChange={(e) => setCalForm((s) => ({ ...s, description: e.target.value }))}
              />
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={createEvent}
                disabled={creatingEvent}
                className={cx(
                  "rounded-2xl px-5 py-3 text-sm font-semibold border transition",
                  creatingEvent
                    ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.15)]"
                )}
              >
                {creatingEvent ? "Creating..." : "Create Event"}
              </button>

              <Link
                to="/sales/settings"
                className="rounded-2xl px-5 py-3 text-sm font-semibold border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40"
              >
                Edit Zoom/Teams default →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* CSV Import modal */}
      {csvModal.open ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-extrabold">Upload / Import CSV</div>
                <div className="text-xs text-slate-400 mt-1">
                  Import into pipeline <span className="text-slate-200">#{pipelineId}</span>
                </div>
              </div>
              <button type="button" onClick={() => setCsvModal({ open: false })} className="text-slate-300 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-4 grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-3">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="font-semibold text-slate-100">Template</div>
                  <div className="text-xs text-slate-400 mt-1">Download, fill, upload.</div>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="mt-3 text-xs rounded-2xl px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 text-emerald-200"
                  >
                    Download CSV Template
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="font-semibold text-slate-100">Choose CSV</div>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleCsvPick(e.target.files?.[0])}
                    className="mt-3 block text-sm text-slate-200"
                  />
                  <div className="text-xs text-slate-500 mt-2">
                    Required: <span className="text-slate-200">full_name</span>
                    <br />
                    Optional: email, phone, stage_id, notes, status_label, assigned_member_id, next_follow_up_at
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="font-semibold text-slate-100">Import</div>
                  <div className="text-xs text-slate-400 mt-1">
                    If Status filter is set, it becomes default stage for blank stage_id rows.
                  </div>
                  <button
                    type="button"
                    onClick={importCsv}
                    disabled={!csvFile || importingCsv}
                    className={cx(
                      "mt-3 w-full text-xs rounded-2xl px-3 py-3 border font-semibold transition",
                      !csvFile || importingCsv
                        ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200"
                    )}
                  >
                    {importingCsv ? "Importing..." : "Import CSV"}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-semibold text-slate-100">Preview</div>
                      <div className="text-xs text-slate-400 mt-1">First 100 rows parsed</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {csvFile ? (
                        <>
                          File: <span className="text-slate-200">{csvFile.name}</span>
                        </>
                      ) : (
                        "No file selected"
                      )}
                    </div>
                  </div>

                  {csvErrors.length ? (
                    <div className="mt-3 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3">
                      <div className="font-semibold">CSV Warnings</div>
                      <div className="mt-2 space-y-1 text-xs">
                        {csvErrors.slice(0, 12).map((x, i) => (
                          <div key={i}>• {x}</div>
                        ))}
                        {csvErrors.length > 12 ? <div>…and {csvErrors.length - 12} more</div> : null}
                      </div>
                    </div>
                  ) : null}

                  {!csvPreview.rows.length ? (
                    <div className="mt-4 text-sm text-slate-400">Pick a CSV to see preview.</div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-slate-300">
                            {csvPreview.header.map((h) => (
                              <th key={h} className="text-left p-2 border-b border-slate-800">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.rows.slice(0, 30).map((r, idx) => (
                            <tr key={idx} className="text-slate-200">
                              {csvPreview.header.map((h) => (
                                <td key={h} className="p-2 border-b border-slate-900/60 align-top">
                                  {safeStr(r[h]).slice(0, 120)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="text-[11px] text-slate-500 mt-2">
                        Tip: Wrap notes in quotes if they contain commas.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCsvModal({ open: false })}
                className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}