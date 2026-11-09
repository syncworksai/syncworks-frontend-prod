import React,{useMemo,useState} from "react";
import {MessageCircle,LogOut,Send,Trophy,X} from "lucide-react";
import {displayMoney} from "../../games/drop357Table.mjs";
import {sessionKey,clubSummary} from "../../games/cardClubSessions.mjs";
import "./PokerSessionBar.css";

// Session-only UI. Never implies shared chat or synchronized balances across devices.
export function rankedPokerPlayers(players,stacks){
 return (players||[]).map((p,i)=>({id:p.id??String(i),name:p.name||"Player "+(i+1),net:(Number(stacks?.[i]??p.chips??0)-Number(p.chips??0)),stack:Number(stacks?.[i]??p.chips??0),seat:i}))
  .sort((a,b)=>b.net-a.net||b.stack-a.stack||a.seat-b.seat);
}
const KEY="sw_poker_chat_local_v1_";
export default function PokerSessionBar({players=[],stacks=[],groupId="",roomId="",gameNumber=1,onEnd}){
 const [chatOpen,setChatOpen]=useState(false),[confirmEnd,setConfirmEnd]=useState(false),[draft,setDraft]=useState("");
 const storageKey=KEY+String(groupId||"practice")+"_"+String(roomId||"local");
 const [messages,setMessages]=useState(()=>{try{const entries=JSON.parse(sessionStorage.getItem(storageKey)||"[]");return Array.isArray(entries)?entries.slice(-50):[];}catch{return [];}});
 const ranked=useMemo(()=>{
   if(!groupId)return [];
   try{const saved=JSON.parse(localStorage.getItem(sessionKey(groupId))||"null");return saved?.sessions?clubSummary(saved.sessions,saved.aliases||{}).map(p=>({id:p.player,name:p.player,net:p.net})):[];}catch{return [];}
 },[groupId,gameNumber]);
 function send(e){
  e.preventDefault();const msg=draft.trim();if(!msg||msg.length>300)return;
  const sender=players.find(p=>p.kind!=="computer")?.name||"You";
  const updated=[...messages,{id:Date.now().toString(),sender,message:msg}].slice(-50);
  setMessages(updated);setDraft("");
  try{sessionStorage.setItem(storageKey,JSON.stringify(updated));}catch{/* Local session storage unavailable */ }
 }
 return <>
 <div className="sw-poker-session-strip" aria-label="Poker session controls">
  <button type="button" className="sw-poker-top-mini danger" onClick={()=>setConfirmEnd(true)} title="End local practice session"><LogOut size={14}/> End</button>
  <div className="sw-poker-leader-marquee" aria-label="Club historical leaderboard on this device" title="Group lifetime totals from locally entered club session history, not this current practice session">
   <div className="sw-poker-leader-track"><span className="sw-poker-leader-heading"><Trophy size={13}/> Club History · This Device</span>
    {ranked.length?ranked.slice(0,5).map((p,i)=><span key={p.id} className="sw-poker-leader-entry"><strong>#{i+1}</strong> {p.name} <b>{p.net>=0?"+":""}{displayMoney(p.net)}</b></span>):<span>No club history saved here yet</span>}
   </div>
  </div>
  <button type="button" className="sw-poker-top-mini chat" onClick={()=>setChatOpen(true)} aria-label="Open local table chat" title="Local table chat"><MessageCircle size={17}/></button>
 </div>
 {chatOpen&&<div className="sw-poker-session-shade" onClick={()=>setChatOpen(false)}>
  <section role="dialog" aria-modal="true" aria-label="Poker table chat" className="sw-poker-session-chat" onClick={e=>e.stopPropagation()}>
   <header><div><strong><MessageCircle size={17}/> Table Chat</strong><small>Local practice only · not delivered to other phones</small></div><button type="button" aria-label="Close chat" onClick={()=>setChatOpen(false)}><X size={20}/></button></header>
   <div className="sw-poker-chat-messages">{messages.length?messages.map(m=><div key={m.id} className="sw-poker-chat-bubble"><small>{m.sender}</small><p>{m.message}</p></div>):<p className="sw-poker-chat-empty">No messages yet. Notes written here stay on this device during this practice session.</p>}</div>
   <form onSubmit={send} className="sw-poker-chat-compose"><input type="text" aria-label="Chat message" maxLength={300} placeholder="Message your table…" value={draft} onChange={e=>setDraft(e.target.value)}/><button type="submit" disabled={!draft.trim()} aria-label="Send local chat note"><Send size={19}/></button></form>
  </section>
 </div>}
 {confirmEnd&&<div className="sw-poker-session-shade" onClick={()=>setConfirmEnd(false)}><section role="dialog" aria-modal="true" aria-label="End practice session" className="sw-poker-session-confirm" onClick={e=>e.stopPropagation()}><strong>End this poker session?</strong><p>Leave the local practice table and return to your card club. This does not close a shared room, settle money, or end anyone else's game. Current local hand progress will be discarded.</p><div><button type="button" onClick={()=>setConfirmEnd(false)}>Keep playing</button><button type="button" className="danger" onClick={onEnd}>End session</button></div></section></div>}
 </>;
}
