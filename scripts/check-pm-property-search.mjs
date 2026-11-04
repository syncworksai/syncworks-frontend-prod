import test from "node:test";
import assert from "node:assert/strict";
import { matchesPMProperty } from "../src/utils/pmPropertySearch.js";

const roxana = {id:1, name:"Roxana", address:"3380 Roxana Road", city:"Montgomery",state:"AL",zip:"36109"};
const chastain = {id:2, name:"Chastain", address:"9073 Chastain Park Dr", city:"Montgomery",state:"AL",zip:"36117"};
test("partial house number and name match in any order", () => {
  assert.equal(matchesPMProperty(roxana, "338 roxana"), true);
  assert.equal(matchesPMProperty(roxana, "roxana 338"), true);
  assert.equal(matchesPMProperty(chastain, "907 chastain"), true);
  assert.equal(matchesPMProperty(chastain, "chastain park 907"), true);
});
test("matches city, ZIP and case-insensitive multiword address", () => {
  assert.equal(matchesPMProperty(roxana, "MONT 36109"), true);
  assert.equal(matchesPMProperty(chastain, "chastain dr"), true);
  assert.equal(matchesPMProperty(roxana, "907 chastain"), false);
});
test("blank search shows all properties; unmatched location does not match", () => {
  assert.equal(matchesPMProperty(roxana, ""), true);
  assert.equal(matchesPMProperty(roxana, "   "), true);
  assert.equal(matchesPMProperty(roxana, "3380 Chicago"), false);
});
