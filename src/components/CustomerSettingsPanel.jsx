import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-slate-400">{label}</div>
      {children}
      {hint ? <div className="text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Btn({ children, tone = "slate", className = "", ...props }) {
  const tones = {
    slate: "bg-slate-950 border-slate-800 hover:bg-slate-900 text-slate-200",
    cyan: "bg-cyan-500/20 border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200",
    rose: "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 text-rose-200",
    indigo: "bg-indigo-500/20 border-indigo-500/40 hover:bg-indigo-500/30 text-indigo-200",
  };

  return (
    <button
      className={
        "inline-flex items-center justify-center h-10 text-xs rounded-xl px-4 border transition whitespace-nowrap " +
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

const LS_KEY = "syncworks.customer.settings.v1";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs || {}));
  } catch {
    // ignore
  }
}

export default function CustomerSettingsPanel() {
  const nav = useNavigate();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const initialPrefs = useMemo(() => {
    const p = loadPrefs() || {};
    return {
      default_zip: p.default_zip || "",
      notify_ticket_updates: p.notify_ticket_updates ?? true,
      notify_promos: p.notify_promos ?? true,
      calendar_default: p.calendar_default || "GOOGLE", // GOOGLE | OUTLOOK | ICS
    };
  }, []);

  const [defaultZip, setDefaultZip] = useState(initialPrefs.default_zip);
  const [notifyTicketUpdates, setNotifyTicketUpdates] = useState(initialPrefs.notify_ticket_updates);
  const [notifyPromos, setNotifyPromos] = useState(initialPrefs.notify_promos);
  const [calendarDefault, setCalendarDefault] = useState(initialPrefs.calendar_default);

  async function loadMe() {
    setErr("");
    setLoadingMe(true);
    try {
      const r = await api.get("/auth/me/");
      setMe(r.data || null);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load profile");
      setMe(null);
    } finally {
      setLoadingMe(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  function persistPrefs() {
    setErr("");
    setMsg("");
    const prefs = {
      default_zip: (defaultZip || "").trim(),
      notify_ticket_updates: !!notifyTicketUpdates,
      notify_promos: !!notifyPromos,
      calendar_default: calendarDefault,
    };
    savePrefs(prefs);
    setMsg("Saved ✅");
    setTimeout(() => setMsg(""), 2200);
  }

  function resetPrefs() {
    if (!window.confirm("Reset local settings to defaults?")) return;
    setDefaultZip("");
    setNotifyTicketUpdates(true);
    setNotifyPromos(true);
    setCalendarDefault("GOOGLE");
    savePrefs({
      default_zip: "",
      notify_ticket_updates: true,
      notify_promos: true,
      calendar_default: "GOOGLE",
    });
    setMsg("Reset ✅");
    setTimeout(() => setMsg(""), 2200);
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold">Customer Settings</div>
          <div className="text-xs text-slate-400 mt-1">
            Profile + preferences. (Local until server-side settings are wired.)
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Btn tone="slate" onClick={loadMe} disabled={loadingMe}>
            Refresh
          </Btn>
          <Btn tone="indigo" onClick={() => nav("/upgrade")}>
            Billing
          </Btn>
        </div>
      </div>

      {err ? (
        <div className="mt-4 text-sm text-rose-200 bg-rose-900/20 border border-rose-800 rounded-xl p-3">{err}</div>
      ) : null}

      {msg ? (
        <div className="mt-4 text-sm text-emerald-200 bg-emerald-900/10 border border-emerald-800 rounded-xl p-3">
          {msg}
        </div>
      ) : null}

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="font-semibold">Profile</div>
          <div className="text-xs text-slate-400 mt-1">Next: editable profile fields + server sync.</div>

          {loadingMe ? <div className="mt-4 text-sm text-slate-400">Loading…</div> : null}

          {!loadingMe && me ? (
            <div className="mt-4 space-y-3">
              <Field label="Email">
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  value={me.email || ""}
                  disabled
                  readOnly
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="First name">
                  <input
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={me.first_name || ""}
                    disabled
                    readOnly
                  />
                </Field>
                <Field label="Last name">
                  <input
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                    value={me.last_name || ""}
                    disabled
                    readOnly
                  />
                </Field>
              </div>

              <Field label="Role">
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                  value={me.role || ""}
                  disabled
                  readOnly
                />
              </Field>
            </div>
          ) : null}

          {!loadingMe && !me && !err ? (
            <div className="mt-4 text-sm text-slate-500">No profile loaded.</div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="font-semibold">Preferences</div>
          <div className="text-xs text-slate-400 mt-1">Saved locally for now.</div>

          <div className="mt-4 space-y-4">
            <Field
              label="Default ZIP"
              hint="Used to prefill your next request. Does not change existing tickets."
            >
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                placeholder="e.g. 30318"
                value={defaultZip}
                onChange={(e) => setDefaultZip(e.target.value)}
              />
            </Field>

            <Field label="Notifications">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <input
                    type="checkbox"
                    checked={notifyTicketUpdates}
                    onChange={(e) => setNotifyTicketUpdates(e.target.checked)}
                  />
                  Ticket updates
                </label>

                <label className="flex items-center gap-2 text-sm bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  <input
                    type="checkbox"
                    checked={notifyPromos}
                    onChange={(e) => setNotifyPromos(e.target.checked)}
                  />
                  Promos / broadcast updates
                </label>
              </div>
            </Field>

            <Field label="Default calendar action">
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
                value={calendarDefault}
                onChange={(e) => setCalendarDefault(e.target.value)}
              >
                <option value="GOOGLE">Google</option>
                <option value="OUTLOOK">Outlook</option>
                <option value="ICS">Download .ICS</option>
              </select>
            </Field>

            <div className="flex gap-2 flex-wrap">
              <Btn tone="cyan" onClick={persistPrefs}>
                Save
              </Btn>
              <Btn tone="slate" onClick={resetPrefs}>
                Reset
              </Btn>
              <Btn tone="indigo" onClick={() => nav("/upgrade")} className="ml-auto">
                Billing
              </Btn>
            </div>

            <div className="text-[11px] text-slate-500">
              Next module: server-side CustomerSettings model + /me/settings endpoint.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
