import React, { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Phone, MessagesSquare, RefreshCcw, ShieldCheck, ExternalLink, PlugZap, Inbox, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import "./SyncAssistCommunicationsMobile.css";
import { useAuth } from "../auth/AuthContext";

const META = "https://business.facebook.com/";
const TWILIO = "https://console.twilio.com/";
const PILOT = "jacoblord7@outlook.com";

export default function SyncAssistCommunications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const pilot = String(user?.email || "").trim().toLowerCase() === PILOT;
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState("whatsapp");
  const [mobileView,setMobileView]=useState("setup");

  async function refresh() {
    setLoading(true);
    try {
      const result = await api.get("/sync-ai/assist/pilot/communications/", { timeout: 15000 });
      setState(result.data); setError("");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load the communications hub. Retry when connected.");
    } finally { setLoading(false); }
  }
  useEffect(() => { if (pilot) refresh(); else setLoading(false); }, [pilot]);
  const channels = [
    { id: "whatsapp", name: "WhatsApp", Icon: MessageCircle, detail: "Meta Business + Twilio sender" },
    { id: "sms", name: "SMS", Icon: MessagesSquare, detail: "Business messaging number" },
    { id: "voice", name: "Phone", Icon: Phone, detail: "AI receptionist & call transfers" },
  ];

  return <main data-mobile-view={mobileView} className="sw-comms-page min-h-dvh bg-[#020617] px-4 pb-36 pt-28 text-white">
    <div className="sw-comms-layout mx-auto max-w-4xl">
      <button onClick={() => navigate("/sync/assist")} type="button" className="mb-4 flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm text-slate-200"><ArrowLeft size={17}/> Control Center</button>
      <header className="sw-comms-hero mb-4 rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-[#0b2138] to-[#140c29] p-5">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">Private pilot</p>
        <h1 className="mt-1 text-2xl font-black">SYNC Communications</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">One inbox for WhatsApp, SMS and phone. Connect a verified number first; all outbound communication is off during setup.</p>
        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-200"><ShieldCheck size={17}/> No automatic messages or calls</div>
      </header>
      {!pilot ? <p role="alert" className="rounded-xl border border-rose-400/40 p-4 text-sm">Private pilot account only.</p> : <>
        {error && <div role="alert" className="mb-3 rounded-xl border border-rose-400/40 p-3 text-sm text-rose-200">{error}</div>}
        <div className="sw-comms-tabs"><button type="button" onClick={()=>setMobileView("setup")} aria-pressed={mobileView==="setup"}>Channels</button><button type="button" onClick={()=>setMobileView("inbox")} aria-pressed={mobileView==="inbox"}>Inbox</button></div>
        <div className="sw-comms-channels mb-3 grid grid-cols-3 gap-2">
          {channels.map(({id,name,Icon}) => <button type="button" key={id} onClick={() => setPanel(id)}
            className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-xs font-black ${panel === id ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-slate-900/50 text-slate-300"}`}>
            <Icon size={22}/>{name}
          </button>)}
        </div>
        <section className="sw-comms-setup mb-4 rounded-2xl border border-cyan-400/20 bg-slate-900/45 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-black">{channels.find(c => c.id === panel)?.name} setup</h2>
            <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[10px] font-bold text-amber-200">
              {loading ? "Checking" : panel === "whatsapp" && state?.whatsapp?.server_credentials_configured ? "Backend configured • Verify sender" : "Not connected"}
            </span>
          </div>
          {panel === "whatsapp" ? <>
            <p className="mt-2 text-sm leading-6 text-slate-300">Connect an existing WhatsApp business number through Meta and Twilio. Personal WhatsApp and WhatsApp Business app numbers may require a different registration or coexistence path; do not disconnect an existing number until verified.</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-white/10 p-3"><strong>1. Meta Business</strong><p className="mt-1 text-xs text-slate-400">Create or select a business portfolio and check you have admin access.</p><a href={META} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cyan-200">Open Meta Business <ExternalLink size={13}/></a></div>
              <div className="rounded-xl border border-white/10 p-3"><strong>2. Twilio sender onboarding</strong><p className="mt-1 text-xs text-slate-400">Register the phone number as a WhatsApp sender and complete the ownership verification.</p><a href={TWILIO} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cyan-200">Open Twilio Console <ExternalLink size={13}/></a></div>
              <div className="rounded-xl border border-white/10 p-3"><strong>3. Connect to SyncWorks</strong><p className="mt-1 text-xs text-slate-400">The pilot uses server-side sender credentials and a signed inbound webhook. An authorized administrator must configure these privately; do not paste credentials into this page or chat.</p></div>
            </div>
          </> : <p className="mt-2 flex gap-2 text-sm text-slate-300"><Info className="h-5 w-5 shrink-0 text-cyan-200"/> {panel === "sms" ? "SMS will share the communications inbox once a verified business messaging number and consent handling are configured." : "Phone calls will require a dedicated voice number, an AI voice agent and clear transfer/escalation controls. This channel is not live yet."}</p>}
        </section>
        <section className="sw-comms-inbox rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-black"><Inbox size={19} className="text-cyan-200"/> Communications inbox</h2>
            <button type="button" onClick={refresh} disabled={loading} className="flex min-h-10 items-center gap-1 rounded-xl border border-cyan-400/30 px-3 text-xs font-bold text-cyan-200 disabled:opacity-50"><RefreshCcw size={14}/> Refresh</button>
          </div>
          {loading ? <p role="status" className="text-sm text-slate-400">Loading inbox…</p> : state?.messages?.length ? <div className="space-y-2">{state.messages.map(message => <article key={message.id} className="rounded-xl border border-white/10 bg-slate-950/60 p-3"><div className="flex justify-between gap-2 text-xs"><strong className="text-cyan-200">{message.from}</strong><span className="text-slate-500">{new Date(message.received_at).toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">{message.body}</p><span className="mt-2 block text-[10px] uppercase tracking-wide text-amber-200">Received · No automatic reply</span></article>)}</div> : <p className="text-sm text-slate-400">No verified inbound messages. Once connected, WhatsApp messages received through your configured sender will appear here.</p>}
        </section>
      </>}
    </div>
  </main>;
}
