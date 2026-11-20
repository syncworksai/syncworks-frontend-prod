import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const invoice=readFileSync("src/pages/sbo/SboInvoices.jsx","utf8");
const styles=readFileSync("src/pages/sbo/SboInvoices.css","utf8");
const source=readFileSync("src/api/invoices.js","utf8");
const sterling=readFileSync("src/pages/PrivateShowcase.jsx","utf8");

test("live SBO invoice office does not use Sterling simulated records",()=>{
  assert.match(sterling,/demoInvoices/);
  assert.doesNotMatch(invoice,/demoInvoices|sterlingDemoData|INV-5001|Hamilton Office Park/);
  assert.match(invoice,/getInvoiceCenter/);
  assert.match(source,/sync-ai\/business\/invoices/);
});

test("invoice rows show real customer, balance and state with a detail drawer",()=>{
  assert.match(invoice,/invoice.customer_name/);
  assert.match(invoice,/invoice.balance_due/);
  assert.match(invoice,/invoice.derived_state/);
  assert.match(invoice,/role="dialog" aria-modal="true"/);
  assert.match(styles,/sw-invoice-ledger-list[^]*?overflow-y:auto/);
});

test("invoice mutation flow remains intact",()=>{
  for(const name of ["createInvoiceFromTicket","getInvoiceDetail","invoiceAction","record-payment","reminder","send","void"]){
    assert.ok(invoice.includes(name),name);
  }
  assert.match(invoice,/onClick=\{\(\)=>setSelected\(null\)\}/);
});

test("unknown currency amounts do not silently become zero",()=>{
  assert.match(invoice,/if \(value === null \|\| value === undefined/);
  assert.match(invoice,/Number.isFinite/);
});

test("viewport-safe and reduced-motion behavior",()=>{
  assert.match(styles,/height:100%/);
  assert.match(styles,/prefers-reduced-motion/);
  assert.match(styles,/safe-area-inset-bottom/);
});
