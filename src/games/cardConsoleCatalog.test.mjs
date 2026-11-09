import test from "node:test";
import assert from "node:assert/strict";
import {CARD_CONSOLE_GAMES,CARD_GAME_CATEGORIES,getCardConsoleGame,isPlayableCardConsoleGame,compactHandLayout} from "./cardConsoleCatalog.mjs";

test("every catalog game has one valid category, status and unique ID",()=>{
 const ids=CARD_CONSOLE_GAMES.map(game=>game.id);
 assert.equal(new Set(ids).size,ids.length);
 const categories=new Set(CARD_GAME_CATEGORIES.map(category=>category.id));
 for(const game of CARD_CONSOLE_GAMES){
  assert.ok(categories.has(game.category));
  assert.ok(["practice","prototype","planned"].includes(game.status));
  assert.ok(game.minPlayers<=game.maxPlayers);
  assert.equal(game.status==="planned",game.route===null);
 }
});
test("planned card games cannot be launched before a real engine is written",()=>{
 assert.equal(isPlayableCardConsoleGame("gin-rummy"),false);
 assert.equal(isPlayableCardConsoleGame("phase-race"),false);
 assert.equal(isPlayableCardConsoleGame("bozo"),true);
 assert.equal(getCardConsoleGame("nonexistent"),null);
});
test("seven cards fit a 320px-wide phone without overflowing horizontally",()=>{
 const {cardWidth,gap}=compactHandLayout({cardCount:7,viewportWidth:320,availableHeight:90,gap:4});
 assert.ok(cardWidth*7+gap*6<=320-24);
 assert.ok(cardWidth>=20);
});
