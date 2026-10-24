// Run: node --test scripts/check-business-intelligence.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  asRows,
  buildBusinessBriefing,
  calculateBusinessIntelligence,
  stageOfLead,
} from "../src/utils/businessIntelligence.js";

test("reads array and paginated API responses", () => {
  assert.deepEqual(asRows({ results: [{ id: 1 }] }), [{ id: 1 }]);
  assert.deepEqual(asRows({ value: [{ id: 2 }] }), [{ id: 2 }]);
  assert.deepEqual(asRows(null), []);
});

test("revenue is in dollars and rolling counters are not estimates", () => {
  const output = calculateBusinessIntelligence({
    hasKpis: true,
    kpis: [
      { day: "2026-10-20", gmv_paid_cents: 13525, tickets_paid_count: 1, paid_invoice_count: 2, tickets_completed_count: 2, tickets_open_count: 4 },
      { day: "2026-10-21", gmv_paid_cents: 16475, tickets_paid_count: 2, paid_invoice_count: 1, tickets_completed_count: 3, tickets_open_count: 5 },
    ],
  });
  assert.equal(output.revenue, 300);
  assert.equal(output.paidTickets, 3);
  assert.equal(output.averagePaidTicket, 100);
  assert.equal(output.completedJobs, 5);
  assert.equal(output.paidInvoices, 3);
  assert.equal(output.openTickets, 5);
  assert.equal(output.revenueSeries.length, 2);
});

test("missing feeds report unavailable instead of zero", () => {
  const output = calculateBusinessIntelligence();
  assert.equal(output.revenue, null);
  assert.equal(output.unpaidInvoices, null);
  assert.equal(output.trackedLeads, null);
  assert.equal(output.repeatShare, null);
});

test("lead follow-ups exclude closed leads and customer repeats use identifiers", () => {
  const now = Date.parse("2026-10-24T12:00:00Z");
  const output = calculateBusinessIntelligence({
    hasLeads: true,
    hasTickets: true,
    now,
    leads: [
      { id: 1, status: "NEW", next_follow_up_at: "2026-10-20T12:00:00Z" },
      { id: 2, status: "WON", next_follow_up_at: "2026-10-20T12:00:00Z" },
      { id: 3, status: "CLOSED_LOST", next_follow_up_at: "2026-10-20T12:00:00Z" },
      { id: 4, stage: "Quote Sent", next_follow_up_at: "2026-10-26T12:00:00Z" },
    ],
    tickets: [
      { id: 11, customer_id: 4, status: "INVOICED" },
      { id: 12, customer_id: 4, status: "PAID" },
      { id: 13, customer_id: 5, status: "IN_PROGRESS", updated_at: "2026-10-01T10:00:00Z" },
      { id: 14, status: "PAID" },
    ],
  });
  assert.equal(output.trackedLeads, 4);
  assert.equal(output.wonLeads, 1);
  assert.equal(output.lostLeads, 1);
  assert.equal(output.overdueLeads, 1);
  assert.equal(output.leadWinShare, 25);
  assert.equal(output.identifiedCustomers, 2);
  assert.equal(output.repeatCustomers, 1);
  assert.equal(output.repeatShare, 50);
  assert.equal(output.unpaidInvoices, 1);
  assert.equal(output.staleJobs, 1);
  assert.equal(stageOfLead({ stage: { name: "Qualified" } }), "QUALIFIED");
});

test("briefing is rules based and only uses actual available counts", () => {
  const output = calculateBusinessIntelligence({
    hasLeads: true,
    leads: [{ status: "NEW", follow_up_at: "2026-01-01T12:00:00Z" }],
    now: Date.parse("2026-10-24T12:00:00Z"),
  });
  const briefing = buildBusinessBriefing(output);
  assert.ok(briefing.some((note) => note.title.includes("Follow-ups")));
  assert.ok(!briefing.some((note) => note.title.includes("Invoices")));
});
