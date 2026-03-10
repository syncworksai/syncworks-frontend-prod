// src/components/SalesOsTemplatesModal.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function templatesKey(pipelineId) {
  const pid = String(pipelineId || "").trim() || "global";
  return `sw_salesos_email_templates__${pid}`;
}

function readTemplates(pipelineId) {
  try {
    const raw = localStorage.getItem(templatesKey(pipelineId));
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

async function copyText(text) {
  const s = String(text || "");
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export default function SalesOsTemplatesModal({ open, onClose, pipelineId }) {
  const nav = useNavigate();
  const [toast, setToast] = useState("");

  const templates = useMemo(() => {
    const t = readTemplates(pipelineId);
    const list = Object.values(t || {});
    // stable ordering: name then id
    list.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")) || String(a?.id || "").localeCompare(String(b?.id || "")));
    return list;
  }, [pipelineId, open]);

  if (!open) return null;

  const manageUrl = `/sales/stages${pipelineId ? `?pipeline_id=${encodeURIComponent(pipelineId)}` : ""}`;

  async function doCopy(kind, tpl) {
    const text = kind === "subject" ? tpl?.subject || "" : tpl?.body || "";
    const ok = await copyText(text);
    setToast(ok ? "Copied ✅" : "Copy failed");
    setTimeout(() => setToast(""), 1200);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold">Email Templates</div>
            <div className="text-xs text-slate-400 mt-1">
              {pipelineId ? `Pipeline #${pipelineId}` : "No pipeline selected"}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => nav(manageUrl)}
            className="text-xs rounded-2xl px-3 py-2 bg-fuchsia-500/15 border border-fuchsia-500/35 hover:bg-fuchsia-500/20 text-fuchsia-200"
            disabled={!pipelineId}
            title="Manage templates"
          >
            Manage →
          </button>

          {toast ? (
            <div className="text-xs rounded-2xl px-3 py-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-200">
              {toast}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          {!pipelineId ? (
            <div className="text-sm text-slate-400">Select a pipeline first.</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-slate-400">
              No templates saved for this pipeline yet. Click <b>Manage →</b> to create them.
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {templates.map((t) => (
                <div key={t.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">{t.name || t.id}</div>
                      <div className="text-xs text-slate-400 mt-1 truncate">{t.subject || "—"}</div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => doCopy("subject", t)}
                        className={cx(
                          "h-9 px-3 rounded-2xl border text-xs transition",
                          "bg-slate-950/60 border-slate-800 hover:bg-slate-900/40 text-slate-200"
                        )}
                        title="Copy subject"
                      >
                        Copy subject
                      </button>
                      <button
                        type="button"
                        onClick={() => doCopy("body", t)}
                        className={cx(
                          "h-9 px-3 rounded-2xl border text-xs transition",
                          "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
                        )}
                        title="Copy body"
                      >
                        Copy body
                      </button>
                    </div>
                  </div>

                  {t.body ? (
                    <pre className="mt-3 text-xs text-slate-300 whitespace-pre-wrap font-sans bg-slate-950/40 border border-slate-800 rounded-2xl p-3">
                      {String(t.body).slice(0, 420)}
                      {String(t.body).length > 420 ? "\n…" : ""}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-[11px] text-slate-500">
          Tip: Use the paperclip to quickly copy a template into your email workflow.
        </div>
      </div>
    </div>
  );
}