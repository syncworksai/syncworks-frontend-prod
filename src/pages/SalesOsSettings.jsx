// src/pages/SalesOsSettings.jsx
import React, { useEffect, useState } from "react";
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

function readSettings() {
  try {
    const raw = localStorage.getItem("sw_salesos_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSettings(obj) {
  localStorage.setItem("sw_salesos_settings", JSON.stringify(obj || {}));
}

export default function SalesOsSettings() {
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const [form, setForm] = useState({
    website_url: "",
    zoom_link: "",
    teams_link: "",
    licensed_states: [],
  });

  useEffect(() => {
    const s = readSettings();
    setForm({
      website_url: s.website_url || "",
      zoom_link: s.zoom_link || "",
      teams_link: s.teams_link || "",
      licensed_states: Array.isArray(s.licensed_states) ? s.licensed_states : [],
    });
  }, []);

  function toggleState(code) {
    setForm((prev) => {
      const set = new Set(prev.licensed_states || []);
      if (set.has(code)) set.delete(code);
      else set.add(code);
      return { ...prev, licensed_states: Array.from(set) };
    });
  }

  async function save() {
    setSaving(true);
    setSavedMsg("");
    try {
      // ✅ MVP: localStorage works immediately
      writeSettings(form);

      // Later: switch to backend without touching UI
      // await api.patch("/sales/agency/settings/", form);

      setSavedMsg("Saved ✅");
      setTimeout(() => setSavedMsg(""), 1600);
    } finally {
      setSaving(false);
    }
  }

  const STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
    "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Sales OS Settings"
        subtitle="Agency defaults • Meeting links • Licensed states"
        rightActions={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={cx(
              "text-xs rounded-2xl px-3 py-2 border transition",
              saving
                ? "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-200"
            )}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        }
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {savedMsg ? (
          <div className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3">
            {savedMsg}
          </div>
        ) : null}

        <Card
          title="Meeting Links"
          subtitle="Used as defaults when creating calendar events from a prospect. (MVP saves locally; later it will webhook.)"
        >
          <div className="grid md:grid-cols-2 gap-3">
            <input
              className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
              placeholder="Default Zoom link (optional)"
              value={form.zoom_link}
              onChange={(e) => setForm((s) => ({ ...s, zoom_link: e.target.value }))}
            />
            <input
              className="bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
              placeholder="Default Teams link (optional)"
              value={form.teams_link}
              onChange={(e) => setForm((s) => ({ ...s, teams_link: e.target.value }))}
            />
          </div>

          <div className="text-xs text-slate-500 mt-3">
            If both are set, Sales OS will prefer Zoom first, then Teams (you can change that later).
          </div>
        </Card>

        <Card
          title="Agency Website"
          subtitle="This will be used later for internal Ads + profiles + agency landing page."
        >
          <input
            className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-3 py-2"
            placeholder="https://youragency.com"
            value={form.website_url}
            onChange={(e) => setForm((s) => ({ ...s, website_url: e.target.value }))}
          />
        </Card>

        <Card
          title="Licensed States"
          subtitle="Select where you’re licensed — used to control advertising eligibility in SyncWorks."
          right={
            <button
              type="button"
              onClick={() => setForm((s) => ({ ...s, licensed_states: [] }))}
              className="text-xs rounded-2xl px-3 py-2 bg-slate-950/60 border border-slate-800 hover:bg-slate-900/40"
            >
              Clear
            </button>
          }
        >
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {STATES.map((code) => {
              const on = (form.licensed_states || []).includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleState(code)}
                  className={cx(
                    "h-10 rounded-2xl border text-xs font-semibold transition",
                    on
                      ? "bg-fuchsia-500/15 border-fuchsia-500/35 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,0.10)]"
                      : "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-900/40"
                  )}
                  title={on ? "Licensed" : "Not selected"}
                >
                  {code}
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-500 mt-3">
            Selected: <span className="text-slate-200">{(form.licensed_states || []).length}</span>
          </div>
        </Card>

        <Card
          title="Next step (backend)"
          subtitle="When you’re ready, we’ll add API endpoints so these settings live in Django and can webhook."
        >
          <div className="text-sm text-slate-300">
            MVP is working now. Later we wire:
            <div className="mt-2 font-mono text-xs text-slate-400">
              PATCH /sales/agency/settings/
              <br />
              POST /sales/webhooks/
              <br />
              Event triggers: prospect.created, prospect.stage_changed, event.created
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}