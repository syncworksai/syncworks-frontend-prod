import React,{useCallback,useEffect,useMemo,useState} from "react";
import api from "../api/client";
import {BriefcaseBusiness,Check,Cloud,Coins,RefreshCw,ShieldAlert,Wallet} from "lucide-react";
const ROOT="/sync-ai/freelance/pilot/business-ledger/";
const INITIAL={category:"JOB",title:"Manual Amazon Product Research and Spreadsheet Curation",upwork_job_id:"2124978383444007582",url:"https://www.upwork.com/jobs/~022124978383444007582",status:"APPLIED",expected_gross:"30.00",contract_gross:"0.00",billed_gross:"0.00",paid_gross:"0.00",connects_used:8,connects_unit_cost:"0.00",cash_spent:"0.00",source:"MANUAL",notes:"Confirmed proposal #2124993311948001281 via Upwork in ChatGPT on Nov 23, 2026. Upwork server sync pending; this is a manual record and is NOT a hire or payment."};
const money=x=>Number(x||0).toLocaleString("en-US",{style:"currency",currency:"USD"});
const STATUSES=["SAVED","QUALIFIED","PROPOSAL_DRAFT","APPLIED","VIEWED","INTERVIEW","OFFERED","HIRED","IN_PROGRESS","SUBMITTED","PAID","DECLINED","WITHDRAWN","CLOSED"];
const style={padding:12,borderRadius:11,border:"1px solid var(--uw-border)",background:"var(--uw-inset)",color:"var(--uw-ink)",width:"100%"};
export default function FreelanceCloudLedger(){
 const [records,setRecords]=useState([]),[totals,setTotals]=useState(null),[loading,setLoading]=useState(true),[ready,setReady]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false),[changes,setChanges]=useState({}),[expense,setExpense]=useState({title:"",cash_spent:"",connects_used:"",cost_type:"OTHER"});
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{
   const {data}=await api.get(ROOT);
   setRecords(data.records||[]);setTotals(data.summary||{});setReady(true);setError("");
  }catch(e){
   setReady(false);
   setError(e.response?.status===403?"Founder-only access is not configured for the backend used by this website.":"The secure ledger is not reachable yet. Check the Render deployment and authenticated account.");
  }finally{setLoading(false);}
 },[]);
 useEffect(()=>{refresh();},[refresh]);
 const first=records.find(j=>j.upwork_job_id===INITIAL.upwork_job_id);
 const jobs=useMemo(()=>records.filter(x=>x.category==="JOB"),[records]);
 const expenses=useMemo(()=>records.filter(x=>x.category==="EXPENSE"),[records]);
 const addFirst=async()=>{setBusy(true);setError("");try{await api.post(ROOT,INITIAL);await refresh();}catch(e){if(e.response?.status===409)await refresh();else setError(JSON.stringify(e.response?.data||"Unable to record proposal."));}finally{setBusy(false)}};
 const update=async (id,patch)=>{setBusy(true);setError("");try{await api.patch(ROOT+id+"/",patch);setChanges(p=>({...p,[id]:{}}));await refresh();}catch(e){setError(JSON.stringify(e.response?.data||"Update failed."));}finally{setBusy(false)}};
 const addExpense=async e=>{e.preventDefault();setBusy(true);setError("");try{await api.post(ROOT,{category:"EXPENSE",title:expense.title,cash_spent:expense.cash_spent||"0",connects_used:Number(expense.connects_used||0),cost_type:expense.cost_type,source:"MANUAL"});setExpense({title:"",cash_spent:"",connects_used:"",cost_type:"OTHER"});await refresh();}catch(e){setError(JSON.stringify(e.response?.data||"Unable to save expense."));}finally{setBusy(false)}};
 return <div className="sw-freelance-drawer-stack" aria-label="Secure freelance business ledger">
  <section className="sw-upwork-drawer-card"><div style={{display:"flex",alignItems:"center",gap:9}}><Cloud size={19}/><h3>SyncWorks Cloud Ledger</h3></div><p>Private founder-only data on the SyncWorks backend, once authenticated and enabled. Upwork is not connected to the website; entries are manually recorded and do not establish client acceptance or payout.</p>
   <button type="button" className="sw-upwork-action" onClick={refresh} disabled={busy||loading}><RefreshCw size={14}/> {loading?"Checking connection…":"Refresh ledger"}</button>
   <p style={{color:"var(--uw-muted)",fontSize:12}} aria-live="polite">{ready?"Secure ledger connected":"Not connected"}</p>
  </section>
  {error&&<p role="alert" className="sw-upwork-caution">{error}</p>}
  {ready&&<><div className="sw-upwork-drawer-card"><small>RECORDED BUSINESS TOTALS · MANUAL</small>
   {[["Opportunity value",money(totals?.potential_gross)],["Contracted gross",money(totals?.contracted_gross)],["Billed gross",money(totals?.billed_gross)],["Gross received",money(totals?.received_gross)],["Cash expenses",money(totals?.cash_expenses)],["Recorded net cash",money(totals?.recorded_net_cash)],["Connects units used",totals?.connects_used||0]].map(([key,val])=><div className="sw-upwork-ledger-row" key={key}><span>{key}</span><strong>{val}</strong></div>)}
   </div>
   {!first&&<div className="sw-upwork-drawer-card"><small>FIRST SUBMITTED PROPOSAL</small><h3>{INITIAL.title}</h3><p>Submitted November 23, 2026 · $30 proposed · 8 Connects used. Add this already-verified application to your secured business ledger; no new Upwork application is sent.</p><button className="sw-upwork-action sw-upwork-action-primary" disabled={busy} onClick={addFirst}><BriefcaseBusiness size={15}/> Save first proposal to cloud</button></div>}
   {jobs.map(job=><article key={job.id} className="sw-upwork-drawer-card"><h3>{job.title}</h3><p>Expected {money(job.expected_gross)} · Contracted {money(job.contract_gross)} · Received {money(job.paid_gross)} · Manually entered</p>
    <label className="sw-upwork-field">Internal status
     <select style={style} value={changes[job.id]?.status??job.status??"SAVED"} onChange={e=>setChanges(p=>({...p,[job.id]:{...p[job.id],status:e.target.value}}))}>{STATUSES.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select>
    </label>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
     {[["contract_gross","Contracted gross ($)"],["billed_gross","Billed gross ($)"],["paid_gross","Actually received ($)"],["cash_spent","Cash cost ($)"]].map(([key,label])=><label className="sw-upwork-field" key={key}>{label}<input style={style} type="number" min="0" max="1000000" step="0.01" value={changes[job.id]?.[key]??job[key]??"0"} onChange={e=>setChanges(p=>({...p,[job.id]:{...p[job.id],[key]:e.target.value}}))}/></label>)}
    </div>
    <p className="sw-upwork-caution">Set hired, delivered or paid only after verifying it in Upwork. This screen is NOT a live Upwork feed.</p>
    <button className="sw-upwork-action" type="button" disabled={busy||!Object.keys(changes[job.id]||{}).length} onClick={()=>update(job.id,changes[job.id])}>Save accounting update</button>
   </article>)}
   <form className="sw-upwork-drawer-card" onSubmit={addExpense}><small>BUSINESS EXPENSE</small><h3>Record an actual expense</h3><label className="sw-upwork-field">Description<input style={style} required maxLength={140} value={expense.title} onChange={e=>setExpense(p=>({...p,title:e.target.value}))}/></label>
    <label className="sw-upwork-field">Category<select style={style} value={expense.cost_type} onChange={e=>setExpense(p=>({...p,cost_type:e.target.value}))}>{["OTHER","CONNECTS","UPWORK_FEE","AI","SOFTWARE"].map(s=><option key={s}>{s}</option>)}</select></label>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><label className="sw-upwork-field">Cash spent ($)<input style={style} type="number" min="0" step="0.01" value={expense.cash_spent} onChange={e=>setExpense(p=>({...p,cash_spent:e.target.value}))}/></label><label className="sw-upwork-field">Connects spent (units)<input style={style} type="number" min="0" step="1" value={expense.connects_used} onChange={e=>setExpense(p=>({...p,connects_used:e.target.value}))}/></label></div>
    <button className="sw-upwork-action" type="submit" disabled={busy||!expense.title.trim()}><Coins size={15}/> Record expense</button><p>Free Connects usage is not itself a cash expense. Avoid counting an application twice if Connects are recorded on its job record.</p>
   </form>
   {expenses.length>0&&<div className="sw-upwork-drawer-card"><h3>Expense history</h3>{expenses.map(e=><div key={e.id} className="sw-upwork-ledger-row"><span>{e.title}<small>{e.cost_type} · {e.connects_used||0} Connects</small></span><strong>{money(e.cash_spent)}</strong></div>)}</div>}
  </>}
 </div>;
}
