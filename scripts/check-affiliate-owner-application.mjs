import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const qr=readFileSync("src/components/sbo/SboBusinessQr.jsx","utf8");
const form=readFileSync("src/components/sbo/SboAffiliateApplication.jsx","utf8");
const admin=readFileSync("src/pages/platform/AffiliateApplicationReview.jsx","utf8");
const god=readFileSync("src/pages/platform/GodModeAffiliates.jsx","utf8");

test("Business QR links to an owner application form rather than issuing a code",()=>{
 assert.match(qr,/Apply to Become an Affiliate/);
 assert.match(qr,/SboAffiliateApplication/);
 assert.match(form,/submitAffiliateApplication/);
 assert.doesNotMatch(form,/createGodModeAffiliate/);
});
test("Signup captures scaling strategy and is agreement gated",()=>{
 for(const s of ["Primary channel:","Audience:","Estimated monthly business referrals:","Scaling plan:"])assert.ok(form.includes(s));
 assert.match(form,/platform-affiliates\/agreement\//);
 assert.match(form,/accepted_agreement:true/);
 assert.match(form,/disabled=\{!agreement\?\.body\|\|!form\.accepted\|\|submitting\}/);
 assert.match(form,/has_affiliate_profile/);
});
test("God Mode can approve or deny submitted applications with notes",()=>{
 assert.match(god,/AffiliateApplicationReview/);
 assert.match(admin,/getGodModeAffiliates/);
 assert.match(admin,/getGodModeAffiliateDetail/);
 assert.match(admin,/updateGodModeAffiliate/);
 assert.match(admin,/status==="DEACTIVATED"/);
 assert.match(admin,/status==="ACTIVE"/);
 assert.match(admin,/Enter a reason to deny/);
});
