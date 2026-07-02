import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Handshake,
  Inbox,
  LoaderCircle,
  MailPlus,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import DashboardShell from "../../components/dashboard/DashboardShell";

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function moneyFromCents(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function StatCard({ icon, label, value, hint, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    violet: "border-violet-400/25 bg-violet-400/10 text-violet-200",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  };

  return (
    <div className={cx("rounded-3xl border p-4", tones[tone] || tones.cyan)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">
          {label}
        </span>
        {React.createElement(icon, {
          "aria-hidden": true,
          className: "h-5 w-5",
        })}
      </div>
      <div className="mt-3 text-3xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
    </div>
  );
}

function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300">
        {React.createElement(icon, {
          "aria-hidden": true,
          className: "h-7 w-7",
        })}
      </div>
      <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
        {text}
      </p>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-500/15 px-5 text-sm font-black text-cyan-100"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function PartnerCard({ relationship, activeBusinessId }) {
  const hiring = String(relationship?.hiring_business || "");
  const card =
    hiring === String(activeBusinessId || "")
      ? relationship?.partner_business_card
      : relationship?.hiring_business_card;

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-white">
            {card?.name || "Partner business"}
          </h3>
          <div className="mt-1 text-xs text-slate-400">
            {String(relationship?.relationship_type || "PARTNER").replaceAll("_", " ")}
          </div>
        </div>
        <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
          {relationship?.status || "ACTIVE"}
        </span>
      </div>

      {card?.headline ? (
        <p className="mt-3 text-sm leading-6 text-slate-300">{card.headline}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold">
        {card?.base_zip ? (
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-300">
            ZIP {card.base_zip}
          </span>
        ) : null}
        {card?.is_licensed ? (
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-cyan-200">
            Licensed
          </span>
        ) : null}
        {card?.is_insured ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
            Insured
          </span>
        ) : null}
        {relationship?.preferred_partner ? (
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-200">
            Preferred
          </span>
        ) : null}
      </div>
    </article>
  );
}

function WorkCard({ row, activeBusinessId }) {
  const incoming =
    String(row?.partner_business || "") === String(activeBusinessId || "");
  const counterparty = incoming
    ? row?.hiring_business_name
    : row?.partner_business_name;

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-white">
            {row?.title || "Partner work ticket"}
          </h3>
          <div className="mt-1 text-xs text-slate-400">
            {incoming ? "Incoming from" : "Sent to"} {counterparty || "partner"}
          </div>
        </div>
        <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-violet-200">
          {String(row?.status || "OFFERED").replaceAll("_", " ")}
        </span>
      </div>

      {row?.scope ? (
        <p className="mt-3 text-sm leading-6 text-slate-300">{row.scope}</p>
      ) : null}

      <div className="mt-4 text-sm font-black text-white">
        {moneyFromCents(row?.agreed_amount_cents)}
      </div>
    </article>
  );
}

