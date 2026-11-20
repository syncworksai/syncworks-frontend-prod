import React,{useCallback,useEffect,useMemo,useState} from "react";
import {useAuth} from "../auth/AuthContext";
import api from "../api/client";
import {QRCodeSVG} from "qrcode.react";
import {useNavigate} from "react-router-dom";
import {Copy,Share2,Users,Building2,ShieldCheck,ChevronLeft,ChevronRight,RefreshCw,QrCode,Mail,MessageSquare,ExternalLink} from "lucide-react";
import "./CustomerRolodex.css";
import "./MyQrWallet.css";

const validCode=code=>/^SW-[A-Za-z0-9_-]{8,80}$/.test(String(code||""));
const ownBusiness=b=>({
  id:String(b?.id||b?.business_id||""),
  name:String(b?.name||b?.business_name||"Business").trim(),
  code:String(b?.business_card_code||"").trim(),
  logo:b?.logo_url||"",
  active:b?.is_active!==false,
  isDemo:!!b?.is_demo
});
function readList(data){return Array.isArray(data)?data:Array.isArray(data?.results)?data.results:Array.isArray(data?.value)?data.value:[];}

export default function MyConnectQR(){
  const {user,myBusinesses=[]}=useAuth();
  const navigate=useNavigate();
  const [tab,setTab]=useState("personal");
  const [selectedIndex,setSelectedIndex]=useState(0);
  const [businesses,setBusinesses]=useState(()=>myBusinesses.map(ownBusiness).filter(b=>b.id&&b.active&&!b.isDemo));
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const uid=Number(user?.id||user?.user?.id||0);
  const personalUrl=useMemo(()=>uid?`https://syncworksapp.com/connect?connect=${uid}`:"",[uid]);
  const refresh=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const {data}=await api.get("/me/businesses/");
      setBusinesses(readList(data).map(ownBusiness).filter(b=>b.id&&b.active&&!b.isDemo));
    }catch(e){setError(e?.response?.data?.detail||"Could not refresh your business QR codes. Existing account data is displayed if available.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{refresh();},[refresh]);
  useEffect(()=>{setSelectedIndex(n=>Math.min(n,Math.max(0,businesses.length-1)));},[businesses.length]);
  const selected=businesses[selectedIndex]||null;
  const businessUrl=selected&&validCode(selected.code)?`https://syncworksapp.com/customer/rolodex?code=${encodeURIComponent(selected.code)}`:"";
  const url=tab==="personal"?personalUrl:businessUrl;
  const heading=tab==="personal"?"Personal Connect QR":selected?.name||"Business QR";
  const copy=async(value=url)=>{if(!value)return;try{await navigator.clipboard.writeText(value);setMessage("Link copied.");}catch{setMessage("Copy unavailable on this device.");}};
  const share=async()=>{if(!url)return;try{if(navigator.share){await navigator.share({title:heading,url});}else await copy();}catch(e){if(e?.name!=="AbortError")setMessage("Unable to share. Copy the link instead.");}};
  const inviteText=tab==="personal"?"Connect with me on SyncWorks":`Save ${selected?.name||"this business"} in your SyncWorks Rolodex`;
  return <div className="sw-rolodex-page sw-qr-wallet-page">
    <main className="sw-qr-wallet-main">
      <header className="sw-qr-wallet-header">
        <div><p>SYNCWORKS / MY QR WALLET</p><h1>My QR codes</h1><span>One personal identity. A separate public card for every connected business.</span></div>
        <button type="button" onClick={refresh} disabled={loading} aria-label="Refresh businesses"><RefreshCw size={17} className={loading?"animate-spin":""}/> Refresh</button>
      </header>
      <div className="sw-qr-wallet-tabs" role="tablist" aria-label="QR type">
        <button type="button" role="tab" aria-selected={tab==="personal"} onClick={()=>{setTab("personal");setMessage("");}}><Users size={16}/> Personal</button>
        <button type="button" role="tab" aria-selected={tab==="business"} onClick={()=>{setTab("business");setMessage("");}}><Building2 size={16}/> Businesses <small>{businesses.length}</small></button>
      </div>
      <section className="sw-qr-wallet-content">
        {tab==="business"&&<div className="sw-qr-wallet-selector">
          <div><strong>Business QR wallet</strong><span>{businesses.length? `${selectedIndex+1} of ${businesses.length} connected businesses`:"No active businesses connected"}</span></div>
          <div className="sw-qr-wallet-nav">
            <button type="button" disabled={selectedIndex===0} onClick={()=>setSelectedIndex(x=>x-1)} aria-label="Previous business"><ChevronLeft size={18}/></button>
            <button type="button" disabled={selectedIndex>=businesses.length-1} onClick={()=>setSelectedIndex(x=>x+1)} aria-label="Next business"><ChevronRight size={18}/></button>
          </div>
          {businesses.length>1&&<select aria-label="Choose a business QR" value={selected?.id||""} onChange={e=>{const i=businesses.findIndex(b=>b.id===e.target.value);if(i>=0)setSelectedIndex(i);}}>
            {businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>}
        </div>}
        {tab==="business"&&!selected?<div className="sw-qr-wallet-empty"><Building2 size={32}/><strong>No business QR codes yet</strong><p>Add or connect a business first. Its own public business-card QR can appear here once your account has access.</p><button type="button" onClick={()=>navigate("/sbo")}>Open Business Workspace <ExternalLink size={14}/></button></div>:
         <div className="sw-qr-wallet-preview">
           {url?<div className="sw-myqr-code"><QRCodeSVG value={url} size={194} level="M" includeMargin/></div>:
             <div className="sw-qr-wallet-empty"><QrCode size={29}/><strong>{tab==="personal"?"Account identity is loading":"Business QR not ready"}</strong><p>{tab==="personal"?"Sign in to generate your personal QR.":"This business does not yet have an issued public business-card code. No placeholder code will be shared."}</p></div>}
           <div className="sw-qr-wallet-identity"><small>{tab==="personal"?"SOCIAL CONNECTION":"PUBLIC BUSINESS CARD"}</small><h2>{heading}</h2>
             <p>{tab==="personal"?"Members can request a social connection. You approve who connects.": "Customers scan to view this business's public card and can choose to save it to their Rolodex."}</p>
           </div>
         </div>}
        <div className="sw-qr-wallet-actions">
          <button type="button" disabled={!url} onClick={share}><Share2 size={16}/> Share</button>
          <button type="button" disabled={!url} onClick={()=>copy()}><Copy size={16}/> Copy link</button>
          <a aria-disabled={!url} tabIndex={url?undefined:-1} href={url?`sms:?&body=${encodeURIComponent(inviteText+"\n"+url)}`:undefined}><MessageSquare size={16}/> Text invite</a>
          <a aria-disabled={!url} tabIndex={url?undefined:-1} href={url?`mailto:?subject=${encodeURIComponent(inviteText)}&body=${encodeURIComponent(inviteText+"\n"+url)}`:undefined}><Mail size={16}/> Email invite</a>
        </div>
        {message&&<p role="status" className="sw-qr-wallet-status">{message}</p>}
        {error&&<p role="alert" className="sw-qr-wallet-status sw-qr-wallet-warning">{error}</p>}
      </section>
      <footer className="sw-qr-wallet-footer"><ShieldCheck size={17}/><span>Personal QR connects people. Business QR shares a public profile only—never private customers, property records, invoices, or employee access.</span><button type="button" onClick={()=>navigate("/customer/rolodex")}>Open Rolodex <ChevronRight size={15}/></button></footer>
    </main>
  </div>;
}
