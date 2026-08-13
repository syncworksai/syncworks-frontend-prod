import React, { useState } from "react";
import { Loader2, Send } from "lucide-react";

export default function SocialRoomComposer({ canAnnounce, saving, onCreate }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("CHAT");

  async function publish() {
    const value = text.trim();
    if (!value) return;
    await onCreate({ body: value, kind: type });
    setText("");
    setType("CHAT");
  }

  return <section className="sticky bottom-20 mt-3 rounded-[1.5rem] border border-white/10 bg-[#06101d]/95 p-3 shadow-2xl backdrop-blur">
    {canAnnounce ? <div className="mb-2 flex gap-2"><button type="button" onClick={() => setType("CHAT")} className={type === "CHAT" ? "rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase text-slate-950" : "rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase text-slate-400"}>Chat</button><button type="button" onClick={() => setType("ANNOUNCEMENT")} className={type === "ANNOUNCEMENT" ? "rounded-full bg-amber-300 px-3 py-1.5 text-[10px] font-black uppercase text-slate-950" : "rounded-full border border-amber-400/20 px-3 py-1.5 text-[10px] font-black uppercase text-amber-200"}>Announcement</button></div> : null}
    <div className="flex items-end gap-2"><textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add to the room…" className="min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"/><button type="button" disabled={saving || !text.trim()} onClick={publish} className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300 text-slate-950 disabled:opacity-40">{saving ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5"/>}</button></div>
  </section>;
}
