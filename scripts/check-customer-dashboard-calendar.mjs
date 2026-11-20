import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const home=readFileSync("src/components/customer/ImmersiveWorkspaceHome.jsx","utf8");
const widget=readFileSync("src/components/customer/CustomerScheduleWidget.jsx","utf8");
const css=readFileSync("src/components/customer/CustomerScheduleWidget.css","utf8");
const cta=readFileSync("src/components/customer/AutomationDiscoverCTA.jsx","utf8");
const theme=readFileSync("src/components/customer/AutomationDiscoverCTA.css","utf8");

test("Customer welcome includes live calendar preview rather than a disconnected demo",()=>{
 assert.match(home,/<CustomerScheduleWidget\s*\/>/);
 assert.match(widget,/fetchPersonalCalendarEvents/);
 assert.match(widget,/sw:calendar-updated/);
});
test("Day Week Month List and bounded month grid are accessible",()=>{
 for(const view of ['"day"','"week"','"month"','"list"'])assert.ok(widget.includes(view));
 assert.match(widget,/length:42/);
 assert.match(widget,/role="grid"/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/height:100dvh/);
});
test("Calendar create edit remove use existing authorized endpoints and verify server writes",()=>{
 assert.match(widget,/api\.post\("\/personal-calendar\/events\/",payload\)/);
 assert.match(widget,/api\.patch\(\x60\/personal-calendar\/events\/\$\{editing\.id\}\/\x60,payload\)/);
 assert.match(widget,/api\.post\(\x60\/personal-calendar\/events\/\$\{editing\.id\}\/cancel\/\x60\)/);
 assert.match(widget,/await api\.get\(\x60\/personal-calendar\/events\/\$\{id\}\/\x60\)/);
 assert.match(widget,/window\.confirm/);
});
test("AI banner is theme-aware and does not hardcode blue-purple background",()=>{
 assert.match(cta,/sw-automation-discover/);
 assert.doesNotMatch(cta,/from-\[#082b45\]/);
 assert.match(theme,/--sw-lobby-glass/);
 assert.match(theme,/--sw-workspace-accent/);
 assert.match(theme,/data-workspace-theme="light"/);
});
