import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(path, "utf8");

test("customer import route requires authenticated session", () => {
  const app = read("src/App.jsx");
  assert.match(app, /path="\/sbo\/customers\/import" element=\{<ProtectedRoute><BusinessCustomerImport/);
});

test("imports never execute until ready and independently confirmed", () => {
  const ui = read("src/pages/sbo/BusinessCustomerImport.jsx");
  assert.match(ui, /\/business-data-imports\/preview\//);
  assert.match(ui, /\.status === "READY"/);
  assert.match(ui, /!accepted/);
  assert.match(ui, /window\.confirm/);
  assert.match(ui, /\/business-data-imports\/\$\{encodeURIComponent\(preview\.id\)\}\/execute\//);
  assert.match(ui, /activeBusinessId/);
  assert.match(ui, /No customer rows have been imported/);
});

test("import links lead from dashboard, settings and Customer 360", () => {
  assert.match(read("src/pages/SboDashboard.jsx"), /onOpenImport=\{\(\) => navigate\("\/sbo\/customers\/import"\)\}/);
  assert.match(read("src/pages/SboSettingsHub.jsx"), /route: "\/sbo\/customers\/import"/);
  assert.match(read("src/pages/sbo/SboCustomers.jsx"), /navigate\("\/sbo\/customers\/import"\)/);
});

test("import limits and no unsolicited invites are clearly disclosed", () => {
  const ui = read("src/pages/sbo/BusinessCustomerImport.jsx");
  assert.match(ui, /5 MB \/ 5,000/);
  assert.match(ui, /does not invite customers or send emails/);
  assert.match(ui, /Existing matches may be updated/);
});
