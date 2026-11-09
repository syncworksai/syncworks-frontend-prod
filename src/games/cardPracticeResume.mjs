// On-device virtual-chip practice snapshots only. NEVER use for multiplayer,
// authoritative results, payments, or secrets. Scoped to an authenticated user
// and club, with a short expiry; no cross-account hand restoration.
const PREFIX="sw_card_console_practice_v1:";
const TTL_MS=24*60*60*1000;
const safeId=v=>String(v??"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,90);
const key=(userId,groupId,variant)=>PREFIX+[safeId(userId),safeId(groupId)||"solo",safeId(variant)].join(":");
export function readPracticeGame(userId,groupId,variant){
 if(!userId||!variant)return null;
 try{
  const raw=sessionStorage.getItem(key(userId,groupId,variant));
  if(!raw)return null;
  const value=JSON.parse(raw);
  if(value?.version!==1||value.userId!==String(userId)||value.groupId!==String(groupId||"")||value.variant!==variant||!Number.isFinite(value.updatedAt)||Date.now()-value.updatedAt>TTL_MS||!value.state||typeof value.state!=="object")return null;
  return value.state;
 }catch{return null;}
}
export function savePracticeGame(userId,groupId,variant,state){
 if(!userId||!variant||!state||typeof state!=="object")return false;
 try{sessionStorage.setItem(key(userId,groupId,variant),JSON.stringify({version:1,userId:String(userId),groupId:String(groupId||""),variant,updatedAt:Date.now(),state}));return true;}catch{return false;}
}
export function clearPracticeGame(userId,groupId,variant){if(!userId||!variant)return;try{sessionStorage.removeItem(key(userId,groupId,variant));}catch{}}
export function practiceGamePath(game,groupId){
 const route=game==="357"?"/customer/games/table":"/customer/games/variant";
 const query=new URLSearchParams();
 if(groupId)query.set("group",groupId);
 if(game!=="357")query.set("game",game);
 return route+(query.size?"?"+query.toString():"");
}
export function listPracticeGames(userId,groupId){
 if(!userId)return[];
 try{
  const records=[];
  for(let i=0;i<sessionStorage.length;i++){
   const storedKey=sessionStorage.key(i);
   if(!storedKey?.startsWith(PREFIX))continue;
   let item;try{item=JSON.parse(sessionStorage.getItem(storedKey));}catch{continue;}
   if(item?.version!==1||item.userId!==String(userId)||item.groupId!==String(groupId||"")||Date.now()-item.updatedAt>TTL_MS||item.state?.active!==true)continue;
   records.push({variant:item.variant,groupId:item.groupId,updatedAt:item.updatedAt,phase:item.state.phase||item.state.step||"",path:practiceGamePath(item.variant,groupId)});
  }
  return records.sort((a,b)=>b.updatedAt-a.updatedAt);
 }catch{return[];}
}
