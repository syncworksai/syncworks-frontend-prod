import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("God Mode Billing has a founder cash-lock status panel",()=>{
  const billing=readFileSync("src/components/platform/BillingManager.jsx","utf8");
  const consolePanel=readFileSync("src/components/platform/CashFeeAgingConsole.jsx","utf8");
  assert.match(billing,/CashFeeAgingConsole/);
  assert.match(consolePanel,/\/platform\/locking\/cash-status\//);
  assert.match(consolePanel,/lock_at/);
  assert.match(consolePanel,/days_until_lock/);
  assert.match(consolePanel,/is_locked/);
  assert.match(consolePanel,/Payment collection and refund reconciliation must be confirmed separately/);
});
