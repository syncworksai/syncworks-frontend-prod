import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const shell=readFileSync("src/components/dashboard/DashboardShell.jsx","utf8");
const css=readFileSync("src/components/dashboard/DashboardShell.css","utf8");
const motion=readFileSync("src/components/navigation/MobileRouteMotion.jsx","utf8");
const finance=readFileSync("src/pages/sbo/SboFinance.jsx","utf8");
const invoices=readFileSync("src/pages/sbo/SboInvoices.jsx","utf8");

test("Business shell keeps only the viewport and a bounded content region",()=>{
  assert.match(shell,/height|sw-business-locked-shell/);
  assert.match(css,/height:100dvh/);
  assert.match(css,/overflow:hidden/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
});

test("Health Forge and Games retain their own layout and animation",()=>{
  assert.match(shell,/isBusinessWorkspace\(pathname\)/);
  assert.match(motion,/health\|forge\|games/);
  assert.doesNotMatch(shell,/customer\/health/);
  assert.doesNotMatch(shell,/customer\/forge/);
});

test("Finance separates readiness payouts and reconciliation without replacing Stripe",()=>{
  assert.match(finance,/financeTab==="readiness"/);
  assert.match(finance,/financeTab==="payments"/);
  assert.match(finance,/financeTab==="reconciliation"/);
  assert.match(finance,/startConnect/);
  assert.match(finance,/startSubscription/);
});

test("Invoice Center preserves invoice mutations in an accessible bounded drawer",()=>{
  assert.match(invoices,/role="dialog" aria-modal="true"/);
  assert.match(invoices,/createInvoiceFromTicket/);
  assert.match(invoices,/invoiceAction/);
  assert.match(invoices,/setSelected\(null\)/);
});
