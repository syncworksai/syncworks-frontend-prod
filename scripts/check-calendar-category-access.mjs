import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const widget=readFileSync("src/components/customer/CustomerScheduleWidget.jsx","utf8");
const full=readFileSync("src/pages/CalendarPageV3.jsx","utf8");
const css=readFileSync("src/components/customer/CustomerScheduleWidget.css","utf8");
test("category selector exposes personal, business and PM with upgrade fallback",()=>{
  for(const label of ["PERSONAL","BUSINESS","PROPERTY_MANAGEMENT"])assert.ok(widget.includes(label));
  assert.match(widget,/nav\("\/upgrade"\)/);
  assert.match(widget,/canUseBusiness/);
  assert.match(widget,/canUsePm/);
  assert.match(widget,/moduleAccess/);
  assert.match(widget,/myBusinesses/);
});
test("business category requires specific connected membership and name",()=>{
  assert.match(widget,/businessOptions\.some\(b=>b\.id===draft\.businessId\)/);
  assert.match(widget,/business_id:draft\.category==="BUSINESS"\?draft\.businessId:null/);
  assert.match(widget,/business_name:draft\.category==="BUSINESS"/);
});
test("PM and business metadata survive save then full calendar edit",()=>{
  assert.match(widget,/metadata=\{\.\.\.\(editing\?\.metadata\|\|\{\}\)/);
  assert.match(full,/\["BUSINESS","PROPERTY_MANAGEMENT"\]\.includes/);
  assert.match(full,/canCreatePmEvents/);
  assert.match(full,/Upgrade to Property Management/);
});
test("locked options visibly invite upgrade with selected-theme styling",()=>{
  assert.match(widget,/className=\{!option\.allowed\?"locked":""\}/);
  assert.match(widget,/Upgrade ↗/);
  assert.match(css,/\.sw-schedule-category-options button\.locked/);
  assert.match(css,/--sw-workspace-accent/);
});
