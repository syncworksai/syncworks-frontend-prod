import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function BusinessPicker({ className = "", compact = false }) {
  const { activeBusinessId, setActiveBusinessId, myBusinesses, reloadBusinesses } = useAuth();

  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState((activeBusinessId || "").toString());
  const [msg, setMsg] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    setManual((activeBusinessId || "").toString());
  }, [activeBusinessId]);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

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
    if (!id) return "Select Business";
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
    setMsg(cleaned ? "Business context saved." : "Business context cleared.");
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
    setMsg("Business context cleared.");
    setOpen(false);
  }

  const activeId = String(activeBusinessId || "");

  return (
    <div ref={wrapRef} className={cx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "group rounded-2xl border transition flex items-center gap-2",
          compact
            ? "px-3 py-2 text-xs"
            : "px-4 py-2.5 text-xs",
          "bg-slate-950/70 border-cyan-500/25 hover:border-cyan-500/45 hover:bg-slate-900/80 text-slate-100 shadow-[0_0_30px_rgba(34,211,238,0.08)]"
        )}
        title="Switch active business"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-200 shrink-0">
          🏢
        </span>

        <div className="min-w-0 text-left">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Business</div>
          <div className="font-semibold text-slate-100 truncate max-w-[220px]">
            {activeLabel}
          </div>
        </div>

        <span className="text-slate-500 group-hover:text-slate-300">▾</span>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[420px] max-w-[92vw] rounded-3xl border border-slate-800 bg-slate-950/96 backdrop-blur shadow-[0_0_50px_rgba(0,0,0,0.55)] p-4 z-[80]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-extrabold text-slate-100">Switch Business</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Sets the active <span className="font-mono">X-Business-Id</span> context for SBO and employee workflows.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          {msg ? (
            <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-200">
              {msg}
            </div>
          ) : null}

          {options.length > 0 ? (
            <div className="mb-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-2">
                Your Businesses
              </div>

              <div className="max-h-56 overflow-auto pr-1 space-y-2">
                {options.map((o) => {
                  const isActive = activeId === o.businessId;
                  return (
                    <button
                      key={o.businessId}
                      type="button"
                      onClick={() => pick(o.businessId)}
                      className={cx(
                        "w-full text-left rounded-2xl border px-3 py-3 transition",
                        isActive
                          ? "border-cyan-500/35 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                          : "border-slate-800 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700"
                      )}
                      title={isActive ? "Active business" : "Switch to this business"}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-100 truncate">{o.name}</div>
                          {o.role ? <div className="text-[11px] text-slate-400 mt-1">Role: {o.role}</div> : null}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-[10px] text-slate-500 font-mono">#{o.businessId}</div>
                          {isActive ? (
                            <span className="text-[10px] px-2 py-1 rounded-full border border-cyan-500/35 bg-cyan-500/10 text-cyan-200">
                              Active
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/40 px-3 py-3 text-[11px] text-slate-400">
              No memberships found yet. Use a manual business id.
            </div>
          )}

          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Manual Business Id
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-3 text-xs text-slate-100 font-mono"
                placeholder="e.g. 10"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <button
                type="button"
                onClick={applyManual}
                className="rounded-2xl px-4 py-3 bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs text-cyan-100"
              >
                Apply
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={clear}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={refresh}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                Refresh list
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}