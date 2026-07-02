import api from "../api/client";

function rowsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

function dateValue(row) {
  return (
    row?.scheduled_start ||
    row?.scheduled_at ||
    row?.needed_by_date ||
    row?.due_date ||
    null
  );
}

function isOverdue(row) {
  const value = dateValue(row);
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() < Date.now();
}

function intentFor(request) {
  const lower = String(request || "").toLowerCase();

  if (
    lower.includes("lead") ||
    lower.includes("follow-up") ||
    lower.includes("prospect")
  ) {
    return "leads";
  }

  if (
    lower.includes("partner") ||
    lower.includes("subcontract") ||
    lower.includes("vendor")
  ) {
    return "partners";
  }

  if (
    lower.includes("payment") ||
    lower.includes("stripe") ||
    lower.includes("finance") ||
    lower.includes("money")
  ) {
    return "finance";
  }

  if (
    lower.includes("health") ||
    lower.includes("fitness") ||
    lower.includes("workout")
  ) {
    return "health";
  }

  if (
    lower.includes("schedule") ||
    lower.includes("calendar") ||
    lower.includes("conflict")
  ) {
    return "calendar";
  }

  return "operations";
}

function titleOf(ticket) {
  return (
    ticket?.title ||
    ticket?.display_title ||
    ticket?.service_category_label ||
    ticket?.category_label ||
    `Job #${ticket?.id || "unknown"}`
  );
}

function summarizeTickets(tickets) {
  const activeStatuses = new Set([
    "NEW",
    "OPEN",
    "ACCEPTED",
    "ASSIGNED",
    "SCHEDULED",
    "EN_ROUTE",
    "ON_SITE",
    "IN_PROGRESS",
    "BLOCKED",
    "WAITING",
  ]);

  const active = tickets.filter((ticket) =>
    activeStatuses.has(upper(ticket?.status))
  );

  const blocked = active.filter((ticket) =>
    ["BLOCKED", "WAITING", "ON_HOLD"].includes(upper(ticket?.status))
  );

  const overdue = active.filter(isOverdue);

  const unassigned = active.filter(
    (ticket) =>
      !ticket?.assigned_member &&
      !ticket?.assigned_member_id &&
      !ticket?.assigned_to &&
      !ticket?.assigned_to_id
  );

  const inProgress = active.filter((ticket) =>
    ["EN_ROUTE", "ON_SITE", "IN_PROGRESS"].includes(upper(ticket?.status))
  );

  return {
    active,
    blocked,
    overdue,
    unassigned,
    inProgress,
  };
}

function summarizeLeads(leads) {
  const closedStatuses = new Set([
    "WON",
    "LOST",
    "CLOSED",
    "ARCHIVED",
    "CONVERTED",
  ]);

  const open = leads.filter(
    (lead) => !closedStatuses.has(upper(lead?.status || lead?.stage_name))
  );

  const untouched = open.filter(
    (lead) =>
      !lead?.last_contact_at &&
      !lead?.last_activity_at &&
      !lead?.next_follow_up_at
  );

  const followUpDue = open.filter((lead) => {
    const value = lead?.next_follow_up_at || lead?.follow_up_at;
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
  });

  return { open, untouched, followUpDue };
}

function paymentReady(billing, connect) {
  const cardReady = !!(
    billing?.stripe_setup_complete ||
    billing?.has_payment_method ||
    billing?.payment_method_ready
  );

  const connectReady = !!(
    connect?.onboarding_completed &&
    connect?.charges_enabled &&
    connect?.payouts_enabled
  );

  return { cardReady, connectReady };
}

