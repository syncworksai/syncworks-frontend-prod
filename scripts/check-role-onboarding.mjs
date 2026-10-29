import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read=path=>readFileSync(path,"utf8");

test("public signup chooser links all four roles and keeps secure invite-only claims",()=>{
  const page=read("src/pages/GetStarted.jsx");
  const app=read("src/App.jsx");
  for(const role of ["personal","business","pm","retail","food"]) {
    assert.match(page,new RegExp('key:"'+role+'"'));
  }
  assert.match(page,/\/tenant\/accept/);
  assert.match(page,/\/investor\/accept/);
  for(const role of ["pm","tenant","owner"]) assert.match(page,new RegExp('key:"'+role+'"'));
  assert.match(page,/Property Owner \/ Partner/);
  assert.match(page,/\/onboarding\/property-management/);
  assert.match(page,/\/onboarding\/business/);
  assert.match(page,/invitation code/i);
  assert.match(app,/path="\/get-started" element=\{<GetStarted/);
  assert.match(app,/path="\/onboarding\/business" element=\{<ProtectedRoute><AddBusiness/);
  assert.match(app,/path="\/onboarding\/property-management"/);
});

test("landing page has direct signup CTAs for every role",()=>{
  const login=read("src/pages/Login.jsx");
  assert.match(login,/ONBOARDING_LINKS/);
  for(const role of ["personal","business","pm","retail","food"]) {
    assert.match(login,new RegExp('"'+role+'"'));
  }
  assert.match(login,/to="\/get-started"/);
  assert.match(login,/to=\{`\/register\?role=\$\{role\}`\}/);
});

test("new users create verified personal identity before role, business contact email is distinct",()=>{
  const signup=read("src/pages/Register.jsx");
  assert.match(signup,/startEmailVerification/);
  assert.match(signup,/registration_proof: registrationProof/);
  assert.match(signup,/first_name: account.firstName\.trim\(\)/);
  assert.match(signup,/chosenRole === "tenant"/);
  assert.match(signup,/chosenRole === "owner"/);
  assert.match(signup,/onRoleContinue/);
  assert.match(signup,/businessEmail/);
  assert.match(signup,/business_email: normalizeEmail\(business\.businessEmail\) \|\| normalizeEmail\(email\)/);
  assert.match(signup,/\/auth\/upgrade-to-sbo-promo\//);
  assert.doesNotMatch(signup,/\/business-access-codes\/redeem\//);
});

test("existing account can create separate business without second login or unverified waived subscription",()=>{
  const s=read("src/pages/AddBusiness.jsx");
  assert.match(s,/user\?\.email/);
  assert.match(s,/business_email:companyEmail/);
  assert.match(s,/companyEmail.*personalEmail/);
  assert.match(s,/\/auth\/upgrade-to-sbo-promo\//);
  assert.match(s,/setCreatedId\(id\)/);
  assert.match(s,/subscription code was NOT confirmed/);
  assert.match(s,/\/sbo\/settings\/general\?setup=1/);
});

test("registration opens over the SyncWorks landing page and keeps Personal-first flow",()=>{
  const signup=read("src/pages/Register.jsx");
  const login=read("src/pages/Login.jsx");
  assert.match(signup,/function RegistrationBackdrop/);
  assert.match(signup,/<Login backgroundOnly \/>/);
  assert.match(signup,/role="dialog" aria-modal="true"/);
  assert.match(signup,/aria-label="Select signup type"/);
  assert.match(signup,/roleSignupUrl\(role\)/);
  assert.match(signup,/Step 1: Personal account/);
  assert.match(login,/backgroundOnly = false/);
  assert.match(login,/Onboard a business/);
  assert.match(login,/Service business onboarding/);
  assert.match(signup,/Tenant invitation code/);
  assert.match(signup,/Property Owner \/ Partner invitation code/);
  assert.match(signup,/claimPath\(inviteCode\)/);
  assert.match(signup,/role==="pm" \? isPM/);
  const pm = read("src/pages/PMCompanySetup.jsx");
  assert.match(pm,/\/pm-hub\/workspaces\/current\//);
  const owner = read("src/pages/InvestorAcceptInvite.jsx");
  assert.match(owner,/\/pm-hub\/access\/investors\/accept\//);
  assert.match(owner,/URLSearchParams\(search\)/);
});

test("invitation links survive authentication redirects and preserve signup code",()=>{
  const login=read("src/pages/Login.jsx");
  const protectedRoute=read("src/components/ProtectedRoute.jsx");
  assert.match(protectedRoute,/location\.pathname \+ location\.search/);
  assert.match(login,/location\.state\?\.from/);
  assert.match(login,/inviteRole/);
  assert.match(login,/signupParams\.set\("code", invitedCode\)/);
  assert.match(login,/signupPath=\{signupPath\}/);
  assert.match(login,/nav\(returnTo, \{ replace: true \}\)/);
});
