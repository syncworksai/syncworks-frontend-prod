import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sbo=readFileSync("src/components/sbo/SboCompactOffice.jsx","utf8");
const dock=readFileSync("src/components/sync/BusinessAssistantDock.jsx","utf8");
const launcher=readFileSync("src/components/sync/SyncAssistantLauncher.jsx","utf8");
const quick=readFileSync("src/components/sync/BusinessAgentQuickChat.jsx","utf8");

test("SBO desktop and mobile bot portraits use the actual pilot roster and open specialist drawers",()=>{
  assert.match(sbo,/getPilotAgentsForUser\(user,AVATARS\)/);
  assert.match(sbo,/agents\.map\(agent=>/);
  assert.match(sbo,/syncworks:business-agent-open/);
  assert.match(sbo,/onClick=\{\(\)=>openAgent\(agent\)\}/);
});
test("Persistent business dock uses the same drawer event",()=>{
  assert.match(dock,/syncworks:business-agent-open/);
  assert.match(launcher,/addEventListener\("syncworks:business-agent-open"/);
  assert.match(launcher,/<BusinessAgentQuickChat/);
  assert.match(launcher,/showChief&&businessAgentId&&!excludedVictoria/);
});
test("Chat is explicitly business-scoped, role-specific and opt-in for paid AI",()=>{
  assert.match(quick,/sendSyncAiMessage\(\{workspace:"business"/);
  assert.match(quick,/getActiveBusinessId/);
  assert.match(quick,/ROLE_SUGGESTIONS/);
  assert.match(quick,/Business health/);
  assert.match(quick,/Next task/);
  assert.match(quick,/AI replies may incur pilot usage/);
});
test("Chat drawer preserves reduced motion, keyboard close and no outer scrolling",()=>{
  const css=readFileSync("src/components/sync/BusinessAgentQuickChat.css","utf8");
  assert.match(css,/height:100dvh/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(quick,/e\.key==="Escape"/);
});
