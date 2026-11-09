// Local-only card-club session accounting: money amounts are historical entries,
// not wallet balances, payments, or proof that anybody has settled with anyone.
export const sessionKey = id => "syncworks-card-club-sessions-preview-v1-"+String(id);
export const money = cents => (Number(cents||0)/100).toLocaleString("en-US",{style:"currency",currency:"USD"});
export function parseMoney(value){
 if(typeof value!=="string"&&typeof value!=="number")return null;
 const text=String(value).trim();
 if(!/^\d+(?:\.\d{1,2})?$/.test(text))return null;
 const c=Math.round(Number(text)*100);
 return Number.isSafeInteger(c)&&c>=0?c:null;
}
export function sessionTotals(session){
 const rows=session?.rows||[];
 const paidIn=rows.reduce((s,r)=>s+Number(r.buyinCents||0)+Number(r.rebuyCents||0),0);
 const paidOut=rows.reduce((s,r)=>s+Number(r.payoutCents||0),0);
 const opening=Number(session.openingPotCents||0),closing=Number(session.closingPotCents||0);
 return {paidIn,paidOut,opening,closing,difference:opening+paidIn-paidOut-closing,balanced:opening+paidIn===paidOut+closing};
}
export function createSession({date,table="Table 1",rows,notes="",openingPotCents=0,closingPotCents=0,source="manual"}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error("Choose a valid session date.");
 if(!Array.isArray(rows)||!rows.length)throw Error("Add at least one player.");
 if(rows.some(r=>!r.player?.trim()||![r.buyinCents,r.rebuyCents,r.payoutCents].every(x=>Number.isSafeInteger(x)&&x>=0)))throw Error("Names and nonnegative amounts are required.");
 const normalized=rows.map(r=>({...r,player:r.player.trim()}));
 if(new Set(normalized.map(r=>r.player.toLowerCase())).size!==normalized.length)throw Error("Each player may appear only once per table.");
 return {id:"session-"+Date.now()+"-"+Math.random().toString(36).slice(2),date,table:table.trim().slice(0,60)||"Table 1",rows:normalized,notes:notes.slice(0,400),openingPotCents,closingPotCents,source,createdAt:new Date().toISOString()};
}
export const suggestedHistory=[
 {date:"2026-11-07",table:"Saturday table",source:"text-message screenshot",notes:"Jake and Russ each rebought $10. Russ payout corrected from $19 to $16. Payout figures exceed recorded buy-ins by $2; verify original text.",rows:[
 {player:"Jake",buyinCents:1000,rebuyCents:1000,payoutCents:2050},
 {player:"Zack",buyinCents:1000,rebuyCents:0,payoutCents:2025},
 {player:"Lilly",buyinCents:1000,rebuyCents:0,payoutCents:525},
 {player:"Russ",buyinCents:1000,rebuyCents:1000,payoutCents:1600}
 ]},
 {date:"2026-09-27",table:"Saturday table",source:"user note",notes:"$20 initial buy-in per player confirmed; participant list, rebuy amounts, and payouts still need transcription. This is a draft only.",defaultBuyinCents:2000,rows:[]},
 {date:"2026-10-10",table:"Saturday table",source:"text-message screenshot",notes:"Provisional: user reports four $20 buy-ins. Text screenshot says Zach $19.25, Huddy $21, Ang. $27.75, Jake $11.25. Payouts short $0.75. Confirm names and opening/closing pot.",rows:[
 {player:"Jake",buyinCents:2000,rebuyCents:0,payoutCents:1125},
 {player:"Zack",buyinCents:2000,rebuyCents:0,payoutCents:1925},
 {player:"Huddy",buyinCents:2000,rebuyCents:0,payoutCents:2100},
 {player:"Angela",buyinCents:2000,rebuyCents:0,payoutCents:2775}
 ]}
];
export function normalizeAlias(name,aliases={}){const key=String(name||"").trim().toLowerCase();const match=Object.keys(aliases).find(a=>a.toLowerCase()===key);return match?aliases[match]:String(name||"").trim();}
export function clubSummary(sessions,aliases={}){
 const result={};
 for(const session of sessions)for(const row of session.rows||[]){
  const player=normalizeAlias(row.player,aliases);
  if(!result[player])result[player]={player,spent:0,received:0,nights:new Set(),tables:new Set()};
  const x=result[player];x.spent+=(row.buyinCents||0)+(row.rebuyCents||0);
  x.received+=row.payoutCents||0;x.nights.add(session.date);x.tables.add(session.table);
 }
 return Object.values(result).map(x=>({player:x.player,spent:x.spent,received:x.received,net:x.received-x.spent,nights:x.nights.size,tables:x.tables.size})).sort((a,b)=>b.net-a.net);
}
