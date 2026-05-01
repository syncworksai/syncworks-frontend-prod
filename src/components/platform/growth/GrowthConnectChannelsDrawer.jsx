import React from "react";
import ChannelBadge from "./ChannelBadge";

function StatusPill({ children, tone = "slate", cx }) {
  const tones = {
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-200",
    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-200",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-200",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-200",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-200",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-200",
  };

  return (
    <span className={cx("text-[11px] px-2 py-1 rounded-full border", tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

export default function GrowthConnectChannelsDrawer({
  connectModalOpen,
  setConnectModalOpen,
  drawerTab,
  setDrawerTab,
  channelQuery,
  setChannelQuery,
  channelListFiltered,
  getChannelStatus,
  getChannelLabel,
  toneFromStatus,
  handleConnectChannel,
  recipeCards,
  accountHealthRows,
  cx,
}) {
  return connectModalOpen ? (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConnectModalOpen(false)} />
      <div className="absolute inset-y-0 right-0 w-full max-w-5xl border-l border-slate-800 bg-[#070a12] text-slate-100 shadow-2xl">

        {/* HEADER */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-100">Connect Channels</div>
            <div className="text-xs text-slate-400 mt-1">
              God Mode controls now • same engine later powers SBO Growth Automation add-on.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConnectModalOpen(false)}
            className="h-9 px-3 rounded-2xl text-xs border border-slate-800 bg-slate-950/60 text-slate-200"
          >
            Close
          </button>
        </div>

        {/* TABS */}
        <div className="p-4 border-b border-slate-800 flex gap-2">
          {[
            { key: "connect_accounts", label: "Connect Accounts" },
            { key: "automation_recipes", label: "Automation Recipes" },
            { key: "account_health", label: "Account Health" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setDrawerTab(t.key)}
              className={cx(
                "h-8 px-3 rounded-2xl text-xs border",
                drawerTab === t.key
                  ? "border-cyan-500/35 bg-cyan-500/15 text-cyan-100"
                  : "border-slate-800 bg-slate-950/60 text-slate-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-122px)]">

          {/* CONNECT TAB */}
          {drawerTab === "connect_accounts" && (
            <>
              <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4">
                <div className="font-semibold text-cyan-100">How it works</div>
                <ul className="mt-2 space-y-1 text-sm text-cyan-50/90 list-disc pl-5">
                  <li>Connect a channel</li>
                  <li>Pick automation recipes</li>
                  <li>Capture leads into SyncWorks</li>
                  <li>Follow up automatically</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
                  <input
                    value={channelQuery}
                    onChange={(e) => setChannelQuery(e.target.value)}
                    placeholder="Search channels..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {channelListFiltered.map((c) => {
                  const status = getChannelStatus(c);
                  const pending = status === "SETUP_PENDING";
                  const planned = status === "PLANNED";
                  const email = c.key === "email";

                  return (
                    <div key={c.key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ChannelBadge channel={c} />
                          <div className="font-semibold text-slate-100">{c.name}</div>
                        </div>
                        <StatusPill tone={toneFromStatus(status)} cx={cx}>
                          {getChannelLabel(status)}
                        </StatusPill>
                      </div>

                      <div className="mt-2 text-sm text-slate-300">{c.description}</div>

                      {pending && (
                        <div className="mt-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                          OAuth credentials required in backend settings before live connection.
                        </div>
                      )}

                      {planned && (
                        <div className="mt-2 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                          SMS/Twilio remains disabled until compliance and legal setup is complete.
                        </div>
                      )}

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => handleConnectChannel(c)}
                          disabled={pending || planned || email}
                          className="h-9 px-3 rounded-2xl text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100 disabled:opacity-60"
                        >
                          {pending ? "Setup Pending" : planned ? "Planned" : email ? "Email Available" : "Connect"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* AUTOMATION TAB */}
          {drawerTab === "automation_recipes" && (
            <div className="grid md:grid-cols-2 gap-3">
              {recipeCards.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-100">{r.name}</div>
                    <StatusPill tone={r.status === "ACTIVE" ? "emerald" : "amber"} cx={cx}>
                      {r.status}
                    </StatusPill>
                  </div>
                  <div className="mt-2 text-sm text-slate-300">{r.summary}</div>
                </div>
              ))}
            </div>
          )}

          {/* HEALTH TAB */}
          {drawerTab === "account_health" && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {accountHealthRows.map((row) => (
                <div key={row.key} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <ChannelBadge channel={row} />
                    <StatusPill tone={toneFromStatus(row.status)} cx={cx}>
                      {getChannelLabel(row.status)}
                    </StatusPill>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  ) : null;
}