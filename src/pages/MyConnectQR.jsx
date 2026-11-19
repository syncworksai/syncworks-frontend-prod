import React, {useMemo, useState} from "react";
import {useAuth} from "../auth/AuthContext";
import {QRCodeSVG} from "qrcode.react";
import {useNavigate} from "react-router-dom";
import {Copy, Share2, Users, Building2, ShieldCheck} from "lucide-react";
import "./CustomerRolodex.css";

export default function MyConnectQR(){
  const {user} = useAuth();
  const navigate = useNavigate();
  const [message,setMessage] = useState("");
  const uid = Number(user?.id || user?.user?.id || 0);
  const url = useMemo(()=>uid ? `https://syncworksapp.com/connect?connect=${uid}` : "",[uid]);
  async function share(){
    if(!url)return;
    try {
      if(navigator.share) await navigator.share({title:"Connect with me on SyncWorks",url});
      else {await navigator.clipboard.writeText(url);setMessage("Link copied");}
    } catch(e){if(e?.name!=="AbortError") setMessage("Unable to share. Copy the link instead.");}
  }
  return <div className="sw-rolodex-page">
    <main className="sw-rolodex-main">
      <div className="sw-rolodex-head"><div><p>SYNCWORKS / SOCIAL</p><h1>My Connect QR</h1><span>Share a connection invitation—not private account access.</span></div><button onClick={()=>navigate("/connect")}><Users size={18}/> Social</button></div>
      <section className="sw-rolodex-glass sw-myqr">
        {url ? <><div className="sw-myqr-code"><QRCodeSVG value={url} size={218} level="M" includeMargin /></div><h2>Scan to connect</h2><p>Other members can open a Social connection request with you. You control which requests to accept.</p><div className="sw-myqr-actions"><button onClick={share}><Share2 size={18}/> Share link</button><button onClick={async()=>{try{await navigator.clipboard.writeText(url);setMessage("Link copied");}catch{setMessage("Copy unavailable");}}}><Copy size={18}/> Copy link</button><a href={`sms:?&body=${encodeURIComponent(url)}`}>Text invite</a><a href={`mailto:?subject=${encodeURIComponent("Connect on SyncWorks")}&body=${encodeURIComponent(url)}`}>Email invite</a></div></> : <p>Account identity is still loading. Sign in to generate your QR.</p>}
        {message && <p role="status">{message}</p>}
      </section>
      <div className="sw-rolodex-glass sw-rolodex-note"><ShieldCheck size={20}/><p>Connecting socially does not expose private properties, customer details, files, invoices, or business administration. Public business profiles can be shared separately.</p></div>
      <button className="sw-rolodex-secondary" onClick={()=>navigate("/customer/rolodex")}><Building2 size={18}/> Open My Rolodex</button>
    </main>
  </div>;
}
