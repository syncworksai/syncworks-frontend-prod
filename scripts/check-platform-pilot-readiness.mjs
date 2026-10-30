import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read=(path)=>readFileSync(path,"utf8");

test("God Mode exposes a real Pilot Readiness tab and backend-driven panel",()=>{
  const platform=read("src/pages/PlatformDashboard.jsx");
  const panel=read("src/pages/platform/PilotReadinessPanel.jsx");
  assert.match(platform, /id: "pilot_readiness", label: "Pilot Readiness"/);
  assert.match(platform, /tab === "pilot_readiness" \? <PilotReadinessPanel/);
  assert.match(panel, /api\.get\("\/platform\/pilot-readiness\/"\)/);
  assert.match(panel, /api\.patch\("\/platform\/pilot-readiness\/",/);
  assert.match(panel, /response\.data/);
  assert.match(panel, /NOT_TESTED/);
  assert.match(panel, /Manual gate/);
  assert.match(panel, /No email, payment or deployment was triggered/);
  assert.match(panel, /\!data\.launch_ready|data\.launch_ready/);
  assert.doesNotMatch(panel, /localStorage/);
});
