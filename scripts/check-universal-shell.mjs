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
