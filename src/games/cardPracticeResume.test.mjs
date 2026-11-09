import test from "node:test";
import assert from "node:assert/strict";
import {readPracticeGame,savePracticeGame,clearPracticeGame,listPracticeGames,practiceGamePath} from "./cardPracticeResume.mjs";
const data=new Map();
globalThis.sessionStorage={
 setItem(k,v){data.set(k,String(v));},
 getItem(k){return data.has(k)?data.get(k):null;},
 removeItem(k){data.delete(k);},
 key(i){return [...data.keys()][i]??null;},
 get length(){return data.size;}
};
test("checkpoints restore only within the same account, club and game",()=>{
 data.clear();
 const state={active:true,phase:"choosing",hands:[[{rank:13,suit:"♠"}]],pot:200};
 assert.equal(savePracticeGame("100","12","357",state),true);
 assert.deepEqual(readPracticeGame("100","12","357"),state);
 assert.equal(readPracticeGame("101","12","357"),null);
 assert.equal(readPracticeGame("100","13","357"),null);
 assert.equal(readPracticeGame("100","12","bozo"),null);
});
test("different games have independent resumable checkpoints",()=>{
 data.clear();
 savePracticeGame("100","12","bozo",{active:true,step:"deciding",pot:100});
 savePracticeGame("100","12","357",{active:true,phase:"choosing",pot:200});
 assert.deepEqual(listPracticeGames("100","12").map(x=>x.variant).sort(),["357","bozo"]);
 clearPracticeGame("100","12","357");
 assert.deepEqual(listPracticeGames("100","12").map(x=>x.variant),["bozo"]);
 assert.equal(practiceGamePath("bozo","12"),"/customer/games/variant?group=12&game=bozo");
});
test("completed or old checkpoints are not offered as Continue Game",()=>{
 data.clear();
 savePracticeGame("100","12","357",{active:false});
 assert.equal(listPracticeGames("100","12").length,0);
 savePracticeGame("100","12","fyb",{active:true});
 const key=data.keys().next().value;
 data.set(key,JSON.stringify({...JSON.parse(data.get(key)),updatedAt:Date.now()-90000000}));
 assert.equal(listPracticeGames("100","12").length,0);
});
