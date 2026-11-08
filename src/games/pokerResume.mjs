// Remember navigation only. Never store cards, tokens or private room state here.
// Scoped by account so a different signed-in user cannot inherit the former room.
const KEY="sw_poker_last_room_v1";
const LIFETIME=7*24*60*60*1000;
const idOf=user=>String(user?.id??"");
const numeric=value=>/^[1-9]\d*$/.test(String(value||""));
export function rememberPokerRoom(user,groupId,roomId){
 const userId=idOf(user);
 if(!userId||!numeric(groupId)||!numeric(roomId))return false;
 try{localStorage.setItem(KEY,JSON.stringify({userId,groupId:String(groupId),roomId:String(roomId),at:Date.now()}));return true;}catch{return false;}
}
export function readPokerResume(user){
 const userId=idOf(user);if(!userId)return null;
 try{
  const entry=JSON.parse(localStorage.getItem(KEY)||"null");
  if(entry?.userId!==userId||!numeric(entry.groupId)||!numeric(entry.roomId)||!Number.isFinite(entry.at)||Date.now()-entry.at>LIFETIME)return null;
  return {groupId:entry.groupId,roomId:entry.roomId,path:"/customer/games/clubs/room?group="+encodeURIComponent(entry.groupId)+"&room="+encodeURIComponent(entry.roomId)};
 }catch{return null;}
}
export function clearPokerResume(user){
 try{
  const entry=JSON.parse(localStorage.getItem(KEY)||"null");
  if(!user||entry?.userId===idOf(user))localStorage.removeItem(KEY);
 }catch{}
}
