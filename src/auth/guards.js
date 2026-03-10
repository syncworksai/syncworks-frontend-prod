export function getBusinessMember(me) {
  return me?.business_member || me?.businessMember || me?.member || null;
}

export function hasPerm(me, permKey) {
  const bm = getBusinessMember(me);
  if (!bm) return false;
  if (bm.role === "OWNER") return true;
  return !!bm[permKey];
}