export default function SboPartners() {
  const navigate = useNavigate();
  const { activeBusinessId } = useAuth();

  const [tab, setTab] = useState("partners");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [relationships, setRelationships] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [workTickets, setWorkTickets] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [showInvite, setShowInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [respondBusyId, setRespondBusyId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    relationship_type: "SUBCONTRACTOR",
    message: "",
  });

  async function loadAll() {
    if (!activeBusinessId) return;
    setLoading(true);
    setErr("");

    const results = await Promise.allSettled([
      api.get("/business-partners/"),
      api.get("/business-partner-invitations/"),
      api.get("/partner-work-tickets/"),
      api.get("/partner-work-estimates/"),
      api.get("/partner-change-orders/"),
      api.get("/partner-invoices/"),
    ]);

    setRelationships(results[0].status === "fulfilled" ? safeList(results[0].value?.data) : []);
    setInvitations(results[1].status === "fulfilled" ? safeList(results[1].value?.data) : []);
    setWorkTickets(results[2].status === "fulfilled" ? safeList(results[2].value?.data) : []);
    setEstimates(results[3].status === "fulfilled" ? safeList(results[3].value?.data) : []);
    setChangeOrders(results[4].status === "fulfilled" ? safeList(results[4].value?.data) : []);
    setInvoices(results[5].status === "fulfilled" ? safeList(results[5].value?.data) : []);

    if (results.some((result) => result.status === "rejected")) {
      setErr("Some partner data could not be loaded. Available sections are still shown.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  const activePartners = useMemo(
    () => relationships.filter((row) => row?.status === "ACTIVE"),
    [relationships]
  );
  const pendingInvitations = useMemo(
    () => invitations.filter((row) => row?.status === "PENDING"),
    [invitations]
  );
  const incomingWork = useMemo(
    () =>
      workTickets.filter(
        (row) => String(row?.partner_business || "") === String(activeBusinessId || "")
      ),
    [workTickets, activeBusinessId]
  );
  const outgoingWork = useMemo(
    () =>
      workTickets.filter(
        (row) => String(row?.hiring_business || "") === String(activeBusinessId || "")
      ),
    [workTickets, activeBusinessId]
  );
  const openInvoiceTotal = useMemo(
    () =>
      invoices
        .filter((row) => !["PAID", "VOID"].includes(String(row?.status || "").toUpperCase()))
        .reduce(
          (sum, row) =>
            sum + Number(row?.balance_due_cents || row?.total_cents || 0),
          0
        ),
    [invoices]
  );

  async function searchBusinesses() {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setErr("Enter at least two characters to search.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      const response = await api.get(
        "/business-partner-invitations/business-search/",
        { params: { q: query } }
      );
      setSearchResults(safeList(response.data));
    } catch (error) {
      setErr(error?.response?.data?.q || "Business search failed.");
    } finally {
      setBusy(false);
    }
  }

  function chooseBusiness(business) {
    setSelectedBusiness(business);
    setForm((current) => ({
      ...current,
      business_name: business?.name || "",
      email: business?.business_email || "",
      phone: business?.phone || "",
    }));
  }

  async function sendInvitation(event) {
    event.preventDefault();
    setBusy(true);
    setErr("");
    setOk("");

    try {
      await api.post("/business-partner-invitations/", {
        ...form,
        target_business: selectedBusiness?.id || undefined,
      });
      setOk("Partner invitation sent.");
      setShowInvite(false);
      setSelectedBusiness(null);
      setSearchResults([]);
      setSearchQuery("");
      setForm({
        business_name: "",
        contact_name: "",
        email: "",
        phone: "",
        relationship_type: "SUBCONTRACTOR",
        message: "",
      });
      await loadAll();
      setTab("invites");
    } catch (error) {
      const data = error?.response?.data;
      setErr(
        data?.target_business ||
          data?.contact ||
          data?.detail ||
          "Could not send the invitation."
      );
    } finally {
      setBusy(false);
    }
  }

  async function respond(invitation, decision) {
    setRespondBusyId(invitation.id);
    setErr("");
    try {
      await api.post("/business-partner-invitations/respond/", {
        token: invitation.token,
        decision,
      });
      setOk(
        decision === "ACCEPT"
          ? "Partner invitation accepted."
          : "Partner invitation declined."
      );
      await loadAll();
    } catch (error) {
      const data = error?.response?.data;
      setErr(data?.token || data?.business || data?.email || "Response failed.");
    } finally {
      setRespondBusyId(null);
    }
  }

  const tabs = [
    { key: "partners", label: "Partners", count: activePartners.length },
    { key: "invites", label: "Invitations", count: pendingInvitations.length },
    { key: "work", label: "Partner Work", count: workTickets.length },
    {
      key: "financials",
      label: "Financials",
      count: estimates.length + changeOrders.length + invoices.length,
    },
  ];

  return (
    <DashboardShell
      title="Partner Hub"
      subtitle="Partners, subcontracted work, and B2B financials."
      modeBarTitle="Partner Hub"
      modeBarSubtitle="Partners · work · estimates · change orders · invoices"
      rightActions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/sbo")}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-500/15 px-4 text-sm font-black text-cyan-100"
          >
            <MailPlus className="h-4 w-4" />
            Invite partner
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {err ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {String(err)}
          </div>
        ) : null}
        {ok ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {ok}
          </div>
        ) : null}

        <section className="relative overflow-hidden rounded-[2rem] border border-violet-500/20 bg-slate-950/70 p-5 md:p-7">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200">
                  SyncWorks business network
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                  Your subcontractor command center
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Find businesses, exchange work, track partner financials, and
                  preserve private customer and internal cost data.
                </p>
              </div>
              <button
                type="button"
                onClick={loadAll}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 text-sm font-black text-slate-200 disabled:opacity-50"
              >
                <RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard
                icon={Handshake}
                label="Active partners"
                value={loading ? "..." : activePartners.length}
                hint="Approved relationships"
              />
              <StatCard
                icon={Inbox}
                label="Incoming work"
                value={loading ? "..." : incomingWork.length}
                hint="Jobs sent to your business"
                tone="violet"
              />
              <StatCard
                icon={Send}
                label="Outgoing work"
                value={loading ? "..." : outgoingWork.length}
                hint="Jobs assigned to partners"
                tone="emerald"
              />
              <StatCard
                icon={CircleDollarSign}
                label="Open B2B balance"
                value={loading ? "..." : moneyFromCents(openInvoiceTotal)}
                hint="Unpaid partner invoices"
                tone="amber"
              />
            </div>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cx(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-black",
                tab === item.key
                  ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-100"
                  : "border-slate-800 bg-slate-950/60 text-slate-400"
              )}
            >
              {item.label}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {item.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-60 items-center justify-center rounded-[2rem] border border-slate-800 bg-slate-950/50">
            <LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" />
          </div>
        ) : null}

        {!loading && tab === "partners" ? (
          activePartners.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activePartners.map((row) => (
                <PartnerCard
                  key={row.id}
                  relationship={row}
                  activeBusinessId={activeBusinessId}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Handshake}
              title="Build your partner network"
              text="Invite subcontractors, vendors, referral partners, and overflow providers."
              actionLabel="Invite your first partner"
              onAction={() => setShowInvite(true)}
            />
          )
        ) : null}

        {!loading && tab === "invites" ? (
          invitations.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {invitations.map((invitation) => {
                const incoming =
                  String(invitation?.target_business || "") ===
                    String(activeBusinessId || "") ||
                  (!invitation?.target_business && invitation?.status === "PENDING");
                const card = incoming
                  ? invitation?.inviting_business_card
                  : invitation?.target_business_card;
                return (
                  <article
                    key={invitation.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950/55 p-4"
                  >
                    <div className="text-sm font-black text-white">
                      {card?.name ||
                        invitation?.business_name ||
                        invitation?.email ||
                        "Partner invitation"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {incoming ? "Received" : "Sent"} ·{" "}
                      {String(
                        invitation?.relationship_type || "SUBCONTRACTOR"
                      ).replaceAll("_", " ")}
                    </div>
                    <div className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-amber-200">
                      {invitation?.status}
                    </div>
                    {incoming && invitation?.status === "PENDING" ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={respondBusyId === invitation.id}
                          onClick={() => respond(invitation, "DECLINE")}
                          className="min-h-11 rounded-2xl border border-slate-700 bg-slate-900 text-sm font-black text-slate-200 disabled:opacity-50"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          disabled={respondBusyId === invitation.id}
                          onClick={() => respond(invitation, "ACCEPT")}
                          className="min-h-11 rounded-2xl border border-emerald-400/25 bg-emerald-500/15 text-sm font-black text-emerald-100 disabled:opacity-50"
                        >
                          Accept
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={MailPlus}
              title="No invitations yet"
              text="Search SyncWorks or invite an outside business by email or phone."
              actionLabel="Send invitation"
              onAction={() => setShowInvite(true)}
            />
          )
        ) : null}

        {!loading && tab === "work" ? (
          workTickets.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workTickets.map((row) => (
                <WorkCard
                  key={row.id}
                  row={row}
                  activeBusinessId={activeBusinessId}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BriefcaseBusiness}
              title="No partner work tickets yet"
              text="Partner work appears here after a child ticket is assigned to another business."
            />
          )
        ) : null}

        {!loading && tab === "financials" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              ["Estimates", estimates.length, "Partner quote revisions and approvals."],
              ["Change orders", changeOrders.length, "Scope, schedule, and cost changes."],
              ["B2B invoices", invoices.length, "Invoices with duplicate-fee protection."],
            ].map(([label, value, hint]) => (
              <section
                key={label}
                className="rounded-3xl border border-slate-800 bg-slate-950/55 p-5"
              >
                <div className="font-black text-white">{label}</div>
                <div className="mt-4 text-4xl font-black text-white">{value}</div>
                <p className="mt-2 text-sm text-slate-400">{hint}</p>
              </section>
            ))}
          </div>
        ) : null}
      </div>

      {showInvite ? (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] border border-slate-700 bg-slate-950 p-5 sm:rounded-[2rem] md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Invite a partner</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Search SyncWorks or invite an outside business.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Name, email, phone, or ZIP"
                  className="min-h-11 min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={searchBusinesses}
                  disabled={busy}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-500/15 text-cyan-100 disabled:opacity-50"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>

              {searchResults.length ? (
                <div className="mt-3 grid gap-2">
                  {searchResults.map((business) => (
                    <button
                      key={business.id}
                      type="button"
                      onClick={() => chooseBusiness(business)}
                      className={cx(
                        "flex items-center justify-between rounded-2xl border p-3 text-left",
                        selectedBusiness?.id === business.id
                          ? "border-cyan-400/40 bg-cyan-500/10"
                          : "border-slate-800 bg-slate-950/70"
                      )}
                    >
                      <span>
                        <span className="block text-sm font-black text-white">
                          {business.name}
                        </span>
                        <span className="block text-xs text-slate-400">
                          {business.base_zip || business.business_email}
                        </span>
                      </span>
                      <Building2 className="h-5 w-5 text-cyan-200" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <form onSubmit={sendInvitation} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["business_name", "Business name", "text"],
                  ["contact_name", "Contact name", "text"],
                  ["email", "Email", "email"],
                  ["phone", "Phone", "text"],
                ].map(([key, label, type]) => (
                  <label key={key}>
                    <span className="text-xs font-bold text-slate-300">{label}</span>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className="mt-2 min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none"
                    />
                  </label>
                ))}
              </div>

              <label>
                <span className="text-xs font-bold text-slate-300">
                  Relationship type
                </span>
                <select
                  value={form.relationship_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      relationship_type: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm text-white"
                >
                  <option value="SUBCONTRACTOR">Subcontractor</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="REFERRAL">Referral partner</option>
                  <option value="JOINT_VENTURE">Joint venture</option>
                  <option value="OVERFLOW">Overflow provider</option>
                  <option value="PREFERRED">Preferred partner</option>
                </select>
              </label>

              <label>
                <span className="text-xs font-bold text-slate-300">Message</span>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
                />
              </label>

              <button
                type="submit"
                disabled={
                  busy ||
                  (!selectedBusiness && !form.email.trim() && !form.phone.trim())
                }
                className="min-h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send partner invitation"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
