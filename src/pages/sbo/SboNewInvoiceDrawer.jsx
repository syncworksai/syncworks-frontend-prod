import React,{useState} from "react";
import {X,FilePlus2,Paperclip,ReceiptText,Trash2} from "lucide-react";
const money=n=>Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
export default function SboNewInvoiceDrawer({onClose,ready=[],onCreate,busy=false}){
 const [mode,setMode]=useState("sample");
 const [title,setTitle]=useState("Preventive maintenance visit");
 const [amount,setAmount]=useState("325.00");
 const [recipient,setRecipient]=useState("Sample Commercial Customer");
 const [notes,setNotes]=useState("HVAC preventive service and inspection.");
 const [files,setFiles]=useState([]);
 const [ticketId,setTicketId]=useState("");
 const valid=Number.isFinite(Number(amount))&&Number(amount)>0&&title.trim();
 return <div className="sw-invoice-new-shade" onMouseDown={onClose}><aside className="sw-invoice-new-drawer" role="dialog" aria-modal="true" aria-label="Create invoice draft" onMouseDown={e=>e.stopPropagation()}>
  <header><div><span>FINANCE · INVOICING</span><h2>New invoice</h2></div><button type="button" onClick={onClose} aria-label="Close new invoice"><X size={21}/></button></header>
  <div className="sw-invoice-new-options"><button type="button" aria-pressed={mode==="sample"} onClick={()=>setMode("sample")}>Sample draft</button><button type="button" aria-pressed={mode==="real"} onClick={()=>setMode("real")}>From completed ticket</button></div>
  {mode==="sample"?<>
   <p className="sw-invoice-new-warning">Presentation-only draft. Attachments remain on this device for preview. Nothing is stored in SyncWorks, billed or sent.</p>
   <label>Customer<input value={recipient} onChange={e=>setRecipient(e.target.value)}/></label>
   <label>Service / title<input value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Amount (USD)<input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
   <label>Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}/></label>
   <label className="sw-invoice-new-file"><Paperclip size={17}/> Attach a document or photo<input type="file" multiple accept="image/*,.pdf,.csv,.xlsx,.doc,.docx" onChange={e=>setFiles(a=>[...a,...Array.from(e.target.files||[])])}/></label>
   {files.map((f,i)=><div key={i} className="sw-invoice-new-attachment">{f.name} <button type="button" onClick={()=>setFiles(list=>list.filter((_,index)=>index!==i))} aria-label={"Remove "+f.name}><Trash2 size={15}/></button></div>)}
   <div className="sw-invoice-new-preview"><span>INVOICE · SAMPLE · NOT ISSUED</span><strong>{recipient||"Customer"}</strong><p>{title||"Service"} · {notes||"No notes"}</p><strong>{money(amount)}</strong><small>{files.length} attachment(s) selected · not uploaded</small></div>
  </>:<>
   <p className="sw-invoice-new-warning">Creates a real, unsent invoice draft for a completed ticket in the currently selected business. It will appear in financial records. No email is sent until you explicitly send it.</p>
   {ready.length?<><label>Completed job<select value={ticketId} onChange={e=>setTicketId(e.target.value)}><option value="">Select a completed job</option>{ready.map(t=><option key={t.ticket_id||t.id} value={t.ticket_id||t.id}>{t.ticket_code||"Ticket "+(t.ticket_id||t.id)} · {t.title||"Service"} · {t.customer_name||"Customer"}</option>)}</select></label>
   <button type="button" className="sw-invoice-new-create" disabled={busy||!ticketId} onClick={()=>onCreate(Number(ticketId))}><FilePlus2 size={16}/> {busy?"Creating…":"Create unsent invoice draft"}</button></>:<p>No eligible completed tickets are currently loaded. Refresh the Invoice Center or open the job board to complete a ticket first.</p>}
  </>}
  <button type="button" className="sw-invoice-new-cancel" onClick={onClose}>{mode==="sample"?"Close sample preview":"Cancel"}</button>
 </aside></div>;
}
