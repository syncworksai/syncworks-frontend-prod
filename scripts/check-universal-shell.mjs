import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { classifySyncWorksRoute as category, usesUniversalWorkspaceStyle } from "../src/components/shell/routePolicy.mjs";

test("special experiences retain their independent design", () => {
  for (const path of ["/customer/games", "/customer/games/table/123", "/customer/card-club", "/customer/forge", "/customer/health"]) {
    assert.notEqual(category(path), "workspace", path);
    assert.equal(usesUniversalWorkspaceStyle(path), false, path);
  }
});
test("all ordinary workspaces use one shell, including direct PM routes", () => {
  for (const path of ["/customer", "/customer/new-request", "/customer/finance", "/calendar", "/tickets", "/sbo/dispatch", "/pm", "/pm/properties", "/sync/assist", "/settings"]) {
    assert.equal(category(path), "workspace", path);
  }
});
test("platform and public entry points remain isolated", () => {
  for (const path of ["/platform", "/god-mode", "/login", "/register", "/onboarding/business"]) {
    assert.notEqual(category(path), "workspace", path);
  }
});
test("single application integration point covers direct routes", () => {
  const entry = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  assert.match(entry, /<UniversalWorkspaceShell>/);
  assert.match(entry, /<UniversalWorkspaceShell>\{routedContent\}<\/UniversalWorkspaceShell>/);
  assert.match(entry, /<UniversalWorkspaceShell>\{pmContent\}<\/UniversalWorkspaceShell>/);
});


test("PM legacy mobile rules must not suppress the v3 command center", () => {
  const css = readFileSync(new URL("../src/components/pm/PMMobileWorkspace.css", import.meta.url), "utf8");
  const cockpit = readFileSync(new URL("../src/pages/PropertyManagerDashboard.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.pm-dashboard-main\[data-pm-mobile-view="overview"\]\s*>\s*:not/);
  assert.match(cockpit, /<section className="pm-v3-cockpit"/);
  assert.match(cockpit, /<div className="pm-v3-legacy"/);
  const design = readFileSync(new URL("../src/components/pm/PMCustomerParityV3.css", import.meta.url), "utf8");
  assert.match(design, /\.pm-v3-legacy\s*\{display:none!important\}/);
});

test("PM Tenant Center has anchored mobile tabs and edit action", () => {
  const jsx = readFileSync(new URL("../src/pages/PMTenants.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/components/pm/PMTenantHubV4.css", import.meta.url), "utf8");
  assert.match(jsx, /className="pm-tenants-tabs"/);
  assert.match(jsx, /data-pm-panel="directory"/);
  assert.match(jsx, /data-pm-panel="create"/);
  assert.match(jsx, /data-pm-panel="owners"/);
  assert.match(css, /\[data-pm-panel\]\[data-pm-active="true"\]/);
  assert.match(css, /overflow-y:auto!important/);
  const editor = readFileSync(new URL("../src/components/pm/PMTenantEditOverlay.jsx", import.meta.url), "utf8");
  assert.match(editor, /sw:pm-edit-tenant/);
});

test("Messages is reachable from Personal and mobile inbox has two views", () => {
  const launcher = readFileSync(new URL("../src/components/customer/CustomerWorkspace.jsx", import.meta.url), "utf8");
  assert.match(launcher, /\["Messages","\/customer\/inbox",Inbox\]/);
  const inbox = readFileSync(new URL("../src/pages/InboxPage.jsx", import.meta.url), "utf8");
  assert.match(inbox, /data-sw-inbox-view=/);
  assert.match(inbox, /setMobileConversationOpen\(true\)/);
  assert.match(inbox, /sw-inbox-conversation/);
  const css = readFileSync(new URL("../src/pages/InboxMobileShell.css", import.meta.url), "utf8");
  assert.match(css, /data-sw-inbox-view="list"/);
  assert.match(css, /data-sw-inbox-view="conversation"/);
  assert.match(css, /overflow-y:auto/);
});
