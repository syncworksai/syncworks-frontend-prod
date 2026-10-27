const PAID = new Set(["PAID"]);
const COMPLETE = new Set(["COMPLETED", "INVOICED", "PAID", "CLOSED"]);
const AWAITING = new Set(["INVOICED"]);
const NEW = new Set(["NEW", "NEEDS_QUOTE", "QUOTED", "APPROVED", "ACCEPTED", "ASSIGNED"]);

export const stateOf = (ticket) => String(ticket?.status || "").toUpperCase();

export function pilotNextAction(tickets) {
  if (!tickets?.length) return {
    title: "Add your first customer and job",
    description: "Log a phone call in one place. The customer and ticket are created together.",
    action: "Create a job", target: "intake",
  };
  const due = tickets.find((ticket) => AWAITING.has(stateOf(ticket)));
  if (due) return {
    title: "Collect or record an invoice payment",
    description: "You have an invoiced job awaiting payment. Open the ticket to finish the workflow.",
    action: "Review invoice", target: "ticket", ticketId: due.id,
  };
  const completed = tickets.find((ticket) => stateOf(ticket) === "COMPLETED");
  if (completed) return {
    title: "Invoice a completed job",
    description: "The work is complete. Open its ticket and prepare the customer invoice.",
    action: "Open completed job", target: "ticket", ticketId: completed.id,
  };
  const newJob = tickets.find((ticket) => NEW.has(stateOf(ticket)));
  if (newJob) return {
    title: "Schedule and assign your job",
    description: "Move the work forward using the ticket and technician board.",
    action: "Open technician board", target: "dispatch",
  };
  const active = tickets.find((ticket) => !COMPLETE.has(stateOf(ticket)) && stateOf(ticket) !== "CANCELLED");
  if (active) return {
    title: "Finish the work in progress",
    description: "Use the ticket to update its progress through completion and billing.",
    action: "Open active job", target: "ticket", ticketId: active.id,
  };
  return {
    title: "Review your work and revenue",
    description: "You have completed work in this account. Review the recorded business results.",
    action: "See business intelligence", target: "reports",
  };
}

export const hasPaidJob = (tickets) => Array.isArray(tickets) && tickets.some((ticket) => PAID.has(stateOf(ticket)));
