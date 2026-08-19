import React from "react";
import { MessageCircleMore } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Connect from "./Connect";

export default function ConnectWithChat() {
  const nav = useNavigate();
  return <div className="relative">
    <Connect />
    <button type="button" onClick={() => nav("/connect/chat")} className="fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom))] right-4 z-[80] inline-flex min-h-12 items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300 px-4 text-sm font-black text-slate-950 shadow-[0_16px_50px_rgba(34,211,238,.22)] sm:right-6">
      <MessageCircleMore className="h-5 w-5"/>Open Chat
    </button>
  </div>;
}
