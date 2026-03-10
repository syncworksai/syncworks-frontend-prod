// src/components/BusinessPicker.jsx
import React, { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function BusinessPicker({ className = "" }) {
  const { activeBusinessId, setActiveBusinessId, myBusinesses, reloadBusinesses } = useAuth();

  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState((activeBusinessId || "").toString());
  const [msg, setMsg] = useState("");

  const options = useMemo(() => {
    const list = Array.isArray(myBusinesses) ? myBusinesses : [];
    return list
      .map((b) => {
        const businessId = b?.business_id || b?.id || b?.business?.id;
        const name =
          b?.business_name ||
          b?.name ||
          b?.business?.name ||
          (businessId ? `Business ${businessId}` : "Business");
        const role = (b?.role || b?.member_role || b?.membership_role || b?.membership?.role || "").toString();
        return { businessId: businessId ? String(businessId) : "", name, role };
      })
      .filter((x) => x.businessId);
  }, [myBusinesses]);

  const activeLabel = useMemo(() => {
    const id = (activeBusinessId || "").toString();
    if (!id) return "Auto";
    const found = options.find((o) => o.businessId === id);
    return found?.name || `#${id}`;
  }, [activeBusinessId, options]);

  function emitChanged() {
    try {
      window.dispatchEvent(new Event("sw:activeBusinessChanged"));
    } catch {
      // ignore
    }
  }

  async function refresh() {
    setMsg("");
    try {
      const list = await reloadBusinesses?.();
      if (!list?.length) setMsg("No businesses found yet.");
      else setMsg("Business list refreshed.");
    } catch {
      setMsg("Refresh failed.");
    }
  }

  function applyManual() {
    const cleaned = (manual || "").trim();
    setActiveBusinessId(cleaned);
    emitChanged();
    setMsg(cleaned ? "Business context saved." : "Business context cleared (auto).");
    setOpen(false);
  }

  function pick(id) {
    setActiveBusinessId(id);
    setManual(String(id));
    emitChanged();
    setMsg("Business context switched.");
    setOpen(false);
  }

  function clear() {
    setManual("");
    setActiveBusinessId("");
    emitChanged();
    setMsg("Business context cleared (auto).");
    setOpen(false);
  }

  return (
    <div className={"relative " + className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs text-slate-200"
        title="Select active business (X-Business-Id)"
      >
        <span className="text-slate-400">Business:</span>{" "}
        <span className="font-semibold text-slate-100 truncate inline-block align-bottom max-w-[180px]">
          {activeLabel}
        </span>{" "}
        <span className="text-slate-500">▾</span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[380px] max-w-[92vw] rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_0_40px_rgba(0,0,0,0.5)] p-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-slate-100">Business context</div>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-200">
              Close
            </button>
          </div>

          <div className="text-[11px] text-slate-400 mb-3">
            SyncWorks uses <span className="font-mono">X-Business-Id</span> to scope SBO/Employee actions to the selected business.
          </div>

          {msg ? (
            <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-[11px] text-slate-200">
              {msg}
            </div>
          ) : null}

          {options.length > 0 ? (
            <div className="mb-3 space-y-2">
              <div className="text-xs font-semibold text-slate-200">Your businesses</div>
              <div className="max-h-44 overflow-auto pr-1 space-y-2">
                {options.map((o) => {
                  const isActive = String(activeBusinessId || "") === o.businessId;
                  return (
                    <button
                      key={o.businessId}
                      type="button"
                      onClick={() => pick(o.businessId)}
                      className={
                        "w-full text-left rounded-xl border px-3 py-2 transition " +
                        (isActive
                          ? "border-cyan-500/30 bg-cyan-500/10"
                          : "border-slate-800 bg-slate-900/40 hover:bg-slate-900")
                      }
                      title={isActive ? "Active business" : "Switch to this business"}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-100">{o.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">#{o.businessId}</div>
                      </div>
                      {o.role ? <div className="text-[11px] text-slate-400 mt-1">Role: {o.role}</div> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-400">
              No memberships found yet. Use manual business id.
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-200">Manual business id</div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono"
                placeholder="e.g. 12"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <button
                type="button"
                onClick={applyManual}
                className="rounded-xl px-3 py-2 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs"
              >
                Apply
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={clear} className="text-[11px] text-slate-400 hover:text-slate-200">
                Clear (auto)
              </button>
              <button type="button" onClick={refresh} className="text-[11px] text-slate-400 hover:text-slate-200">
                Refresh list
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}