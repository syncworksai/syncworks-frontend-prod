// Run: node --test scripts/check-business-pilot.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasPaidJob, pilotNextAction } from "../src/utils/businessPilotWorkflow.js";

test("first use prioritizes the real customer and job intake", () => {
  assert.equal(pilotNextAction([]).target, "intake");
  assert.equal(hasPaidJob([]), false);
});

test("invoice due is more urgent than dispatch; it opens a real ticket", () => {
  const result = pilotNextAction([
    { id: 11, status: "NEW" },
    { id: 12, status: "INVOICED" },
  ]);
  assert.equal(result.target, "ticket");
  assert.equal(result.ticketId, 12);
});

test("completed job leads to invoicing and a new job leads to dispatch", () => {
  assert.equal(pilotNextAction([{ id: 13, status: "COMPLETED" }]).ticketId, 13);
  assert.equal(pilotNextAction([{ id: 14, status: "NEW" }]).target, "dispatch");
  assert.equal(pilotNextAction([{ id: 15, status: "IN_PROGRESS" }]).ticketId, 15);
});

test("finished paid jobs lead to reporting, not fake intake blockers", () => {
  const jobs = [{ id: 22, status: "PAID" }];
  assert.equal(hasPaidJob(jobs), true);
  assert.equal(pilotNextAction(jobs).target, "reports");
});

test("mobile onboarding does not hide the remainder of the Business dashboard", () => {
  const readiness = readFileSync("src/components/sbo/SboSetupReadiness.jsx", "utf8");
  assert.doesNotMatch(readiness, /#business-readiness\s*~\s*\*/);
  assert.match(readiness, /aria-expanded=\{expanded\}/);
});

test("quick intake offers a one-step handoff to the ticket or dispatcher", () => {
  const quick = readFileSync("src/pages/sbo/BusinessQuickIntake.jsx", "utf8");
  assert.match(quick, /Open ticket/);
  assert.match(quick, /Dispatch board/);
  const app = readFileSync("src/App.jsx", "utf8");
  assert.match(app, /path="\/sbo\/pilot"/);
  assert.match(app, /BusinessPilotTest/);
});
