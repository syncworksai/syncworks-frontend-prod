import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sbo=readFileSync("src/components/sbo/SboCompactOffice.jsx","utf8");
const qr=readFileSync("src/components/sbo/SboBusinessQr.jsx","utf8");
const css=readFileSync("src/components/sbo/SboBusinessQr.css","utf8");
test("CEO-only launch uses backend-issued ownership role",()=>{
 assert.match(sbo,/selectedBusiness\.is_owner===true/);
 assert.match(sbo,/selectedBusiness\.role/);
 assert.match(sbo,/isBusinessOwner&&showBusinessQr&&<SboBusinessQr/);
});
test("Business QR uses a verified backend code rather than guessed IDs",()=>{
 assert.match(qr,/api\.get\("\/me\/businesses\/"\)/);
 assert.match(qr,/business\?\.business_card_code/);
 assert.match(qr,/validCode\(x\)/);
 assert.match(qr,/customer\/rolodex\?code=/);
 assert.match(qr,/navigator\.share/);
 assert.match(qr,/navigator\.clipboard/);
});
test("Permanent QR is separate from time-limited promo and unimplemented affiliate payout",()=>{
 assert.match(qr,/Expiring a promotion will never disable this business QR/);
 assert.match(qr,/Affiliate attribution, 10% commission accounting and payouts must be verified/);
 assert.doesNotMatch(qr,/referralCode=/);
});
test("Centered mobile-safe popup respects viewport",()=>{
 assert.match(css,/justify-content:center/);
 assert.match(css,/max-height:calc\(100dvh - 36px\)/);
 assert.match(css,/overflow-y:auto/);
});
