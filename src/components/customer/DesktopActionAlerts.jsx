import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Archive, Bell, Clock3, RotateCcw, Trash2, X } from "lucide-react";
import "./DesktopActionAlerts.css";

// These actions change dashboard presentation ONLY. Neither invoices,
// service requests nor weather records are modified or deleted.
const KEY = "sw-desktop-alert-actions-v1";
const DAY = 24 * 60 * 60 * 1000;
function readSaved() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch { return {}; }
}
function stableKey(entry) {
  return [entry.type, entry.id].join(":");
}
export default function DesktopActionAlerts({ overdueInvoices = [], urgentTickets = [], weatherAlerts = [], dueInvoices = [], onNavigate, money, isOverdue }) {
  const [saved, setSaved] = useState(readSaved);
  const [chosen, setChosen] = useState(null);
  const [showArchive, setShowArchive] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  const entries = useMemo(() => {
    const list = [];
    overdueInvoices.forEach((invoice) => list.push({
      type:"invoice", id:String(invoice.id ?? invoice.memo ?? invoice.title ?? "unknown"),
      title:"PAST DUE", level:"critical",
      detail:`${invoice.memo || invoice.title || "Payment"} · ${money(invoice.balance_due ?? invoice.total ?? 0)}`,
      route:"/customer/invoices"
    }));
    urgentTickets.forEach((ticket) => list.push({
      type:"ticket", id:String(ticket.id ?? ticket.title ?? "unknown"),
      title:"URGENT REQUEST", level:"critical",
      detail:ticket.title || ticket.category_name || ticket.category || "Service request needs attention",
      route:ticket.id ? `/tickets/${ticket.id}` : "/customer/tickets"
    }));
    weatherAlerts.forEach((alert, i) => list.push({
      type:"weather", id:String(alert.id ?? alert.event ?? alert.headline ?? i),
      title:"WEATHER WARNING", level:"critical",
      detail:alert.event || alert.headline || "Weather alert in your area",
      route:"/customer/weather"
    }));
    dueInvoices.filter(invoice => !isOverdue(invoice)).forEach(invoice => list.push({
      type:"invoice", id:String(invoice.id ?? invoice.memo ?? invoice.title ?? "unknown"),
      title:"PAYMENT DUE", level:"warning",
      detail:`${invoice.memo || invoice.title || "Payment"} · ${money(invoice.balance_due ?? invoice.total ?? 0)}`,
      route:"/customer/invoices"
    }));
    return list;
  }, [overdueInvoices, urgentTickets, weatherAlerts, dueInvoices, money, isOverdue]);
  const active = entries.filter(entry => {
    const action = saved[stableKey(entry)];
    return !action || (action.kind === "snooze" && Number(action.until) <= now);
  });
  const archived = entries.filter(entry => saved[stableKey(entry)]?.kind === "archive");
  const selected = entries.find(item => stableKey(item) === chosen);
  const update = (item, kind) => {
    const next = { ...saved };
    if (kind === "restore") delete next[stableKey(item)];
    else next[stableKey(item)] = { kind, until: kind === "snooze" ? Date.now() + DAY : null };
    setSaved(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private browsing */ }
    setChosen(null);
    setNow(Date.now());
  };
  return (
    <section className="sw-desktop-action-alerts sw-lobby-alerts" aria-label="Dashboard alerts">
      <div className="sw-alert-head">
        <div><span className="sw-alert-eyebrow"><Bell size={13}/> ALERTS</span><h2>Needs attention</h2></div>
        <span className="sw-alert-count" aria-label={`${active.length} visible alerts`}>{active.length}</span>
      </div>
      <div className="sw-alert-items">
        {active.length ? active.slice(0, 5).map(entry => (
          <div className={`sw-alert-item sw-alert-item--${entry.level}`} key={stableKey(entry)}>
            <button className="sw-alert-main" type="button" onClick={() => onNavigate(entry.route)} aria-label={`Open ${entry.title}: ${entry.detail}`}>
              <span><AlertTriangle size={14}/>{entry.title}</span>
              <strong>{entry.detail}</strong>
            </button>
            <button className="sw-alert-dismiss" type="button" aria-label={`Manage ${entry.title} alert`} title="Dismiss or snooze" onClick={() => setChosen(stableKey(entry))}><X size={15}/></button>
          </div>
        )) : <div className="sw-alert-clear">All clear — no active dashboard alerts.</div>}
      </div>
      {archived.length > 0 && <button type="button" className="sw-alert-archived-link" onClick={() => setShowArchive(true)}><Archive size={14}/> Archived ({archived.length})</button>}
      {chosen && selected && createPortal(<div className="sw-alert-dialog-backdrop" role="presentation" onMouseDown={() => setChosen(null)}>
        <div className="sw-alert-dialog" role="dialog" aria-modal="true" aria-label="Manage dashboard notification" onMouseDown={e => e.stopPropagation()}>
          <div className="sw-alert-dialog-heading"><strong>Manage notification</strong><button type="button" onClick={() => setChosen(null)} aria-label="Close"><X size={18}/></button></div>
          <p>{selected.detail}</p>
          <div className="sw-alert-options">
            <button type="button" onClick={() => update(selected, "snooze")}><Clock3 size={17}/><span>Show again tomorrow<small>Hide for 24 hours</small></span></button>
            <button type="button" onClick={() => update(selected, "archive")}><Archive size={17}/><span>Archive<small>Keep in Archived alerts</small></span></button>
            <button type="button" onClick={() => update(selected, "delete")}><Trash2 size={17}/><span>Delete this alert<small>Remove this notification from this device</small></span></button>
          </div>
          <div className="sw-alert-safety">These options don't delete or change the underlying payment, request or weather record.</div>
        </div>
      </div>, document.body)}
      {showArchive && createPortal(<div className="sw-alert-dialog-backdrop" onMouseDown={() => setShowArchive(false)} role="presentation">
        <div className="sw-alert-dialog" role="dialog" aria-modal="true" aria-label="Archived alerts" onMouseDown={e => e.stopPropagation()}>
          <div className="sw-alert-dialog-heading"><strong>Archived alerts</strong><button type="button" onClick={() => setShowArchive(false)} aria-label="Close"><X size={18}/></button></div>
          {archived.map(item => <div className="sw-alert-archive-row" key={stableKey(item)}><span>{item.detail}</span><button type="button" onClick={() => update(item,"restore")}><RotateCcw size={15}/> Restore</button></div>)}
        </div>
      </div>, document.body)}
    </section>
  );
}
