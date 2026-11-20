import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, ClipboardList, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

function listOf(payload) {
  return Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];
}
function ticketDescription(item) {
  return ["Support request #"+item.id, item.kind || "OTHER", item.title || "Untitled request", item.body || ""].filter(Boolean).join(" · ");
}
export default function FounderOperationsDesk({ onOpen }) {
  const navigate = useNavigate();
  const [tickets,setTickets] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [selected,setSelected] = useState(null);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const [draft,setDraft] = useState({title:"",module:"Infrastructure",notes:""});
  const load = useCallback(async()=>{
    setLoading(true);setError("");
    try {
      const response = await api.get("/platform/support/requests/?status=OPEN");
      setTickets(listOf(response.data));
    } catch (err) {
      setError(err?.response?.data?.detail || "Support queue unavailable. No assignment status can be confirmed.");
    } finally {setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  const askVictoria=(item)=>{
    const prompt = [
      "Victoria, act as my SyncWorks Chief of Staff. Triage this platform support request:",
      ticketDescription(item),
      "Classify urgency, customer/business impact, the likely responsible specialist, first diagnostic steps and any missing information.",
      "Propose an assignment and next update. Check live records you can actually access; do not claim a ticket was assigned, code was changed, or a customer was contacted.",
      "Keep code changes, customer communications, billing and production deployments behind founder approval."
    ].join("\n");
    navigate("/sync",{state:{victoriaPrompt:prompt}});
  };
  const startHandoff=(item)=>{
    setNotice("");
    setSelected(item);
    setDraft({
      title:(item.kind==="BUG"?"Investigate bug: ":"Review support: ")+(item.title || "Support #"+item.id),
      module:item.kind==="BILLING"?"Finance":item.kind==="FEATURE"?"General":"Infrastructure",
      notes:"Linked support request #"+item.id+" ("+(item.kind || "OTHER")+").\n"+(item.body || "No issue details supplied.")+"\n\nInvestigate and propose a draft fix for approval. Do not auto-merge, deploy, or contact the requester."
    });
  };
  async function submitHandoff(){
    if(!selected || !draft.title.trim() || saving)return;
    const original=selected;
    setSaving(true);setError("");setNotice("");
    try {
      await api.post("/platform/developer-agent/run/",{
        backlog_action:"create",title:draft.title.trim(),notes:draft.notes,
        status:"NEXT",priority:original.kind==="BUG"?"HIGH":"MEDIUM",
        module:draft.module,source:"Support #"+original.id
      });
      setSelected(null);
      setNotice("Developer backlog handoff saved for support #"+original.id+". This is NOT an executed agent job. Review and approve work in Developer Agent.");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create a backlog handoff. Nothing was assigned.");
    } finally {setSaving(false);}
  }
  return <section className="sw-god-opsdesk" aria-label="Founder Operations Desk">
    <div className="sw-god-opsdesk-intro">
      <div><p className="sw-god-eyebrow"><Bot size={14}/> Victoria · Chief of Staff</p><h3>Executive Operations Desk</h3><p>Review live requests, ask Victoria for direction, and approve tracked handoffs. Execution remains gated by your authorization.</p></div>
      <button type="button" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh queue</button>
    </div>
    <div className="sw-god-opsdesk-actions">
      <button type="button" onClick={()=>window.dispatchEvent(new Event("syncworks:victoria-open"))}><Bot size={18}/> Talk with Victoria <ArrowRight size={15}/></button>
      <button onClick={()=>onOpen("requests")}><ClipboardList size={18}/> Open full support queue <ArrowRight size={15}/></button>
      <button onClick={()=>onOpen("developer_agent")}><Bot size={18}/> Review approved developer jobs <ArrowRight size={15}/></button>
      <button onClick={()=>onOpen("__build_backlog")}><CheckCircle2 size={18}/> View tracked handoffs <ArrowRight size={15}/></button>
    </div>
    {notice && <p className="sw-god-opsdesk-success" role="status">{notice}</p>}
    {error && <p className="sw-god-opsdesk-error" role="alert">{error}</p>}
    <div className="sw-god-opsdesk-queue">
      <div className="sw-god-opsdesk-queue-heading"><h4>Open support requests</h4><span>{loading?"Loading…":tickets.length+" returned"}</span></div>
      {!loading && tickets.length===0 && !error && <p className="sw-god-opsdesk-empty">No open requests returned. This does not verify other work queues.</p>}
      {tickets.map(item=><article className="sw-god-opsdesk-ticket" key={item.id}>
        <div className="sw-god-opsdesk-ticket-info"><span>{item.kind || "OTHER"} · #{item.id} · {item.status || "UNKNOWN"}</span><strong>{item.title || "Untitled support request"}</strong><p>{item.body || "No description supplied."}</p></div>
        <div className="sw-god-opsdesk-ticket-actions">
          <button type="button" onClick={()=>askVictoria(item)}>Ask Victoria to triage</button>
          <button type="button" onClick={()=>startHandoff(item)}>Prepare developer handoff</button>
        </div>
      </article>)}
    </div>
    {selected && <div className="sw-god-opsdesk-modal" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setSelected(null);}}>
      <section role="dialog" aria-modal="true" aria-label="Approve developer backlog handoff">
        <div className="sw-god-opsdesk-modal-header"><h4>Prepare handoff · Support #{selected.id}</h4><button onClick={()=>setSelected(null)} disabled={saving} aria-label="Cancel handoff">✕</button></div>
        <p>Creates a permanent backlog item. It does not launch a bot, change code, mark the support ticket resolved, or notify its requester.</p>
        <label>Assignment title<input value={draft.title} maxLength={180} onChange={e=>setDraft(x=>({...x,title:e.target.value}))}/></label>
        <label>Owner module<select value={draft.module} onChange={e=>setDraft(x=>({...x,module:e.target.value}))}><option>Infrastructure</option><option>Finance</option><option>General</option><option>Business</option><option>SYNC Assistant</option></select></label>
        <label>Diagnostic instructions<textarea value={draft.notes} rows={5} onChange={e=>setDraft(x=>({...x,notes:e.target.value}))}/></label>
        <div className="sw-god-opsdesk-modal-buttons"><button onClick={()=>setSelected(null)} disabled={saving}>Cancel</button><button onClick={submitHandoff} disabled={!draft.title.trim()||saving}>{saving?"Saving…":"Confirm backlog handoff"}</button></div>
      </section>
    </div>}
    <p className="sw-god-opsdesk-disclosure"><ShieldAlert size={15}/> WhatsApp alerts, autonomous ticket assignment, unsupervised code execution, and proactive scheduled briefings require additional backend integrations and approval controls; they are not enabled by this screen.</p>
  </section>;
}
