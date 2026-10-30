import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("God Mode keeps desktop dashboard and uses founder cockpit on phones", () => {
  const dashboard = read("src/pages/PlatformDashboard.jsx");
  const mobile = read("src/components/platform/PlatformMobileDashboard.jsx");
  const css = read("src/components/platform/PlatformMobileDashboard.css");
  assert.match(dashboard, /<PlatformMobileDashboard activeTab=\{tab\}/);
  assert.match(dashboard, /hidden lg:block"><ModeBar|hidden lg:block">\s*<ModeBar/);
  assert.match(dashboard, /hidden lg:block"><PlatformTabs/);
  assert.match(dashboard, /hidden lg:block"><PlatformOverviewTab/);
  assert.match(dashboard, /tab === "pilot_readiness" \? <PilotReadinessPanel/);
  assert.match(dashboard, /tab === "__build_backlog"/);
  assert.match(mobile, /Founder command center/);
  assert.match(mobile, /Platform priorities/);
  assert.match(mobile, /aria-label="God Mode mobile navigation"/);
  assert.match(mobile, /role="dialog" aria-modal="true"/);
  assert.match(mobile, /onClick=\{\(\)=>go\("testers"\)\}/);
  assert.match(mobile, /onClick=\{\(\)=>go\("pilot_readiness"\)\}/);
  assert.match(mobile, /onClick=\{\(\)=>go\("billing"\)\}/);
  assert.match(mobile, /tabs\.map\(item=>/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("Founder phone metrics use real APIs and do not pretend missing data is zero", () => {
  const mobile = read("src/components/platform/PlatformMobileDashboard.jsx");
  assert.match(mobile, /\/platform\/metrics\/summary\/\?days=30/);
  assert.match(mobile, /\/platform\/metrics\/alerts\//);
  assert.match(mobile, /\/platform\/prospects\/metrics\//);
  assert.match(mobile, /\/platform\/pilot-readiness\//);
  assert.match(mobile, /Promise\.allSettled\(requests\)/);
  assert.match(mobile, /"—"/);
  assert.match(mobile, /Alert monitoring is unavailable/);
  assert.doesNotMatch(mobile, /\$128,430|24,892|99\.98%/);
});

test("Global mobile dock does not overlap God Mode mobile dock", () => {
  const nav = read("src/components/navigation/RoleAwareMobileNav.jsx");
  assert.match(nav, /pathname === "\/platform" \|\| pathname === "\/god-mode"/);
});
