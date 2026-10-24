// Business Intelligence calculations are intentionally independent of React.
// Financials here represent collected KPI revenue, not net income.
export function asRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.value)) return data.value;
  return [];
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function positiveNumber(value) {
  return Math.max(0, finiteNumber(value));
}

function sum(rows, key, signed = false) {
  return rows.reduce((total, row) => total + (signed ? finiteNumber(row?.[key]) : positiveNumber(row?.[key])), 0);
}

function timestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function stageOfLead(lead) {
  const stage = lead?.stage_name || lead?.stage?.name || lead?.status || lead?.stage || "NEW";
  const value = String(stage).trim().toUpperCase().replaceAll(" ", "_");
  if (value.includes("LOST") || value.includes("DISQUAL")) return "LOST";
  if (value.includes("WON") || value.includes("CONVERT")) return "WON";
  if (value.includes("QUOTE") || value.includes("ESTIMATE")) return "QUOTE_SENT";
  if (value.includes("QUAL")) return "QUALIFIED";
  if (value.includes("CONTACT")) return "CONTACTED";
  return "NEW";
}

function leadFollowUp(lead) {
  return lead?.next_follow_up_at || lead?.follow_up_at || lead?.next_action_at;
}

function customerKey(ticket) {
  const customer = ticket?.customer_id ||
    ticket?.customer_user_id ||
    ticket?.customer?.id ||
    (typeof ticket?.customer === "string" || typeof ticket?.customer === "number"
      ? ticket.customer : null) ||
    ticket?.customer_email;
  return customer == null ? "" : String(customer).trim().toLowerCase();
}

function isUnpaidInvoice(ticket) {
  return ["INVOICED", "SENT", "AWAITING_PAYMENT"].includes(String(ticket?.status || "").toUpperCase());
}

function isActiveJob(ticket) {
  const status = String(ticket?.status || "").toUpperCase();
  return !["COMPLETED", "PAID", "CLOSED", "CANCELLED", "VOID", "DECLINED", "INVOICED", "SENT", "AWAITING_PAYMENT"].includes(status);
}

