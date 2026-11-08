import test from "node:test";
import assert from "node:assert/strict";
import {rotationAfterPot,chooseVirtualDealer,GAME_CHOICES} from "./pokerDealerRotation.mjs";
test("fully dragged pot ends game and passes dealer",()=>{
 assert.deepEqual(rotationAfterPot({potCents:0,dealer:0,playerCount:4}),{gameFinished:true,nextDealer:1});
 assert.deepEqual(rotationAfterPot({potCents:0,dealer:3,playerCount:4}),{gameFinished:true,nextDealer:0});
});
test("a replacement pot keeps the same dealer and game",()=>{
 assert.deepEqual(rotationAfterPot({potCents:100,dealer:0,playerCount:4}),{gameFinished:false,nextDealer:0});
});
test("virtual dealer randomly selects supported game and ante in practice",()=>{
 const low=chooseVirtualDealer(()=>0);
 assert.deepEqual(low,{game:"357",ante:"0.25"});
 const high=chooseVirtualDealer(()=>0.9999);
 assert.equal(high.game,"queen-follower");
 assert.equal(high.ante,"1.00");
 assert.equal(GAME_CHOICES.length,5);
});
