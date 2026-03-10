// src/pages/pm/PMInvitesTab.jsx
import React from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Card, Pill, fmtDate } from "./pmUi";

export default function PMInvitesTab({ loading, invites, onShowOk, onShowErr }) {
  return (
    <Card
      title="Invites"
      subtitle="Generate invite codes for tenants (and later owners + staff) to join"
      right={<Pill tone={invites.length ? "cyan" : "slate"}>{invites.length} total</Pill>}
    >
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="font-semibold">How invites will work</div>
        <ol className="mt-2 text-sm text-slate-300 list-decimal pl-5 space-y-1">
          <li>PM selects a property + unit</li>
          <li>System generates an invite code (and optional link)</li>
          <li>Tenant enters the code during signup to link to that unit</li>
          <li>Tenant can then create service requests for their unit</li>
        </ol>
        <div className="mt-3 text-[11px] text-slate-500">
          Next backend step: models for Property, Unit, TenantMembership, InviteCode + endpoints.
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-slate-400">Loading…</div>
      ) : invites.length === 0 ? (
        <div className="mt-4 text-sm text-slate-400">
          No invites yet. Once backend is wired, you’ll generate and manage invite codes here.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {invites.map((i) => (
            <div key={i.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">
                    Code: <span className="text-cyan-200">{i.code || "—"}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Unit: <span className="text-slate-200">{i.unit_label || i.unit || "—"}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Created {fmtDate(i.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    tone="slate"
                    onClick={() => {
                      const code = i.code || "";
                      if (!code) return;
                      navigator.clipboard?.writeText(code);
                      onShowOk?.("Invite code copied.");
                    }}
                  >
                    Copy
                  </Button>
                  <Button tone="slate" onClick={() => onShowOk?.("Invite revoke endpoints come next.")}>
                    Revoke
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2 flex-wrap">
        <Button
          tone="cyan"
          onClick={() =>
            onShowErr?.("Invite generation will work after we add the backend endpoints. Next: backend models.")
          }
        >
          Generate Invite
        </Button>
        <Link
          to="/register"
          className="inline-flex items-center justify-center h-9 text-xs rounded-xl px-4 border border-slate-800 bg-slate-950/60 hover:bg-slate-900/40 text-slate-200"
          title="For tenant onboarding flow testing"
        >
          Go to Register (Tenant test)
        </Link>
      </div>
    </Card>
  );
}
