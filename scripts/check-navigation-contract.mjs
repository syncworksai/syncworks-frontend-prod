import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App.jsx");
const main = read("src/main.jsx");

const appRoutes = [...app.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((match) => match[1]);
const directRoutes = [...main.matchAll(/["'](\/[^"']+)["']:\s*</g)].map((match) => match[1]);
const routes = new Set([...appRoutes, ...directRoutes]);

const exactTargets = [
  "/customer", "/customer/tickets", "/customer/inbox", "/customer/finance", "/customer/health",
  "/sbo", "/sbo/inbox", "/sbo/customers", "/sbo/finance", "/sbo/growth", "/sbo/settings",
  "/employee", "/employee/inbox", "/employee/settings",
  "/pm", "/pm/calendar", "/pm/settings", "/pm/properties", "/pm/tenants", "/pm/work-orders",
  "/tenant", "/tenant/settings", "/investor", "/investor/settings",
  "/calendar", "/inbox", "/settings", "/profile", "/upgrade", "/tickets", "/connect", "/connect/sports",
];
for (const target of exactTargets) {
  assert.ok(routes.has(target), `Navigation target ${target} is not registered in App/main routes`);
}

for (const pattern of [
  "/tickets/:id",
  "/connect/groups/:groupId",
  "/connect/groups/:groupId/sports",
  "/connect/groups/:groupId/sports/games/:gameId",
  "/connect/events/:eventId",
]) {
  assert.ok(routes.has(pattern), `Required nested navigation route ${pattern} is missing`);
}

const globalModeBar = read("src/components/navigation/GlobalModeBar.jsx");
for (const token of [
  "parentRouteFor",
  "/connect/groups/",
  "/customer/business-cards",
  "/pm/properties",
  'aria-label="Back to previous SyncWorks section"',
]) {
  assert.ok(globalModeBar.includes(token), `Global protected navigation is missing ${token}`);
}

const drawerContracts = [
  ["src/components/CalendarConnectionsDrawer.jsx", "Close calendar connections"],
  ["src/components/sync/SyncAlertDrawer.jsx", "Close SYNC alerts"],
  ["src/components/platform/growth/GrowthConnectChannelsDrawer.jsx", "Close channel connections"],
  ["src/components/pm/PMPropertyDetailsDrawer.jsx", "Close property details"],
  ["src/components/pm/PMTenantEditOverlay.jsx", "Close tenant editor"],
  ["src/components/pm/Section8CaseModal.jsx", "Close Section 8 case"],
  ["src/components/BusinessCards/AddBusinessCardModal.jsx", "Close add business card"],
  ["src/components/BusinessCards/BarcodeScannerModal.jsx", "Close QR scanner"],
];
for (const [path, label] of drawerContracts) {
  const source = read(path);
  assert.ok(source.includes(`aria-label="${label}"`), `${path} needs a reliable small exit control`);
}

console.log(`Navigation contract passed: ${routes.size} routes checked with core links, parent navigation and drawer exits.`);
