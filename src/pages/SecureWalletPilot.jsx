import React from "react";
import {useAuth} from "../auth/AuthContext";
import {useNavigate} from "react-router-dom";
import {ShieldCheck, LockKeyhole, FileLock2, ArrowLeft, Fingerprint} from "lucide-react";
import "./CustomerRolodex.css";

/** PILOT SHELL ONLY — NO DOCUMENT STORAGE OR UPLOAD UNTIL SERVER SECURITY
 * is reviewed, including isolation, encryption, signing, revocation and logs.
 * Frontend email gating alone is NOT a security boundary.
 */
export default function SecureWalletPilot(){
 const {user} = useAuth();
 const nav=useNavigate();
 const email=String(user?.email || user?.user?.email || "").toLowerCase().trim();
 const eligible=email==="jacoblord7@outlook.com";
 return <div className="sw-rolodex-page"><main className="sw-rolodex-main">
   <div className="sw-rolodex-head"><div><p>SYNCWORKS / PRIVATE PILOT</p><h1>Secure Wallet</h1><span>Identity documents, privately controlled.</span></div><button onClick={()=>nav("/customer")}><ArrowLeft size={18}/> Home</button></div>
   {!eligible ? <section className="sw-rolodex-glass"><LockKeyhole size={34}/><h2>Pilot access restricted</h2><p>This experiment is not available on your account.</p></section>:
    <><section className="sw-rolodex-glass sw-wallet-preview"><div className="sw-wallet-shield"><ShieldCheck size={30}/></div><p>RESTRICTED ALPHA · STORAGE DISABLED</p><h2>Your documents belong to you.</h2><span>Identity card · Birth certificate · Social Security card · Other records</span><p>The private Wallet interface is being prepared, but uploads, previews, downloads and sharing remain disabled until the server-side vault passes a security review.</p></section>
    <section className="sw-rolodex-glass sw-wallet-steps"><h3>Required protections before enabling documents</h3><div><FileLock2 size={20}/> Private encrypted storage and per-file access authorization</div><div><Fingerprint size={20}/> Reauthentication before viewing, downloading or exporting</div><div><ShieldCheck size={20}/> File-type checks, malware scanning, expiring links, audit trails and deletion</div><p>No SSN, ID, or birth-certificate files are being collected in this pilot.</p></section></>}
 </main></div>;
}
