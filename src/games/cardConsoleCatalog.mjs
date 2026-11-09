/**
 * SyncWorks Card Console game manifest.
 * "planned" titles are discovery placeholders, never playable routes.
 * Rules implementations remain separate from common table, club, seat and layout UI.
 * Branded commercial games require rights review before publication.
 */
export const CARD_GAME_CATEGORIES=Object.freeze([
 {id:"chance",label:"Luck & Chance",description:"Fast party and drop games where the deal carries most of the suspense."},
 {id:"strategy",label:"Strategy & Rummy",description:"Hand management, drawing, sequencing and thoughtful decisions."},
 {id:"poker",label:"Poker & Casino Classics",description:"Traditional betting-style rules, using virtual chips only."},
 {id:"party",label:"Party & Family",description:"Social card games that do not require pots or wagering."}
]);
export const CARD_CONSOLE_GAMES=Object.freeze([
 {id:"357",name:"3-5-7 Drop",category:"chance",status:"practice",minPlayers:2,maxPlayers:6,handSizes:[3,5,7],layout:"single-row",route:"/customer/games/table",chips:"virtual"},
 {id:"fyb",name:"FYB",category:"chance",status:"practice",minPlayers:2,maxPlayers:6,handSizes:[1],layout:"single-row",route:"/customer/games/fyb",chips:"virtual"},
 {id:"442",name:"4/4/Deuce",category:"chance",status:"practice",minPlayers:2,maxPlayers:6,handSizes:[4],layout:"single-row",route:"/customer/games/442",chips:"virtual"},
 {id:"bozo",name:"Bozo the Clown",category:"chance",status:"practice",minPlayers:2,maxPlayers:6,handSizes:[5,7],layout:"single-row",route:"/customer/games/bozo",chips:"virtual"},
 {id:"queen-follower",name:"Queen & the Follower",category:"poker",status:"prototype",minPlayers:2,maxPlayers:6,handSizes:[7],layout:"single-row",route:"/customer/games/queen-follower",chips:"virtual"},
 {id:"gin-rummy",name:"Gin Rummy",category:"strategy",status:"planned",minPlayers:2,maxPlayers:2,handSizes:[10],layout:"groupable",route:null,chips:"none"},
 {id:"rummy",name:"Rummy",category:"strategy",status:"planned",minPlayers:2,maxPlayers:6,handSizes:[7,10],layout:"groupable",route:null,chips:"none"},
 {id:"texas-holdem",name:"Texas Hold'em",category:"poker",status:"planned",minPlayers:2,maxPlayers:6,handSizes:[2],layout:"community",route:null,chips:"virtual"},
 {id:"blackjack",name:"Blackjack",category:"poker",status:"planned",minPlayers:1,maxPlayers:6,handSizes:[2],layout:"dealer",route:null,chips:"virtual"},
 {id:"shedding",name:"Color & Number Match",category:"party",status:"planned",minPlayers:2,maxPlayers:8,handSizes:[7],layout:"fan",route:null,chips:"none"},
 {id:"phase-race",name:"Sequence & Phase Race",category:"party",status:"planned",minPlayers:2,maxPlayers:6,handSizes:[10],layout:"groupable",route:null,chips:"none"}
]);
export const getCardConsoleGame=id=>CARD_CONSOLE_GAMES.find(g=>g.id===id)||null;
export const isPlayableCardConsoleGame=id=>Boolean(getCardConsoleGame(id)?.route);
export const gameCategory=id=>CARD_GAME_CATEGORIES.find(c=>c.id===id)||null;
export function compactHandLayout({cardCount=7,viewportWidth=390,availableHeight=180,preferredRatio=.69,gap=4}={}){
 const count=Math.max(1,Math.round(cardCount));
 const width=Math.max(1,viewportWidth-24);
 const cardWidth=Math.max(20,Math.min(62,(width-gap*(count-1))/count,availableHeight*preferredRatio));
 const cardHeight=Math.min(availableHeight,cardWidth/preferredRatio);
 return {cardWidth:Math.floor(cardWidth),cardHeight:Math.floor(cardHeight),gap};
}
