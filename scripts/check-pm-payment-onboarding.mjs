import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(path,"utf8");

test("PM bank setup requires login and is accessible in settings and PM navigation", () => {
  const app = read("src/App.jsx");
  assert.match(app, /path="\/pm\/payment-setup" element=\{<ProtectedRoute><PMCollectionSetup/);
  assert.match(read("src/pages/PmSettings.jsx"), /Payment & Bank Setup/);
  assert.match(read("src/components/pm/PMShell.jsx"), /\/pm\/payment-setup/);
});

test("bank connect only opens Stripe hosted onboarding and no raw bank credentials are collected", () => {
  const page = read("src/pages/PMCollectionSetup.jsx");
  assert.match(page, /\/connect\/express\/start\//);
  assert.match(page, /\/connect\/express\/status\//);
  assert.match(page, /return_to:"\/pm\/payment-setup"/);
  assert.match(page, /https:\/\/connect\.stripe\.com\//);
  assert.doesNotMatch(page, /routing_number|account_number|bank_password/);
});

test("external and manual processor options are explicit and tenant rent charging is not claimed live", () => {
  const page = read("src/pages/PMCollectionSetup.jsx");
  assert.match(page, /STRIPE_CONNECT/);
  assert.match(page, /EXTERNAL/);
  assert.match(page, /MANUAL/);
  assert.match(page, /Online tenant rent collection is currently/);
  assert.match(page, /collection is currently/);
});
