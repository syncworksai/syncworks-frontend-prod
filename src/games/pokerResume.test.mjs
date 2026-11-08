import test from "node:test";
import assert from "node:assert/strict";
import {rememberPokerRoom,readPokerResume,clearPokerResume} from "./pokerResume.mjs";

function withStorage(fn){
 const map=new Map();
 const old=globalThis.localStorage;
 globalThis.localStorage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)||null,removeItem:k=>map.delete(k)};
 try{fn(map);}finally{globalThis.localStorage=old;}
}
test("last room resumes for same authenticated user only",()=>withStorage(()=>{
 const host={id:7},friend={id:11};
 assert.equal(rememberPokerRoom(host,"5","1"),true);
 assert.equal(readPokerResume(host).path,"/customer/games/clubs/room?group=5&room=1");
 assert.equal(readPokerResume(friend),null);
}));
test("logout and explicit leave clear last room",()=>withStorage(()=>{
 const host={id:7};rememberPokerRoom(host,5,1);
 clearPokerResume(host);
 assert.equal(readPokerResume(host),null);
}));
test("non-numeric room and group IDs cannot become navigation links",()=>withStorage(()=>{
 assert.equal(rememberPokerRoom({id:7},"../login","1"),false);
 assert.equal(rememberPokerRoom({id:7},"5","javascript:alert(1)"),false);
 assert.equal(readPokerResume({id:7}),null);
}));
test("room pointers expire instead of redirecting forever",()=>withStorage(map=>{
 const host={id:7};rememberPokerRoom(host,5,1);
 const key="sw_poker_last_room_v1";
 map.set(key,JSON.stringify({...JSON.parse(map.get(key)),at:Date.now()-8*86400000}));
 assert.equal(readPokerResume(host),null);
}));
