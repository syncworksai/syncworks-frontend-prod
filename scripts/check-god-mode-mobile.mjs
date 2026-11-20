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
  assert.match(dashboard, /<GodModeCockpit onOpen=\{setTab\}/);
  assert.match(dashboard, /sw-god-detail-drawer/);
  assert.match(dashboard, /tab === "overview" \? <div className="hidden lg:block"><PlatformOverviewTab/);
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

test("Founder root route renders the live cockpit rather than legacy operations", () => {
  const route = read("src/components/PlatformRoute.jsx");
  const dashboard = read("src/pages/PlatformDashboard.jsx");
  const scene = read("src/pages/GodModeScene.css");
  assert.match(route, /<GlobalModeBar \/>\{children\}/);
  assert.doesNotMatch(route, /GodModeCompanyOperations/);
  assert.match(dashboard, /<GodModeCockpit onOpen=\{setTab\}/);
  assert.match(scene, /godmodebackground\.png/);
});

test("God Mode is the single founder menu destination, preserving live user controls", () => {
  const menu = read("src/components/navigation/GlobalModeBar.jsx");
  const dashboard = read("src/pages/PlatformDashboard.jsx");
  const cockpit = read("src/components/platform/GodModeCockpit.jsx");
  const scene = read("src/pages/GodModeScene.css");
  assert.doesNotMatch(menu, /Legacy Admin Dashboard/);
  assert.match(menu, /PLATFORM: \{ label: "God Mode", to: "\/platform" \}/);
  assert.match(dashboard, /<GodModeLiveUsers \/>/);
  assert.match(dashboard, /<UsersManager \/>/);
  assert.match(cockpit, /sw-god-mobile-department-switch/);
  assert.match(cockpit, /Promise\.allSettled/);
  assert.match(scene, /sw-god-mobile-departments/);
  assert.match(scene, /height:100dvh/);
});

test("Founder rail uses Victoria without obstructive commerce button", () => {
  const cockpit=read("src/components/platform/GodModeCockpit.jsx");
  const commerce=read("src/components/platform/PlatformCommerceDock.jsx");
  const platform=read("src/pages/PlatformDashboard.jsx");
  const launcher=read("src/components/sync/SyncAssistantLauncher.jsx");
  assert.match(cockpit, /const openVictoria = \(\) => onOpen\("operations_desk"\)/);
  assert.match(cockpit, /sw-god-victoria-dock/);
  assert.match(cockpit, /sw-god-mobile-victoria/);
  assert.match(cockpit, /syncworks:commerce-kpis-open/);
  assert.match(commerce, /addEventListener\("syncworks:commerce-kpis-open"/);
  assert.doesNotMatch(commerce, /fixed bottom-5 right-5/);
  assert.match(platform, /<PlatformCommerceDock \/>/);
  assert.match(launcher, /location\.pathname !== "\/platform"/);
});

test("Founder Operations Desk assigns support handoffs only through confirmed backlog creation", () => {
  const desk=read("src/components/platform/FounderOperationsDesk.jsx");
  const dashboard=read("src/pages/PlatformDashboard.jsx");
  const cockpit=read("src/components/platform/GodModeCockpit.jsx");
  assert.match(dashboard, /operations_desk/);
  assert.match(dashboard, /<FounderOperationsDesk onOpen=\{setTab\}/);
  assert.match(cockpit, /Assign Work/);
  assert.match(desk, /\/platform\/support\/requests\/\?status=OPEN/);
  assert.match(desk, /backlog_action:"create"/);
  assert.match(desk, /Confirm backlog handoff/);
  assert.match(desk, /sendSyncAiMessage/);
  assert.match(desk, /sw-god-opsdesk-chat-compose/);
  assert.doesNotMatch(desk, /backlog_action:"run"/);
});

test("Founder portrait opens Operations Desk with a Victoria briefing action", () => {
  const cockpit=read("src/components/platform/GodModeCockpit.jsx");
  const desk=read("src/components/platform/FounderOperationsDesk.jsx");
  assert.match(cockpit, /aria-label="Open Victoria Chief of Staff Operations Desk"/);
  assert.match(cockpit, /sw-god-mobile-victoria/);
  assert.match(desk, /Speak with Victoria/);
  assert.match(desk, /sendSyncAiMessage/);
});
