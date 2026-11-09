// Club-local virtual poker stats; never handles or represents real-money settlement.
export const virtualStatsKey=id=>"sw-poker-club-virtual-sessions-v1-"+String(id||"practice");
export function buildPracticeSummary({players,stacks,rebuyCounts={},cashouts=[],pot=0,gameCount=1,date=new Date().toISOString().slice(0,10),id=null}){
 if(!Array.isArray(players)||!Array.isArray(stacks)||players.length!==stacks.length)throw Error("Invalid virtual practice session.");
 const rows=players.map((p,i)=>{
  const rebuys=rebuyCounts[i]||0;
  if(!Number.isInteger(rebuys)||rebuys<0||rebuys>4)throw Error("Invalid rebuy count.");
  const buyinCents=Number(p.chips??2000);
  const contributedCents=buyinCents+rebuys*2000;
  const cashoutCents=cashouts.filter(x=>x.seat===i).reduce((sum,x)=>sum+x.chips,0);
  const remainingCents=stacks[i];
  if(![buyinCents,contributedCents,cashoutCents,remainingCents].every(v=>Number.isSafeInteger(v)&&v>=0))throw Error("Invalid chip balances.");
  const payoutCents=cashoutCents+remainingCents;
  return {id:String(p.id??i),name:p.name,kind:p.kind,buyinCents,rebuyCents:rebuys*2000,payoutCents,netCents:payoutCents-contributedCents,rebuys};
 });
 return {id:id||"practice-"+Date.now()+"-"+Math.random().toString(36).slice(2),date,gameCount,rows,remainingPotCents:pot,kind:"virtual",createdAt:new Date().toISOString()};
}
export function savePracticeSummary(groupId,summary){
 const key=virtualStatsKey(groupId);
 const prev=JSON.parse(localStorage.getItem(key)||"[]");
 const rows=Array.isArray(prev)?prev:[];
 localStorage.setItem(key,JSON.stringify([...rows.filter(old=>old.id!==summary.id),summary]));
 return true;
}
export function practiceLifetime(sessions){
 const all=new Map();
 for(const s of sessions)for(const r of s.rows||[]){
  const k=String(r.id||r.name).toLowerCase();
  const old=all.get(k)||{name:r.name,nights:0,spent:0,received:0,net:0};
  old.nights+=1;old.spent+=r.buyinCents+r.rebuyCents;old.received+=r.payoutCents;old.net+=r.netCents;
  all.set(k,old);
 }
 return [...all.values()].sort((a,b)=>b.net-a.net);
}
