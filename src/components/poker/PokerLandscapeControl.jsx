import React,{useState} from "react";
import {MonitorSmartphone,RotateCcw,X} from "lucide-react";

/** On mobile Safari the browser cannot force landscape.
 * This control explains physical rotation without hijacking game input.
 */
export default function PokerLandscapeControl(){
 const [showTip,setShowTip]=useState(false);
 return <>
  <button type="button" className="sw-poker-landscape-toggle" onClick={()=>setShowTip(v=>!v)} aria-expanded={showTip} aria-label="Landscape table view" title="Landscape table view"><MonitorSmartphone size={16}/><span>Landscape</span></button>
  {showTip&&<div className="sw-poker-landscape-tip" role="dialog" aria-label="Landscape view instructions"><button type="button" className="sw-poker-landscape-dismiss" aria-label="Close landscape instructions" onClick={()=>setShowTip(false)}><X size={16}/></button><RotateCcw size={25} className="sw-poker-landscape-rotate"/><strong>Turn your phone sideways</strong><p>Unlock Portrait Orientation Lock in Control Center, then rotate your phone. The table rearranges for landscape automatically.</p><button type="button" className="sw-poker-landscape-ok" onClick={()=>setShowTip(false)}>Back to game</button></div>}
 </>;
}
