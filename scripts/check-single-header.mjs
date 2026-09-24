import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const page of [
  "src/pages/Connect.jsx",
  "src/pages/SocialGroupDashboard.jsx",
  "src/pages/SportsTeamManagerDashboard.jsx",
  "src/pages/SportsPlayerDashboard.jsx",
  "src/pages/SoftballGameDayAdvanced.jsx",
]) {
  assert.ok(!read(page).includes("<ModeBar"), `${page} must not render a second top bar`);
}

const protectedRoute = read("src/components/ProtectedRoute.jsx");
assert.ok(protectedRoute.includes("<GlobalModeBar />"), "Protected routes must own the top bar");

const globalModeBar = read("src/components/navigation/GlobalModeBar.jsx");
assert.ok(globalModeBar.includes("data-syncworks-global-header"), "Identify the global header");
assert.ok(
  globalModeBar.includes('location.pathname.startsWith("/connect/")'),
  "Social and Sports routes must display the global notification bell",
);
assert.ok(globalModeBar.includes("<NotificationsBell inline"), "Keep the global bell");

console.log("Single-header regression checks passed for Social, Groups, Sports and Game Book.");
