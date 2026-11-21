import React,{useEffect,useState} from "react";
import {QRCodeSVG} from "qrcode.react";
import {QrCode,Copy,Share2,X,ExternalLink,Gift,ShieldCheck} from "lucide-react";
import api from "../../api/client";
import "./SboBusinessQr.css";

const validCode=x=>/^SW-[a-zA-Z0-9_-]{8,80}$/.test(String(x||""));
const businessUrl=x=>validCode(x)?`https://syncworksapp.com/customer/rolodex?code=${encodeURIComponent(x)}`:"";
export default function SboBusinessQr({businessId,businessName,onClose}){
  const [info,setInfo]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
  useEffect(()=>{
    let active=true;
    const fetch=async()=>{
      setLoading(true);setError("");setInfo(null);
      if(!businessId){setError("Choose a business workspace to view its QR code.");setLoading(false);return;}
      try{
        // Owner-scoped read; do not derive a public code from the business ID.
        const {data}=await api.get("/me/businesses/");
        const list=Array.isArray(data)?data:Array.isArray(data?.results)?data.results:Array.isArray(data?.value)?data.value:[];
        const business=list.find(b=>String(b.business_id||b.id||b.business?.id)===String(businessId));
        if(!business)throw new Error("This business is not connected to your account.");
        if(active)setInfo(business);
      }catch(e){if(active)setError(e?.response?.data?.detail||e.message||"Business QR unavailable.");}
      finally{if(active)setLoading(false);}
    };
    fetch();
    return()=>{active=false;};
  },[businessId]);
  useEffect(()=>{const onKey=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[onClose]);
  const code=info?.business_card_code||info?.business?.business_card_code||"";
  const url=businessUrl(code);
  const name=info?.name||info?.business_name||businessName||"Your business";
  const copy=async()=>{if(!url)return;try{await navigator.clipboard.writeText(url);setNotice("Business link copied.");}catch{setNotice("Clipboard unavailable; use Share instead.");}};
  const share=async()=>{if(!url)return;try{if(navigator.share)await navigator.share({title:`${name} on SyncWorks`,url});else await copy();}catch(e){if(e?.name!=="AbortError")setNotice("Sharing failed. Try Copy link.");}};
  return <div className="sw-sbo-qr-shade" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section className="sw-sbo-qr-dialog" role="dialog" aria-modal="true" aria-label="Business QR and referral campaigns">
      <header><div><small>BUSINESS IDENTITY</small><h2>Business QR & sharing</h2></div><button type="button" onClick={onClose} aria-label="Close business QR"><X size={19}/></button></header>
      <div className="sw-sbo-qr-body">
        <div className="sw-sbo-qr-preview">{url?<div className="sw-sbo-qr-image"><QRCodeSVG value={url} size={182} includeMargin level="M"/></div>:<div className="sw-sbo-qr-unavailable"><QrCode size={42}/>{loading?"Loading official business code…":error||"Business QR has not been issued yet."}</div>}
          <div><small>PUBLIC BUSINESS CARD</small><h3>{name}</h3><p>Customers scan to see your public provider profile, then choose whether to save it in their Rolodex.</p><div className="sw-sbo-qr-actions"><button type="button" onClick={copy} disabled={!url}><Copy size={15}/> Copy link</button><button type="button" onClick={share} disabled={!url}><Share2 size={15}/> Share QR</button><a aria-disabled={!url} href={url||undefined} tabIndex={url?undefined:-1} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Test link</a></div></div>
        </div>
        {notice&&<p role="status" className="sw-sbo-qr-notice">{notice}</p>}
        <div className="sw-sbo-qr-campaign"><Gift size={20}/><div><strong>Affiliate campaigns & promotions</strong><p>Your permanent business QR stays the same. A future campaign can use a separate referral code, with start/end dates, redemption limits and commission rules. Expiring a promotion will never disable this business QR.</p><p className="sw-sbo-qr-note">Promo expiration and redemption limits already exist in God Mode. Affiliate attribution, 10% commission accounting and payouts must be verified and implemented before referral earnings are advertised.</p></div></div>
        <div className="sw-sbo-qr-disclaimer"><ShieldCheck size={16}/><span>This QR shares only public business-card information. It does not give visitors staff, finance or admin access.</span></div>
      </div>
    </section>
  </div>;
}
