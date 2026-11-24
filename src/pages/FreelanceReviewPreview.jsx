import React,{useEffect,useState} from "react";
import api from "../api/client";
import {CheckCircle2,AlertTriangle,Eye,ShieldCheck,Loader2} from "lucide-react";
import "./FreelanceReviewPreview.css";

/* The review API never needs an approved download and returns only synthetic output.
 * Reviewer can inspect actual rows, deterministic receipt and six quality checks.
 */
export default function FreelanceReviewPreview({job,onApproved,onClose}){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true;
  setLoading(true);setError("");setData(null);
  api.get("/sync-ai/freelance/pilot/synthetic-jobs/"+job.id+"/preview/").then(res=>{if(active)setData(res.data)}).catch(e=>{if(active)setError(e.response?.data?.detail||"Cannot inspect the output. Do not approve.")}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[job.id]);
 const approve=async()=>{
  if(!data?.all_passed||busy||job.state!=="REVIEW")return;
  setBusy(true);setError("");
  try{
   await api.post("/sync-ai/freelance/pilot/synthetic-jobs/"+job.id+"/",{decision:"approve"});
   await onApproved();
  }catch(e){setError(e.response?.data?.detail||"Approval failed. Review the recorded job status.")}finally{setBusy(false)}
 };
 return <div className="sw-review" aria-label="Inspect synthetic output before approval">
  <div className="sw-review-heading"><div><strong><Eye size={15}/> Output inspection</strong><p>Actual cleaned rows · synthetic demonstration only</p></div><button type="button" className="sw-review-close" onClick={onClose}>Back to job</button></div>
  {loading&&<p className="sw-review-message"><Loader2 size={14}/> Validating output against its execution receipt…</p>}
  {error&&<p className="sw-review-message sw-review-error" role="alert"><AlertTriangle size={14}/>{error}</p>}
  {data&&<><div className="sw-review-gate"><strong>{data.all_passed?<><CheckCircle2 size={16}/> {data.checks.length} automated checks passed</>:<><AlertTriangle size={16}/> Some checks failed</>}</strong><small>Automated checks support review; they do not guarantee accuracy for client work.</small></div>
   <div className="sw-review-checks">{data.checks.map(c=><div key={c.key} className={c.passed?"pass":"fail"}>{c.passed?<CheckCircle2 size={13}/>:<AlertTriangle size={13}/>}<span>{c.label}</span></div>)}</div>
   <div className="sw-review-heading"><div><strong>See the actual spreadsheet</strong><p>First {data.preview_rows.length} of {data.total_rows} cleaned rows{data.tail_rows.length?" · last 3 also shown":""}</p></div><span className="sw-review-pill">{data.total_rows} rows</span></div>
   <div className="sw-review-table-container"><table><thead><tr>{data.columns.map(k=><th key={k}>{k.replaceAll("_"," ")}</th>)}</tr></thead><tbody>{data.preview_rows.map((r,i)=><tr key={"first"+i}>{data.columns.map(k=><td key={k}>{r[k]}</td>)}</tr>)}{data.tail_rows.length>0&&<tr className="sw-review-ellipsis"><td colSpan={data.columns.length}>… other cleaned rows …</td></tr>}{data.tail_rows.map((r,i)=><tr key={"last"+i}>{data.columns.map(k=><td key={k}>{r[k]}</td>)}</tr>)}</tbody></table></div>
   <div className="sw-review-actions">{job.state==="REVIEW"?<button type="button" disabled={!data.all_passed||busy} className="sw-studio-primary" onClick={approve}><ShieldCheck size={15}/>{busy?"Approving…":"Checks passed — approve private download"}</button>:<p className="sw-review-message"><CheckCircle2 size={14}/> Already approved · use Download CSV in the job panel</p>}</div>
  </>}
 </div>;
}
