// src/pages/SalesOsStagesManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-xs text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/** ---------- Storage ---------- */
function templatesKey(pipelineId) {
  const pid = String(pipelineId || "").trim() || "global";
  return `sw_salesos_email_templates__${pid}`;
}

function readSettings() {
  try {
    const raw = localStorage.getItem("sw_salesos_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readTemplates(pipelineId) {
  try {
    const raw = localStorage.getItem(templatesKey(pipelineId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function writeTemplates(pipelineId, obj) {
  localStorage.setItem(templatesKey(pipelineId), JSON.stringify(obj || {}));
}

function baseTemplates() {
  return {
    intro: {
      id: "intro",
      name: "Intro",
      subject: "Quick intro — {{prospect_name}}",
      body:
        "Hey {{prospect_name}},\n\nI’m reaching out because we help clients with {{pipeline_name}}.\n\nIf you’re open to it, here’s my calendar link and we can do a quick 15-minute call:\n{{meeting_link}}\n\nWebsite: {{website_url}}\n\n— {{agent_name}}",
    },
    followup: {
      id: "followup",
      name: "Follow-up",
      subject: "Following up — quick question",
      body:
        "Hey {{prospect_name}},\n\nJust following up on my last message.\nWhat’s the best time for a quick call this week?\n\nHere’s a link if you’d rather book directly:\n{{meeting_link}}\n\n— {{agent_name}}",
    },
    appointment: {
      id: "appointment",
      name: "Appointment",
      subject: "Appointment details — {{prospect_name}}",
      body:
        "Hey {{prospect_name}},\n\nConfirmed — looking forward to speaking.\n\nMeeting link:\n{{meeting_link}}\n\nIf anything changes, just reply here.\n\n— {{agent_name}}",
    },
    promo: {
      id: "promo",
      name: "Promo / Blast",
      subject: "Quick promo — {{pipeline_name}}",
      body:
        "Hey {{prospect_name}},\n\nQuick note — we’re running a limited promo right now.\n\nIf you want details, reply “YES” and I’ll send options.\n\nWebsite: {{website_url}}\n\n— {{agent_name}}",
    },
  };
}

/** ---------- Merge helpers ---------- */
function resolveMeetingLink(settings) {
  const zoom = (settings?.zoom_link || "").trim();
  const teams = (settings?.teams_link || "").trim();
  return zoom || teams || "";
}

function applyMerge(text, ctx) {
  let out = String(text || "");
  Object.entries(ctx || {}).forEach(([k, v]) => {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ""));
  });
  return out;
}

/** ---------- CSV export ---------- */
function downloadCsv(filename, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const headers = Object.keys(rows[0] || {});
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");

  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ---------- Page-level Sales OS tabs (SBO style) ---------- */
function SalesOsPageTabs({ pipelineId, active }) {
  const withPid = (path) => path + (pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : "");
  const tabs = [
    { key: "dashboard", label: "Dashboard", to: "/sales/dashboard" },
    { key: "board", label: "Board", to: "/sales/board" },
    { key: "calendar", label: "Calendar", to: "/sales/calendar" },
    { key: "seats", label: "Seats", to: "/sales/seats" },
    { key: "settings", label: "Settings", to: "/sales/settings" },
    { key: "stages", label: "Stages", to: "/sales/stages" },
  ];

  return (
    <div className="w-full flex items-center justify-center">
      <div className="inline-flex items-center gap-2 flex-wrap rounded-full border border-slate-800 bg-slate-950/40 p-2">
        {tabs.map((t) => {
          const isOn = t.key === active;
          const disabled = !pipelineId && (t.key === "board" || t.key === "calendar" || t.key === "seats" || t.key === "stages");
          return (
            <Link
              key={t.key}
              to={disabled ? "#" : withPid(t.to)}
              className={cx(
                "text-xs rounded-full px-3 py-2 border transition",
                disabled ? "pointer-events-none opacity-50 bg-slate-950/40 border-slate-800 text-slate-500" : "",
                isOn
                  ? "bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-200"
                  : "bg-slate-950/60 border-slate-800 hover:bg-slate-900/40 text-slate-200"
              )}
              title={disabled ? "Open from Sales OS Dashboard / Board" : ""}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function SalesOsStagesManager() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const pipelineId = (params.get("pipeline_id") || "").trim();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // stages
  const [stages, setStages] = useState([]);

  // pipeline meta (name)
  const [pipeline, setPipeline] = useState(null);

  // templates
  const [templates, setTemplates] = useState({});
  const [activeTemplateId, setActiveTemplateId] = useState("intro");
  const [tplDraft, setTplDraft] = useState({ name: "", subject: "", body: "" });

  // mass email
  const [blast, setBlast] = useState({
    stage_id: "",
    template_id: "promo",
    subject_override: "",
    confirm_phrase: "",
  });
  const [blastBusy, setBlastBusy] = useState(false);
  const [blastMsg, setBlastMsg] = useState("");

  const settings = useMemo(() => readSettings(), []);

  async function loadAll() {
    if (!pipelineId) return;
    setLoading(true);
    setErr("");
    try {
      const [pRes, sRes] = await Promise.all([
        api.get(`/sales/pipelines/${encodeURIComponent(pipelineId)}/`),
        api.get(`/sales/stages/?pipeline_id=${encodeURIComponent(pipelineId)}`),
      ]);

      const pl = pRes.data || null;
      setPipeline(pl);

      const list = Array.isArray(sRes.data) ? sRes.data : sRes.data?.results || [];
      setStages(list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));

      // templates (local)
      const local = readTemplates(pipelineId);
      const base = baseTemplates();
      const merged = { ...base, ...(local || {}) };
      setTemplates(merged);

      // set default stage
      if (list.length && !blast.stage_id) {
        setBlast((x) => ({ ...x, stage_id: String(list[0].id) }));
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load stages/templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId]);

  function saveTemplatesNow(next) {
    setTemplates(next);
    writeTemplates(pipelineId, next);
  }

  function selectTemplate(id) {
    setActiveTemplateId(id);
    const t = templates?.[id];
    setTplDraft({
      name: t?.name || "",
      subject: t?.subject || "",
      body: t?.body || "",
    });
  }

  useEffect(() => {
    const firstId = templates?.intro ? "intro" : Object.keys(templates || {})[0] || "intro";
    if (!activeTemplateId) setActiveTemplateId(firstId);
    const t = templates?.[activeTemplateId];
    if (!t) return;
    setTplDraft({ name: t.name || "", subject: t.subject || "", body: t.body || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  function upsertTemplate() {
    const idRaw = (activeTemplateId || "").trim() || "custom";
    const id = idRaw.replace(/\s+/g, "_").toLowerCase();
    const next = {
      ...(templates || {}),
      [id]: {
        id,
        name: tplDraft.name.trim() || "Custom Template",
        subject: tplDraft.subject || "",
        body: tplDraft.body || "",
      },
    };
    saveTemplatesNow(next);
    setActiveTemplateId(id);
    setBlastMsg("Template saved ✅");
    setTimeout(() => setBlastMsg(""), 1200);
  }

  function createNewTemplate() {
    const name = prompt("Template name:", "New Template");
    if (!name) return;
    const id = name.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const next = {
      ...(templates || {}),
      [id]: { id, name: name.trim(), subject: "", body: "" },
    };
    saveTemplatesNow(next);
    selectTemplate(id);
  }

  function deleteTemplate(id) {
    if (!templates?.[id]) return;
    if (!confirm(`Delete template "${templates[id].name}"?`)) return;
    const next = { ...(templates || {}) };
    delete next[id];
    saveTemplatesNow(next);
    const nextId = Object.keys(next)[0] || "intro";
    setActiveTemplateId(nextId);
  }

  async function createStage() {
    if (!pipelineId) return;
    const name = prompt("Stage name:", "New Stage");
    if (!name) return;
    try {
      await api.post("/sales/stages/", { pipeline_id: Number(pipelineId), name: name.trim() });
      await loadAll();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to create stage.");
    }
  }

  async function renameStage(stage) {
    const name = prompt("Rename stage:", stage?.name || "");
    if (!name) return;
    try {
      await api.patch(`/sales/stages/${stage.id}/`, { name: name.trim() });
      await loadAll();
    } catch (e) {
      alert(e?.response?.data?.detail || "Rename failed.");
    }
  }

  async function deleteStage(stage) {
    if (!confirm(`Delete stage "${stage?.name}"?\n\nProspects in this stage may become unassigned.`)) return;
    try {
      await api.delete(`/sales/stages/${stage.id}/`);
      await loadAll();
    } catch (e) {
      alert(e?.response?.data?.detail || "Delete failed.");
    }
  }

  function mergePreviewForFakeProspect() {
    const meet = resolveMeetingLink(settings);
    const ctx = {
      prospect_name: "Jane Doe",
      pipeline_name: pipeline?.name || `Pipeline #${pipelineId}`,
      website_url: settings?.website_url || "",
      zoom_link: settings?.zoom_link || "",
      teams_link: settings?.teams_link || "",
      meeting_link: meet || "",
      agent_name: "Agent",
    };

    return {
      subject: applyMerge(tplDraft.subject, ctx),
      body: applyMerge(tplDraft.body, ctx),
    };
  }

  async function runMassEmail() {
    if (!pipelineId) return;
    if (!blast.stage_id) return alert("Pick a stage.");
    if (!blast.template_id) return alert("Pick a template.");

    const tpl = templates?.[blast.template_id];
    if (!tpl) return alert("Template not found.");

    const expected = `SEND ${String(blast.stage_id)}`;
    if ((blast.confirm_phrase || "").trim() !== expected) {
      return alert(`Type exactly: ${expected}`);
    }

    setBlastBusy(true);
    setBlastMsg("");

    try {
      const payload = {
        pipeline_id: Number(pipelineId),
        stage_id: Number(blast.stage_id),
        template_id: tpl.id,
        subject: (blast.subject_override || "").trim() || tpl.subject || "",
        body: tpl.body || "",
      };

      try {
        const res = await api.post(`/sales/pipelines/${encodeURIComponent(pipelineId)}/bulk-email/`, payload);
        const ok = res?.data?.ok;
        const sent = res?.data?.sent ?? null;
        if (ok) {
          setBlastMsg(`Mass email sent ✅${sent != null ? ` (${sent})` : ""}`);
          setBlast((x) => ({ ...x, confirm_phrase: "" }));
          return;
        }
      } catch (e) {
        const status = e?.response?.status;
        if (status && status !== 404) throw e;
      }

      const pRes = await api.get(
        `/sales/prospects/?pipeline_id=${encodeURIComponent(pipelineId)}&stage_id=${encodeURIComponent(blast.stage_id)}`
      );
      const list = Array.isArray(pRes.data) ? pRes.data : pRes.data?.results || [];
      const meet = resolveMeetingLink(settings);

      const rows = list
        .filter((p) => p?.email)
        .map((p) => {
          const ctx = {
            prospect_name: p.full_name || "",
            pipeline_name: pipeline?.name || `Pipeline #${pipelineId}`,
            website_url: settings?.website_url || "",
            zoom_link: settings?.zoom_link || "",
            teams_link: settings?.teams_link || "",
            meeting_link: meet || "",
            agent_name: "Agent",
          };
          return {
            email: p.email,
            prospect_name: p.full_name || "",
            subject: applyMerge((blast.subject_override || "").trim() || tpl.subject || "", ctx),
            body: applyMerge(tpl.body || "", ctx),
          };
        });

      if (!rows.length) {
        setBlastMsg("No prospects with email in that stage.");
        return;
      }

      downloadCsv(`salesos_mass_email_pipeline_${pipelineId}_stage_${blast.stage_id}.csv`, rows);
      setBlastMsg("Bulk endpoint not found — exported CSV ✅ (use Gmail/SendGrid mail merge)");
      setBlast((x) => ({ ...x, confirm_phrase: "" }));
    } catch (e) {
      setBlastMsg(e?.response?.data?.detail || "Mass email failed.");
    } finally {
      setBlastBusy(false);
      setTimeout(() => setBlastMsg(""), 6000);
    }
  }

  const preview = useMemo(() => mergePreviewForFakeProspect(), [tplDraft, pipelineId, pipeline, settings]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar title="Sales OS • Stages + Email Templates" subtitle={pipelineId ? `Pipeline #${pipelineId}` : "Open from Board"} />

      {/* ✅ page-level tabs in the middle (NOT ModeBar rightActions) */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <SalesOsPageTabs pipelineId={pipelineId} active="stages" />
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {!pipelineId ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
            Missing <b>pipeline_id</b>. Open from Sales OS Board.
            <div className="mt-3">
              <button
                type="button"
                onClick={() => nav("/sales/board")}
                className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
              >
                Go to Board →
              </button>
            </div>
          </div>
        ) : null}

        {err ? <div className="text-sm text-red-300 bg-red-900/20 border border-red-800 rounded-2xl p-3">{err}</div> : null}

        {blastMsg ? (
          <div className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3">
            {blastMsg}
          </div>
        ) : null}

        {/* Stages */}
        <Card
          title="Stages"
          subtitle="Monday.com style statuses. Board columns are derived from these."
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={createStage}
                disabled={!pipelineId || loading}
                className={cx(
                  "text-xs rounded-2xl px-3 py-2 border transition",
                  !pipelineId || loading
                    ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
                )}
              >
                + New Stage
              </button>

              <button
                type="button"
                onClick={loadAll}
                disabled={!pipelineId || loading}
                className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          }
        >
          {stages.length === 0 ? (
            <div className="text-sm text-slate-400">No stages yet.</div>
          ) : (
            <div className="space-y-2">
              {stages.map((s) => (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate">{s.name}</div>
                    <div className="text-xs text-slate-500 mt-1">Stage ID: {s.id}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => renameStage(s)}
                      className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStage(s)}
                      className="text-xs rounded-2xl px-3 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/15 text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Templates */}
        <Card
          title="Draft Email Templates"
          subtitle="Fast outreach + follow-ups. Saved per pipeline. Used by the Board + Agent pages."
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={createNewTemplate}
                className="text-xs rounded-2xl px-3 py-2 bg-fuchsia-500/15 border border-fuchsia-500/35 hover:bg-fuchsia-500/20 text-fuchsia-200"
              >
                + New Template
              </button>
              <button
                type="button"
                onClick={upsertTemplate}
                className="text-xs rounded-2xl px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
              >
                Save Template
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* list */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400 mb-2">Templates</div>
              <div className="space-y-2">
                {Object.keys(templates || {}).length === 0 ? (
                  <div className="text-sm text-slate-400">No templates.</div>
                ) : (
                  Object.values(templates).map((t) => {
                    const on = t.id === activeTemplateId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTemplate(t.id)}
                        className={cx(
                          "w-full text-left rounded-2xl border px-3 py-2 transition",
                          on
                            ? "bg-fuchsia-500/12 border-fuchsia-500/30 text-fuchsia-200"
                            : "bg-slate-950/60 border-slate-800 hover:bg-slate-900/40 text-slate-200"
                        )}
                      >
                        <div className="font-semibold text-sm truncate">{t.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{t.subject}</div>
                      </button>
                    );
                  })
                )}
              </div>

              {templates?.[activeTemplateId] ? (
                <button
                  type="button"
                  onClick={() => deleteTemplate(activeTemplateId)}
                  className="mt-3 w-full text-xs rounded-2xl px-3 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/15 text-rose-200"
                >
                  Delete Selected
                </button>
              ) : null}
            </div>

            {/* editor */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400 mb-2">Editor</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                  placeholder="Template name"
                  value={tplDraft.name}
                  onChange={(e) => setTplDraft((s) => ({ ...s, name: e.target.value }))}
                />
                <input
                  className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
                  placeholder="Subject"
                  value={tplDraft.subject}
                  onChange={(e) => setTplDraft((s) => ({ ...s, subject: e.target.value }))}
                />
              </div>

              <textarea
                className="mt-3 w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 min-h-[220px]"
                placeholder="Body"
                value={tplDraft.body}
                onChange={(e) => setTplDraft((s) => ({ ...s, body: e.target.value }))}
              />

              <div className="mt-3 text-xs text-slate-400">
                Merge tags:{" "}
                <span className="text-slate-200">
                  {"{{prospect_name}} {{pipeline_name}} {{website_url}} {{zoom_link}} {{teams_link}} {{meeting_link}} {{agent_name}}"}
                </span>
              </div>

              <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-xs text-slate-400">Preview (example prospect)</div>
                <div className="mt-2 text-sm text-slate-200">
                  <div className="font-semibold">Subject</div>
                  <div className="mt-1 text-slate-300">{preview.subject || "—"}</div>
                  <div className="mt-3 font-semibold">Body</div>
                  <pre className="mt-1 text-slate-300 whitespace-pre-wrap font-sans">{preview.body || "—"}</pre>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => nav("/sales/settings")}
                  className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
                >
                  Edit website/Zoom/Teams →
                </button>

                <button
                  type="button"
                  onClick={() => nav("/sales/board" + (pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : ""))}
                  className="text-xs rounded-2xl px-3 py-2 bg-fuchsia-500/15 border border-fuchsia-500/35 hover:bg-fuchsia-500/20 text-fuchsia-200"
                  disabled={!pipelineId}
                >
                  Back to Board →
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Mass emailing */}
        <Card
          title="Mass Email (Fast Promo / Blast)"
          subtitle="Option A: backend bulk endpoint (recommended). Option B: exports a CSV for mail merge."
          right={
            <button
              type="button"
              onClick={() => nav("/sales/board" + (pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : ""))}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
              disabled={!pipelineId}
            >
              Open Board →
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-400">Stage</div>
              <select
                className="mt-2 w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
                value={blast.stage_id}
                onChange={(e) => setBlast((s) => ({ ...s, stage_id: e.target.value }))}
                disabled={!pipelineId}
              >
                {stages.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>

              <div className="text-xs text-slate-400 mt-4">Template</div>
              <select
                className="mt-2 w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
                value={blast.template_id}
                onChange={(e) => setBlast((s) => ({ ...s, template_id: e.target.value }))}
              >
                {Object.values(templates || {}).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <div className="text-xs text-slate-400 mt-4">Subject override (optional)</div>
              <input
                className="mt-2 w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
                placeholder="Leave blank to use template subject"
                value={blast.subject_override}
                onChange={(e) => setBlast((s) => ({ ...s, subject_override: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="text-sm font-semibold text-slate-100">Safety Confirm</div>
              <div className="text-xs text-slate-400 mt-1">This prevents accidental blasts. Type exactly:</div>
              <div className="mt-2 font-mono text-xs text-slate-200">{`SEND ${String(blast.stage_id || "STAGE_ID")}`}</div>

              <input
                className="mt-3 w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2 text-sm"
                placeholder="Type the phrase above"
                value={blast.confirm_phrase}
                onChange={(e) => setBlast((s) => ({ ...s, confirm_phrase: e.target.value }))}
              />

              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={runMassEmail}
                  disabled={!pipelineId || blastBusy}
                  className={cx(
                    "rounded-2xl px-5 py-3 text-sm font-semibold border transition",
                    !pipelineId || blastBusy
                      ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200"
                  )}
                >
                  {blastBusy ? "Sending..." : "Run Mass Email"}
                </button>

                <div className="text-xs text-slate-500">If the bulk endpoint doesn’t exist yet, we export a CSV for mail merge.</div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}