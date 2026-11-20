import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync("src/components/customer/CustomerWorkspace.jsx","utf8");
const css=readFileSync("src/components/customer/CustomerAppsPaged.css","utf8");
test("Apps panel uses pages rather than unbounded list or document scrolling",()=>{
 assert.match(ui,/const appsPerPage=narrowApps\?6:9/);
 assert.match(ui,/apps\.slice\(currentAppsPage\*appsPerPage/);
 assert.match(ui,/Page \{currentAppsPage\+1\} of \{appsPages\}/);
 assert.match(ui,/setAppsPage\(0\)/);
 assert.match(css,/overflow:hidden!important/);
 assert.match(css,/grid-template-rows:repeat\(3/);
});
test("Theme-specific dark surfaces prevent green-gray photo tint",()=>{
 assert.match(ui,/data-workspace-panel=\{panel\}/);
 assert.match(css,/data-office-drawer-theme="modern"/);
 assert.match(css,/background-image:linear-gradient\(140deg,#111722,#080c12\)!important/);
 assert.match(css,/--office-drawer-tile:#141a24/);
});
test("Other workspace views and dedicated games routes are preserved",()=>{
 assert.match(ui,/panel==="apps"\?apps\.slice/);
 assert.match(ui,/visibleApps=panel==="apps"/);
 assert.match(ui,/\["Games","\/customer\/games"/);
 assert.match(ui,/\["The Forge", "\/customer\/forge"/);
});
