import React,{useState} from "react";
import {MessageCircle,X,ExternalLink} from "lucide-react";
import {useNavigate} from "react-router-dom";
import MessagePanel from "./MessagePanel";

export default function TicketQuickMessage({ticketId,onClose,title="Ticket messages"}){
 const nav=useNavigate();
 if(!ticketId)return null;
 return <div className="fixed inset-0 z-[100] flex items-end justify-end bg-[#020817]/70 p-2 backdrop-blur-md sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget)onClose?.()}}>
   <section role="dialog" aria-modal="true" aria-label={title} className="flex h-[min(92dvh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-cyan-300/35 bg-[#07172e]/95 p-3 text-white shadow-2xl">
     <header className="flex shrink-0 items-center justify-between gap-3 pb-2"><div className="flex items-center gap-2"><MessageCircle size={18} className="text-cyan-300"/><div><strong className="text-sm">{title}</strong><p className="text-[11px] text-slate-300">Ticket #{ticketId} · shared customer/business conversation</p></div></div><div className="flex items-center gap-2"><button onClick={()=>{onClose?.();nav(`/tickets/${ticketId}`);}} className="rounded-lg border border-cyan-400/30 p-2" title="Open full ticket"><ExternalLink size={16}/></button><button onClick={onClose} aria-label="Close messages" className="rounded-lg border border-white/20 p-2"><X size={18}/></button></div></header>
     <div className="sw-quick-message-scroll min-h-0 flex-1 overflow-y-auto"><MessagePanel ticketId={ticketId} compact subtitle="Send a quick update without leaving the board. Messages also appear in Ticket Detail."/></div>
   </section>
 </div>;
}
