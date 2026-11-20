import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync("src/pages/CustomerBusinessCards.jsx","utf8");
const css=readFileSync("src/pages/RolodexCompact.css","utf8");

test("Saved providers become compact, paginated horizontal cards",()=>{
 assert.match(page,/sw-rolo-card/);
 assert.match(page,/filteredItems\.slice\(page\*pageSize/);
 assert.match(page,/Schedule a Call/);
 assert.match(page,/Reviews/);
 assert.match(page,/More/);
 assert.match(css,/grid-template-columns:112px minmax\(0,1fr\) 132px/);
 assert.match(css,/\.sw-rolo-list\{[^}]*overflow-y:auto/);
});
test("Broken and missing logos have a fallback, and relative API media URLs are resolved",()=>{
 assert.match(page,/onError=\{\(\)=>setFailed\(true\)\}/);
 assert.match(page,/sw-rolo-logo-fallback/);
 assert.match(page,/api\.defaults\.baseURL/);
 assert.match(css,/object-fit:contain/);
});
test("Phone/email request never pretends to confirm an appointment",()=>{
 assert.match(page,/tel:/);
 assert.match(page,/mailto:/);
 assert.match(page,/no appointment is confirmed automatically/);
 assert.match(page,/bookAgain\(opened\)/);
});
test("No fictional star ratings, reviews or unauthorized submission",()=>{
 assert.match(page,/No verified rating available/);
 assert.match(page,/not available through this Rolodex API yet/);
 assert.doesNotMatch(page,/api\.post\([^)]*reviews/);
});
test("Theme and single screen drawers are respected",()=>{
 assert.ok(css.includes("modern-dark.webp"));
 assert.match(css,/sw-rolo-compact-main\{[^}]*overflow:hidden!important/);
 assert.match(css,/\.sw-rolo-drawer\{[^}]*height:100dvh/);
 assert.match(page,/e\.key==="Escape"/);
});
