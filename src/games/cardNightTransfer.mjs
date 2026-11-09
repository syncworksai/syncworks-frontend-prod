// Transfer a virtual poker session between local practice game screens.
// Account-only client storage; never stores actual cards, tokens or payment credentials.
const KEY="sw_card_night_session_v1";
export function saveCardNight(state){
 try{sessionStorage.setItem(KEY,JSON.stringify({...state,updatedAt:Date.now()}));return true;}catch{return false;}
}
export function readCardNight(groupId,roomId){
 try{const v=JSON.parse(sessionStorage.getItem(KEY)||"null");
  if(!v||String(v.groupId||"")!==String(groupId||"")||String(v.roomId||"")!==String(roomId||"")||Date.now()-v.updatedAt>86400000||!Array.isArray(v.people)||v.people.length<2||v.people.length>6||!Array.isArray(v.stacks)||v.stacks.length!==v.people.length)return null;
  return v;
 }catch{return null;}
}
export function clearCardNight(){try{sessionStorage.removeItem(KEY);}catch{}}
