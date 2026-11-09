import test from "node:test";
import assert from "node:assert/strict";
import {saveCardNight,readCardNight,clearCardNight} from "./cardNightTransfer.mjs";
function withStorage(fn){
 const data=new Map(),before=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 try{fn(data)}finally{globalThis.sessionStorage=before}
}
test("virtual chip stacks and dealer survive a switch between games in same club room",()=>withStorage(()=>{
 const s={groupId:"5",roomId:"2",people:[{id:"one",name:"Jake"},{id:"bot",name:"Virtual Player 1"}],stacks:[2525,1475],pot:500,dealer:1,gameNumber:3,capCents:5000};
 assert.equal(saveCardNight(s),true);
 assert.deepEqual(readCardNight("5","2").stacks,[2525,1475]);
 assert.equal(readCardNight("5","2").dealer,1);
 assert.equal(readCardNight("5","3"),null);
 clearCardNight();assert.equal(readCardNight("5","2"),null);
}));
test("discard corrupted session data",()=>withStorage(map=>{
 map.set("sw_card_night_session_v1","bad json");
 assert.equal(readCardNight("5","2"),null);
}));
