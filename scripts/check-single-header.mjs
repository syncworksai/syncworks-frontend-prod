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
  assert.doesNotMatch(read(page), /<ModeBar\\b/, `${page} should not render a second top bar`);
}

const protectedRoute = read("src/components/ProtectedRoute.jsx");
assert.match(protectedRoute, /<GlobalModeBar\\s*\\/>/, "Protected routes own the single header");

const globalModeBar = read("src/components/navigation/GlobalModeBar.jsx");
assert.match(globalModeBar, /data-syncworks-global-header/, "Global header needs an identifying attribute");
assert.match(globalModeBar, /location\\.pathname\\.startsWith\\("\/connect\/"/, "Social and Sports routes must use the global bell");
assert.match(globalModeBar, /<NotificationsBell\\s+inline/, "Global header must retain notifications");

console.log("Single-header regression checks passed for Social, Groups, Sports and Game Book.");
