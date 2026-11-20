import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync("src/pages/MyConnectQR.jsx","utf8");
const css=readFileSync("src/pages/MyQrWallet.css","utf8");
const code=readFileSync("src/utils/businessQrCodes.mjs","utf8");

test("QR wallet keeps social QR distinct from a real issued business card code",()=>{
  assert.match(page,/connect\?connect=/);
  assert.match(page,/customer\/rolodex\?code=/);
  assert.match(page,/business_card_code/);
  assert.match(page,/validCode\(selected\.code\)/);
  assert.match(page,/\/me\/businesses\//);
  assert.match(code,/export function extractBusinessCardCode/);
});
test("QR wallet never fabricates unavailable codes or exposes admin links",()=>{
  assert.match(page,/Business QR not ready/);
  assert.match(page,/No placeholder code will be shared/);
  assert.doesNotMatch(page,/\/sbo\?business_id=\$\{/);
  assert.match(page,/never private customers|never private|never private customers/i);
});
test("Businesses are selected by stable ID with separate previous/next controls",()=>{
  assert.match(page,/value=\{selected\?\.id\|\|""\}/);
  assert.match(page,/setSelectedIndex/);
  assert.match(page,/Previous business/);
  assert.match(page,/Next business/);
});
test("Theme-aware single-viewport layout and direct share options",()=>{
  assert.match(page,/QRCodeSVG value=\{url\}/);
  assert.match(page,/navigator\.share/);
  assert.match(page,/mailto:/);
  assert.match(page,/sms:/);
  assert.match(css,/\.sw-qr-wallet-main\{height:100%/);
  assert.match(css,/overflow:hidden/);
  assert.ok(css.includes("modern-dark.webp"));
});
