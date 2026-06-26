export function ticketWorkflow(ticket) {
  return ticket?.workflow || null;
}

export function ticketPrimaryAction(ticket) {
  return ticketWorkflow(ticket)?.primary_action || null;
}

export function ticketWaitingLabel(ticket) {
  return ticketWorkflow(ticket)?.waiting_on_label || "";
}