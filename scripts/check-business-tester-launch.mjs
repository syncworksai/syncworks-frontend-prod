import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("recovery pages are public, password reset accessible from login", () => {
  const app = read("src/App.jsx");
  assert.match(app, /path="\/forgot-password"/);
  assert.match(app, /path="\/reset-password"/);
  assert.match(read("src/pages/Login.jsx"), /to="\/forgot-password"/);
  assert.match(read("src/pages/ForgotPassword.jsx"), /\/auth\/password\/reset\/request\//);
  assert.match(read("src/pages/ResetPassword.jsx"), /\/auth\/password\/reset\/confirm\//);
});

test("change password has one canonical endpoint, no fallback to profile PATCH", () => {
  const profile = read("src/pages/UserProfile.jsx");
  assert.match(profile, /api.post\("\/auth\/change-password\/"\s*,/);
  assert.doesNotMatch(profile, /api.patch\("\/auth\/me\/"\s*,\s*p\)/);
});

test("settings only advance after a successful save and deep-link correctly", () => {
  const settings = read("src/pages/SboSettings.jsx");
  assert.match(settings, /const saved = await saveSettings\(\)/);
  assert.match(settings, /if \(saved\)/);
  assert.match(settings, /setSection\(target\)/);
  const dashboard = read("src/pages/SboDashboard.jsx");
  assert.match(dashboard, /\/sbo\/settings\/general\?\$\{qs\.toString\(\)\}/);
});

test("founder God Mode has a separate tester queue and manual checkpoints", () => {
  const platform = read("src/pages/PlatformDashboard.jsx");
  assert.match(platform, /id: "testers"/);
  assert.match(platform, /<GodModeProspects pilotOnly/);
  const prospects = read("src/pages/platform/GodModeProspects.jsx");
  assert.match(prospects, /pilot_checks/);
  assert.match(prospects, /password_reset/);
  assert.match(prospects, /tester stage/i);
});
