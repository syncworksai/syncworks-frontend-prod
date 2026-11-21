import React,{useEffect,useState} from "react";
import {ArrowLeft,CheckCircle2,Send} from "lucide-react";
import api from "../../api/client";
import {getMyAffiliateDashboard,submitAffiliateApplication} from "../../api/platformAffiliates";
import "./SboAffiliateApplication.css";

const CHANNELS=["Personal referrals","Social media","Email newsletter","Website / blog","Local businesses","Community / events","Sales outreach","Other"];
const countChoices=["1–5","6–20","21–50","51–100","100+"];
const safeError=e=>{
  const data=e?.response?.data;
  if(typeof data?.detail==="string")return data.detail;
  if(typeof data==="string")return data;
  if(data&&typeof data==="object")return Object.values(data).flat().map(String).join(" ");
  return e?.message||"Application could not be submitted.";
};
export default function SboAffiliateApplication({businessName,user,onBack}){
  const [profile,setProfile]=useState(null),[agreement,setAgreement]=useState(null),[loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
  const [form,setForm]=useState({name:user?.first_name&&user?.last_name?`${user.first_name} ${user.last_name}`:businessName||"",email:user?.email||"",phone:"",channel:"",audience:"",volume:"",strategy:"",accepted:false});
  useEffect(()=>{
    let active=true;
    Promise.allSettled([getMyAffiliateDashboard(),api.get("/platform-affiliates/agreement/")]).then(([p,a])=>{
      if(!active)return;
      if(p.status==="fulfilled")setProfile(p.value);
      else setError(safeError(p.reason));
      if(a.status==="fulfilled")setAgreement(a.value.data);
      else setError(safeError(a.reason));
      setLoading(false);
    });
    return()=>{active=false;};
  },[]);
  const application=profile?.affiliate;
  const existing=profile?.has_affiliate_profile&&application;
  const update=(key,value)=>setForm(p=>({...p,[key]:value}));
  const submit=async(e)=>{
    e.preventDefault();if(submitting||existing||!agreement?.body||!form.accepted)return;
    setSubmitting(true);setError("");setSuccess("");
    try{
      const payload={
        name:form.name.trim(),email:form.email.trim(),phone:form.phone.trim(),
        referral_strategy:[`Primary channel: ${form.channel}`,`Audience: ${form.audience.trim()}`,`Estimated monthly business referrals: ${form.volume}`,`Scaling plan: ${form.strategy.trim()}`].join("\n"),
        application_notes:`Applicant associated business: ${businessName||"Business owner"}; submitted from SBO owner QR signup. Agreement version displayed: ${agreement.version}.`,
        accepted_agreement:true
      };
      const result=await submitAffiliateApplication(payload);
      setProfile({has_affiliate_profile:true,affiliate:result?.affiliate});
      setSuccess("Application submitted for God Mode review. No commissions or payouts are activated by submitting.");
    }catch(err){setError(safeError(err));}finally{setSubmitting(false);}
  };
  return <section className="sw-sbo-affiliate-apply" aria-label="Affiliate application">
    <div className="sw-sbo-affiliate-intro"><button type="button" onClick={onBack}><ArrowLeft size={16}/> Back to QR</button><div><small>OWNER APPLICATION</small><h3>Become a SyncWorks affiliate</h3><p>Tell us how you plan to grow the SyncWorks network. Applications are reviewed in God Mode.</p></div></div>
    {loading?<p role="status">Loading affiliate application…</p>:existing?<div className="sw-sbo-affiliate-current"><CheckCircle2 size={25}/><h4>Application on file</h4><p>Status: <strong>{application.status==="ACTIVE"?"Approved":application.status==="PENDING"?"Pending review":application.status==="DEACTIVATED"?"Denied or deactivated":application.status}</strong></p><p>Reference: {application.code}</p><p>Existing applications cannot be submitted twice. God Mode controls approval, suspension and deactivation.</p></div>:
    <form onSubmit={submit} className="sw-sbo-affiliate-form">
      <div className="sw-sbo-affiliate-fields"><label>Contact name<input required maxLength={180} autoComplete="name" value={form.name} onChange={e=>update("name",e.target.value)}/></label>
        <label>Email<input required type="email" autoComplete="email" maxLength={254} value={form.email} onChange={e=>update("email",e.target.value)}/></label>
        <label>Phone (optional)<input type="tel" autoComplete="tel" maxLength={32} value={form.phone} onChange={e=>update("phone",e.target.value)}/></label>
        <label>How will you promote SyncWorks?<select required value={form.channel} onChange={e=>update("channel",e.target.value)}><option value="">Choose a channel</option>{CHANNELS.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label>Who is your target audience?<input required maxLength={250} placeholder="e.g., local contractors and property managers" value={form.audience} onChange={e=>update("audience",e.target.value)}/></label>
        <label>Estimated referrals per month<select required value={form.volume} onChange={e=>update("volume",e.target.value)}><option value="">Select range</option>{countChoices.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
      </div>
      <label>How do you plan to scale?<textarea required minLength={20} maxLength={2000} rows={3} placeholder="Describe your approach for reaching and onboarding new businesses…" value={form.strategy} onChange={e=>update("strategy",e.target.value)}/></label>
      <div className="sw-sbo-affiliate-agreement"><strong>{agreement?.title||"Affiliate agreement"}</strong><small>{agreement?.version||"Unavailable"}</small>
        {agreement?.body?<div className="sw-sbo-affiliate-terms" tabIndex={0} aria-label="Affiliate agreement terms">{agreement.body}</div>:<p>Agreement is unavailable. Submission is disabled until the official terms load.</p>}
        <label className="sw-sbo-affiliate-consent"><input type="checkbox" required checked={form.accepted} onChange={e=>update("accepted",e.target.checked)} disabled={!agreement?.body}/> I have read and accept the affiliate agreement.</label>
      </div>
      <button type="submit" disabled={!agreement?.body||!form.accepted||submitting}><Send size={15}/>{submitting?"Submitting…":"Submit application"}</button>
    </form>}
    {error&&<p role="alert" className="sw-sbo-affiliate-error">{error}</p>}
    {success&&<p role="status" className="sw-sbo-affiliate-success">{success}</p>}
  </section>;
}
