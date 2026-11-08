// A Guts game belongs to the current dealer until its pot has been fully
// dragged away. A populated replacement pot stays in that game.
export const GAME_CHOICES=["357","442","bozo","fyb","queen-follower"];
export const PRACTICE_ANTES=["0.25","0.50","1.00"];
export function rotationAfterPot({potCents,dealer,playerCount}){
 if(!Number.isInteger(playerCount)||playerCount<2||!Number.isInteger(dealer))throw Error("Invalid table");
 return {gameFinished:potCents===0,nextDealer:potCents===0?(dealer+1)%playerCount:dealer};
}
export function chooseVirtualDealer(random=Math.random){
 const rng=()=>Math.min(0.999999,Math.max(0,Number(random())||0));
 return {
  game:GAME_CHOICES[Math.floor(rng()*GAME_CHOICES.length)],
  ante:PRACTICE_ANTES[Math.floor(rng()*PRACTICE_ANTES.length)]
 };
}