export function calculateBusinessIntelligence({
  kpis = [],
  tickets = [],
  leads = [],
  hasKpis = false,
  hasTickets = false,
  hasLeads = false,
  now = Date.now(),
} = {}) {
  const kpiRows = asRows(kpis);
  const ticketRows = asRows(tickets);
  const leadRows = asRows(leads);
  const revenue = hasKpis ? sum(kpiRows, "gmv_paid_cents", true) / 100 : null;
  const paidTickets = hasKpis ? sum(kpiRows, "tickets_paid_count") : null;
  const completedJobs = hasKpis ? sum(kpiRows, "tickets_completed_count") : null;
  const paidInvoices = hasKpis ? sum(kpiRows, "paid_invoice_count") : null;
  const openTickets = hasKpis && kpiRows.length
    ? positiveNumber(kpiRows[kpiRows.length - 1]?.tickets_open_count)
    : null;

  const won = leadRows.filter((lead) => stageOfLead(lead) === "WON").length;
  const lost = leadRows.filter((lead) => stageOfLead(lead) === "LOST").length;
  const stageCounts = { NEW: 0, CONTACTED: 0, QUALIFIED: 0, QUOTE_SENT: 0, WON: 0, LOST: 0 };
  for (const lead of leadRows) stageCounts[stageOfLead(lead)] += 1;
  const overdueLeads = leadRows.filter((lead) => {
    if (["WON", "LOST"].includes(stageOfLead(lead))) return false;
    const dueAt = timestamp(leadFollowUp(lead));
    return dueAt !== null && dueAt < now;
  }).length;

  const customerJobs = new Map();
  for (const ticket of ticketRows) {
    const key = customerKey(ticket);
    if (key) customerJobs.set(key, (customerJobs.get(key) || 0) + 1);
  }
  const identifiedCustomers = customerJobs.size;
  const repeatCustomers = Array.from(customerJobs.values()).filter((count) => count > 1).length;

  const staleAt = now - 7 * 24 * 60 * 60 * 1000;
  const staleJobs = ticketRows.filter((ticket) => {
    if (!isActiveJob(ticket)) return false;
    const updatedAt = timestamp(ticket?.updated_at || ticket?.created_at);
    return updatedAt !== null && updatedAt < staleAt;
  }).length;

  const unpaidInvoices = ticketRows.filter(isUnpaidInvoice).length;

  return {
    hasKpis,
    hasTickets,
    hasLeads,
    revenue,
    paidTickets,
    paidInvoices,
    completedJobs,
    openTickets,
    averagePaidTicket: paidTickets > 0 ? revenue / paidTickets : null,
    unpaidInvoices: hasTickets ? unpaidInvoices : null,
    staleJobs: hasTickets ? staleJobs : null,
    visibleTickets: hasTickets ? ticketRows.length : null,
    identifiedCustomers: hasTickets ? identifiedCustomers : null,
    repeatCustomers: hasTickets ? repeatCustomers : null,
    repeatShare: hasTickets && identifiedCustomers > 0
      ? (100 * repeatCustomers) / identifiedCustomers : null,
    trackedLeads: hasLeads ? leadRows.length : null,
    wonLeads: hasLeads ? won : null,
    lostLeads: hasLeads ? lost : null,
    leadWinShare: hasLeads && leadRows.length > 0 ? (100 * won) / leadRows.length : null,
    overdueLeads: hasLeads ? overdueLeads : null,
    stageCounts: hasLeads ? stageCounts : null,
    revenueSeries: hasKpis
      ? kpiRows.map((row) => ({
          day: String(row?.day || row?.date || "").slice(5),
          revenue: finiteNumber(row?.gmv_paid_cents) / 100,
          completed: positiveNumber(row?.tickets_completed_count),
        }))
      : [],
  };
}

// Rules-based, not an LLM or a scheduled push notification.
export function buildBusinessBriefing(metrics) {
  const notes = [];
  if (metrics.hasLeads && metrics.overdueLeads > 0) {
    notes.push({
      tone: "amber",
      title: "Follow-ups need attention",
      body: metrics.overdueLeads + " open lead follow-up" + (metrics.overdueLeads === 1 ? " is" : "s are") + " past due.",
      route: "/sbo/leads",
      action: "Review leads",
    });
  }
  if (metrics.hasTickets && metrics.unpaidInvoices > 0) {
    notes.push({
      tone: "amber",
      title: "Invoices awaiting payment",
      body: metrics.unpaidInvoices + " ticket" + (metrics.unpaidInvoices === 1 ? " is" : "s are") + " marked invoiced or awaiting payment. This is a count, not a dollar balance.",
      route: "/tickets",
      action: "Review invoices",
    });
  }
  if (metrics.hasTickets && metrics.staleJobs > 0) {
    notes.push({
      tone: "cyan",
      title: "Check jobs without recent updates",
      body: metrics.staleJobs + " active job" + (metrics.staleJobs === 1 ? " has" : "s have") + " had no update for over 7 days.",
      route: "/tickets",
      action: "Review jobs",
    });
  }
  if (metrics.hasKpis && metrics.paidTickets > 0) {
    notes.push({
      tone: "emerald",
      title: "Collected revenue per paid ticket",
      body: "Average collected revenue is " + new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(metrics.averagePaidTicket) + " per paid ticket in this period. This is not profit.",
      route: "/sbo/finance",
      action: "Open finance",
    });
  }
  if (!notes.length) {
    notes.push({
      tone: "cyan",
      title: "Nothing urgent found in connected records",
      body: "Review your leads, ticket history, and collected payments to keep the business picture current.",
      route: "/sbo",
      action: "Business dashboard",
    });
  }
  return notes;
}
