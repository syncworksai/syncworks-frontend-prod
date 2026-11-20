import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync("src/pages/sbo/SboInvoices.jsx","utf8");
const api=readFileSync("src/api/invoices.js","utf8");

test("draft editing is backend-authorized and only offered for drafts",()=>{
  assert.match(api,/api\.patch\(\x60\/sync-ai\/business\/invoices\/\$\{invoiceId\}\/\x60/);
  assert.match(page,/invoice\.derived_state==="DRAFT"&&/);
  assert.match(page,/Quick edit/);
});
test("email button creates an editable mailto draft rather than claiming delivery",()=>{
  assert.match(page,/mailto:/);
  assert.match(page,/encodeURIComponent\(message\)/);
  assert.match(page,/email draft|Email draft/i);
  assert.match(page,/customer\/invoices\?invoice_id=/);
});
test("cash, checks and Venmo are external and manual card claims are forbidden",()=>{
  assert.match(page,/value="CASH"/);
  assert.match(page,/value="CHECK"/);
  assert.match(page,/value="VENMO"/);
  assert.doesNotMatch(page,/<option value="SYNC_CARD">/);
});
test("reminder configuration is opt-in with at least two days past due",()=>{
  assert.match(page,/auto_reminders_enabled:true/);
  assert.match(page,/days<2/);
  assert.match(page,/reminder_on_due_date:false/);
});
test("refund UI labels review and never claims money moved",()=>{
  assert.match(page,/request-refund/);
  assert.match(page,/No funds were returned/);
  assert.match(page,/card_last4/);
  assert.doesNotMatch(page,/card_number|card_cvc/);
});