function resultForIntent({
  intent,
  request,
  tickets,
  leads,
  invitations,
  billing,
  connect,
}) {
  const ticketSummary = summarizeTickets(tickets);
  const leadSummary = summarizeLeads(leads);
  const pendingInvites = invitations.filter(
    (invitation) => upper(invitation?.status) === "PENDING"
  );
  const payment = paymentReady(billing, connect);

  if (intent === "leads") {
    const bullets = [
      `${leadSummary.open.length} open lead${
        leadSummary.open.length === 1 ? "" : "s"
      }.`,
      `${leadSummary.followUpDue.length} follow-up${
        leadSummary.followUpDue.length === 1 ? "" : "s"
      } due now.`,
      `${leadSummary.untouched.length} lead${
        leadSummary.untouched.length === 1 ? "" : "s"
      } without recorded contact activity.`,
    ];

    return {
      title: "Lead follow-up briefing",
      area: "Business · Leads",
      summary:
        leadSummary.followUpDue.length > 0
          ? "You have lead follow-ups requiring attention. Open Leads to review and approve outreach."
          : "No overdue follow-up was found in the available lead data.",
      bullets,
      route: "/sbo/leads",
      actionLabel: "Open Leads",
      speech: `${leadSummary.followUpDue.length} lead follow-ups are due. ${leadSummary.open.length} leads remain open.`,
    };
  }

  if (intent === "partners") {
    const bullets = [
      `${pendingInvites.length} pending partner invitation${
        pendingInvites.length === 1 ? "" : "s"
      }.`,
      `${tickets.filter((ticket) => ticket?.partner_business).length} partner-linked work ticket${
        tickets.filter((ticket) => ticket?.partner_business).length === 1
          ? ""
          : "s"
      }.`,
      "Partner actions remain review-only inside the Partner Hub.",
    ];

    return {
      title: "Partner network briefing",
      area: "Business · Partners",
      summary:
        pendingInvites.length > 0
          ? "Partner invitations are waiting for review."
          : "No pending partner invitation was found.",
      bullets,
      route: "/sbo/partners",
      actionLabel: "Open Partner Hub",
      speech: `${pendingInvites.length} partner invitations are pending.`,
    };
  }

  if (intent === "finance") {
    const bullets = [
      payment.cardReady
        ? "Platform billing method is ready."
        : "Platform billing method still needs setup.",
      payment.connectReady
        ? "Stripe Connect charges and payouts are enabled."
        : "Stripe Connect onboarding or verification is incomplete.",
      "External payments must still be reconciled inside SyncWorks for the 1% platform fee.",
    ];

    return {
      title: "Payment readiness briefing",
      area: "Business · Finance",
      summary:
        payment.cardReady && payment.connectReady
          ? "Your payment setup appears ready from the available billing and Connect status."
          : "At least one payment-readiness step still needs attention.",
      bullets,
      route: "/sbo/finance",
      actionLabel: "Open Finance",
      speech:
        payment.cardReady && payment.connectReady
          ? "Payment setup appears ready."
          : "Payment setup still has an incomplete requirement.",
    };
  }

  if (intent === "health") {
    return {
      title: "Health coach briefing",
      area: "Health · Coach",
      summary:
        "Your Health dashboard contains the current workout, recovery, sleep, and nutrition context.",
      bullets: [
        "Open Health to review today’s plan.",
        "Workout changes remain under your control.",
        "SYNC will use recorded Health data in a later coaching integration.",
      ],
      route: "/customer/health",
      actionLabel: "Open Health",
      speech: "Your health dashboard is ready for today’s coaching review.",
    };
  }

  if (intent === "calendar") {
    const scheduled = ticketSummary.active.filter((ticket) => dateValue(ticket));

    return {
      title: "Schedule briefing",
      area: "Calendar",
      summary: `${scheduled.length} active work item${
        scheduled.length === 1 ? " has" : "s have"
      } schedule information in the current ticket data.`,
      bullets: [
        `${ticketSummary.overdue.length} scheduled item${
          ticketSummary.overdue.length === 1 ? " appears" : "s appear"
        } overdue.`,
        `${ticketSummary.inProgress.length} job${
          ticketSummary.inProgress.length === 1 ? " is" : "s are"
        } currently in field workflow.`,
        "Open Calendar to inspect exact timing and conflicts.",
      ],
      route: "/calendar",
      actionLabel: "Open Calendar",
      speech: `${ticketSummary.overdue.length} scheduled items appear overdue.`,
    };
  }

  const topBlocked = ticketSummary.blocked[0];
  const topOverdue = ticketSummary.overdue[0];

  const bullets = [
    `${ticketSummary.active.length} active job${
      ticketSummary.active.length === 1 ? "" : "s"
    }.`,
    `${ticketSummary.blocked.length} blocked or waiting.`,
    `${ticketSummary.overdue.length} appear overdue.`,
    `${ticketSummary.unassigned.length} are unassigned.`,
  ];

  if (topBlocked) {
    bullets.push(`Top blocked item: ${titleOf(topBlocked)}.`);
  } else if (topOverdue) {
    bullets.push(`Top overdue item: ${titleOf(topOverdue)}.`);
  }

  return {
    title: "Today’s operations briefing",
    area: "Business · Operations",
    summary:
      ticketSummary.blocked.length > 0
        ? "Blocked work should be reviewed first, followed by overdue and unassigned jobs."
        : ticketSummary.overdue.length > 0
        ? "Overdue work is the clearest priority in the current data."
        : "No blocked work was found. Review active and unassigned jobs next.",
    bullets,
    route: "/tickets",
    actionLabel: "Open Work Board",
    speech: `${ticketSummary.active.length} active jobs. ${ticketSummary.blocked.length} blocked. ${ticketSummary.overdue.length} overdue.`,
    request,
  };
}

export async function buildSyncLiveBriefing(request) {
  const intent = intentFor(request);

  const results = await Promise.allSettled([
    api.get("/tickets/"),
    api.get("/sales/leads/"),
    api.get("/business-partner-invitations/"),
    api.get("/billing/status/"),
    api.get("/connect/express/status/"),
  ]);

  const tickets =
    results[0].status === "fulfilled"
      ? rowsOf(results[0].value?.data)
      : [];
  const leads =
    results[1].status === "fulfilled"
      ? rowsOf(results[1].value?.data)
      : [];
  const invitations =
    results[2].status === "fulfilled"
      ? rowsOf(results[2].value?.data)
      : [];
  const billing =
    results[3].status === "fulfilled"
      ? results[3].value?.data || null
      : null;
  const connect =
    results[4].status === "fulfilled"
      ? results[4].value?.data || null
      : null;

  const availableSources = [
    results[0].status === "fulfilled" ? "tickets" : null,
    results[1].status === "fulfilled" ? "leads" : null,
    results[2].status === "fulfilled" ? "partners" : null,
    results[3].status === "fulfilled" ? "billing" : null,
    results[4].status === "fulfilled" ? "connect" : null,
  ].filter(Boolean);

  const result = resultForIntent({
    intent,
    request,
    tickets,
    leads,
    invitations,
    billing,
    connect,
  });

  return {
    ...result,
    live: true,
    sources: availableSources,
    partial: availableSources.length < 5,
  };
}
