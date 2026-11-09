import test from "node:test";
import assert from "node:assert/strict";
import {safeFeatureRoute,saveFeatureResume,readFeatureResumes,featureForPath,clearFeatureResumes} from "./featureResume.mjs";
const items=new Map();
globalThis.localStorage={
 setItem(k,v){items.set(k,v);},
 getItem(k){return items.get(k)||null;},
 removeItem(k){items.delete(k);}
};
test("records one last route per feature, newest first",()=>{
 items.clear();const now=Date.now();
 assert.equal(saveFeatureResume("u1","/customer/games/bozo","?group=12&room=9",now),true);
 assert.equal(saveFeatureResume("u1","/pm/tenants","",now+100),true);
 assert.equal(saveFeatureResume("u1","/customer/games/table","?group=12",now+200),true);
 assert.deepEqual(readFeatureResumes("u1",now+300).map(x=>x.feature),["cards","property"]);
 assert.equal(readFeatureResumes("u1",now+300)[0].path,"/customer/games/table?group=12");
 assert.equal(readFeatureResumes("u2",now+300).length,0);
});
test("excludes auth, token and freeform query secrets",()=>{
 assert.equal(safeFeatureRoute("/login"),null);
 assert.equal(safeFeatureRoute("//other.example"),null);
 assert.equal(safeFeatureRoute("/social/invite/secret"),null);
 assert.equal(safeFeatureRoute("/customer/games/table","?group=12&token=private&email=me%40test.com&q=private").path,"/customer/games/table?group=12");
 assert.equal(saveFeatureResume("u1","/login"),false);
});
test("identifies most specific route and rejects stale bookmarks",()=>{
 items.clear();const now=Date.now();
 assert.equal(featureForPath("/pm/payments")?.id,"finance");
 assert.equal(featureForPath("/customer/health")?.id,"health");
 saveFeatureResume("u1","/sbo/leads","",now-22*86400000);
 assert.equal(readFeatureResumes("u1",now).length,0);
});
test("home pages are not mistaken for unfinished work",()=>{
 items.clear();
 assert.equal(saveFeatureResume("u1","/customer/games"),false);
 assert.equal(saveFeatureResume("u1","/pm"),false);
 saveFeatureResume("u1","/calendar");
 assert.equal(readFeatureResumes("u1").length,1);
 clearFeatureResumes("u1");assert.deepEqual(readFeatureResumes("u1"),[]);
});
