// src/pages/TenantDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";
import Button from "../components/ui/Button";

function Card({ title, subtitle, right, children }) {
  return (
    <div className="rounded-[28px] border border-blue-500/20 bg-[#07111f]/90 p-5 shadow-[0_18px_70px_rgba(0,89,255,0.09)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-100">{title}</div>
          {subtitle ? <div className="text-sm text-slate-400 mt-1">{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
      {children}
    </span>
  );
}

function money(v) {
  const n = Number(v || 0);
  if (Number.isNaN(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(s) {
  if (!s) return "â€”";
  try {
    const d = new Date(s);
    return d.toLocaleDateString();
  } catch {
    return String(s);
  }
}

export default function TenantDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [charges, setCharges] = useState([]);
  const [err, setErr] = useState("");

  const dueCharges = useMemo(
    () => charges.filter((c) => (c.status || "").toUpperCase() !== "PAID"),
    [charges]
  );

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [sRes, cRes] = await Promise.allSettled([
        api.get("/tenant/summary/"),
        api.get("/tenant/rent/charges/"),
      ]);

      if (sRes.status === "fulfilled") setSummary(sRes.value.data);
      else {
        const msg =
          sRes.reason?.response?.data?.detail ||
          sRes.reason?.message ||
          "Unable to load tenant summary.";
        setSummary(null);
        setErr(msg);
      }

      if (cRes.status === "fulfilled") {
        const data = cRes.value.data;
        const list = Array.isArray(data) ? data : data?.results || [];
        setCharges(list);
      } else {
        setCharges([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();

  }, []);

  async function handlePay(charge) {
    try {
      if (charge?.stripe_payment_url) {
        window.location.href = charge.stripe_payment_url;
        return;
      }
      const res = await api.post(`/tenant/rent/charges/${charge.id}/checkout/`);
      const url = res?.data?.url;
      if (url) window.location.href = url;
    } catch (e) {
      const msg = e?.response?.data?.detail || "Checkout is not enabled for tenant yet.";
      alert(msg);
    }
  }

  const linked = summary && !summary?.detail;
  const notLinkedMsg =
    (summary && summary?.detail) ||
    err ||
    "No tenant profile is linked to this account yet.";

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <ModeBar />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">SYNCWORKS PROPERTY MANAGEMENT</div><div className="mt-2 text-3xl font-bold text-white">Welcome Home</div>
            <div className="text-slate-400 mt-1">
              Pay rent, request maintenance, message management, and access your property in one place.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={loadAll} variant="secondary">
              Refresh
            </Button>
            <Button onClick={() => nav("/customer")} variant="ghost">
              Customer
            </Button>
            <Button onClick={() => nav("/pm")} variant="ghost">
              PM
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            title="Rent & Balance"
            subtitle={linked ? "Your current balance and due date" : "Link your tenant profile to unlock rent + docs"}
          >
            {loading ? (
              <div className="text-slate-400">Loading...</div>
            ) : linked ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-400 text-sm">Open balance</div>
                  <div className="text-xl font-semibold">
                    {money(dueCharges.reduce((sum, c) => sum + Number(c.balance_due || 0), 0))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-slate-400 text-sm">Next due</div>
                  <div className="text-sm">{fmtDate(dueCharges?.[0]?.due_date)}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Pill>{dueCharges.length} open charge(s)</Pill>
                  <Pill>{charges.length} total</Pill>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-slate-300">{notLinkedMsg}</div>
                <div className="text-sm text-slate-400">
                  If you received an email invite, accept it here to link your account to your unit.
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => nav("/tenant/accept")}>Accept Invite</Button>
                  <Button variant="secondary" onClick={loadAll}>
                    I already accepted â€” Refresh
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card title="Messages & Documents" subtitle="Lease, notices, receipts, and management conversations">
            <div className="text-slate-400 text-sm">
              Coming next: signed docs, upload requests, and searchable history.
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="secondary" disabled>
                View documents
              </Button>
              <Button variant="ghost" disabled>
                Upload requested file
              </Button>
            </div>
          </Card>

          <Card title="Maintenance Requests" subtitle="Maintenance + issues + updates">
            <div className="text-slate-400 text-sm">
              Create a request, attach photos, and track status through the connected SyncWorks ticket flow.
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="secondary" disabled>
                New request
              </Button>
              <Button variant="ghost" disabled>
                View requests
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card
            title="Rent charges"
            subtitle="Pay in seconds, see history, download receipts"
            right={
              <div className="flex items-center gap-2">
                <Pill>Stripe ready</Pill>
              </div>
            }
          >
            {loading ? (
              <div className="text-slate-400">Loading charges...</div>
            ) : charges.length === 0 ? (
              <div className="text-slate-400">
                No charges yet. (If you just accepted your tenant invite, hit Refresh.)
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="text-left font-medium py-2">Period</th>
                      <th className="text-left font-medium py-2">Due</th>
                      <th className="text-left font-medium py-2">Amount</th>
                      <th className="text-left font-medium py-2">Paid</th>
                      <th className="text-left font-medium py-2">Balance</th>
                      <th className="text-left font-medium py-2">Status</th>
                      <th className="text-right font-medium py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charges.map((c) => {
                      const statusTxt = (c.status || "").toUpperCase();
                      const isPaid = statusTxt === "PAID" || Number(c.balance_due || 0) <= 0;
                      return (
                        <tr key={c.id} className="border-t border-slate-900/80">
                          <td className="py-3">
                            {fmtDate(c.period_start)} â€“ {fmtDate(c.period_end)}
                            <div className="text-xs text-slate-500 mt-1">Charge #{c.id}</div>
                          </td>
                          <td className="py-3">{fmtDate(c.due_date)}</td>
                          <td className="py-3">{money(c.amount)}</td>
                          <td className="py-3">{money(c.paid_total)}</td>
                          <td className="py-3">{money(c.balance_due)}</td>
                          <td className="py-3">
                            <Pill>{statusTxt || "â€”"}</Pill>
                          </td>
                          <td className="py-3 text-right">
                            {isPaid ? (
                              <Button variant="ghost" disabled>
                                Paid
                              </Button>
                            ) : (
                              <Button onClick={() => handlePay(c)}>Pay</Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="mt-6 text-xs text-slate-500">
          Tip: Tenant portal does not require <code className="text-slate-300">X-Business-Id</code>. It should be safe even if the tenant belongs to multiple PM companies later.
        </div>
      </div>
    </div>
  );
}
