import React,{useEffect,useRef,useState} from "react";
import {Camera, Building2, ChevronRight, ImagePlus, RefreshCw, Search, UploadCloud} from "lucide-react";
import {useNavigate} from "react-router-dom";
import api from "../api/client";
import PMShell from "../components/pm/PMShell";
import "./PMPropertiesIndex.css";

const list=x=>Array.isArray(x?.results)?x.results:Array.isArray(x)?x:[];
export default function PMPropertiesIndex(){
 const nav=useNavigate();
 const [items,setItems]=useState([]),[workspace,setWorkspace]=useState(null);
 const [loading,setLoading]=useState(true),[uploading,setUploading]=useState(null);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[query,setQuery]=useState("");
 const fileRef=useRef(null),selectedId=useRef(null);
 async function load(){
  setLoading(true);setError("");
  try{
   const w=(await api.get("/pm-hub/workspaces/current/")).data;
   const r=await api.get("/pm-hub/properties/",{headers:{"X-PM-Workspace-ID":String(w.id)}});
   setWorkspace(w);setItems(list(r.data));
  }catch(e){setError(e?.response?.data?.detail||"Unable to load portfolio.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{load()},[]);
 const choosePhoto=(id)=>{selectedId.current=id;fileRef.current?.click()};
 async function uploadPhoto(e){
  const file=e.target.files?.[0],id=selectedId.current;e.target.value="";
  if(!file||!id||!workspace)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5*1024*1024){
   setError("Choose a JPEG, PNG or WebP no larger than 5 MB.");return;
  }
  setUploading(id);setError("");setNotice("");
  try{
   const body=new FormData();body.append("photo",file);
   const result=await api.post(`/pm-hub/properties/${id}/cover-photo/`,body,{headers:{"X-PM-Workspace-ID":String(workspace.id)}});
   setItems(prev=>prev.map(p=>p.id===id?{...p,photo_url:result.data.photo_url}:p));
   setNotice("Property photo saved.");
  }catch(err){setError(err?.response?.data?.photo?.[0]||err?.response?.data?.detail||"Photo upload failed. Check permanent file storage on the server.");}
  finally{setUploading(null);}
 }
 const filtered=items.filter(p=>(p.name+" "+p.address+" "+p.city).toLowerCase().includes(query.toLowerCase()));
 return <PMShell><main data-pm-property-inventory className="pm-property-inventory">
  <header className="pm-property-inventory-toolbar">
   <div><div className="pm-property-eyebrow">PROPERTY PORTFOLIO</div><h1>Properties</h1><p>{items.length} saved properties · Open, review or update your photos</p></div>
   <div className="pm-property-toolbar-actions">
    <label className="pm-property-search"><Search size={16}/><input aria-label="Search properties" placeholder="Search properties..." value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <button type="button" onClick={load} disabled={loading} aria-label="Refresh properties" title="Refresh"><RefreshCw size={17}/></button>
    <button type="button" onClick={()=>nav("/pm/properties/new")}>+ Add property</button>
   </div>
  </header>
  {error&&<p role="alert" className="pm-property-message pm-property-error">{error}</p>}
  {notice&&<p role="status" className="pm-property-message">{notice}</p>}
  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto} aria-label="Upload a property photo"/>
  <section className="pm-property-inventory-list" aria-label="Saved properties">
   {loading&&<p>Loading your properties…</p>}
   {!loading&&!filtered.length&&<p>No matching properties. Use Add property to create your first record.</p>}
   {filtered.map(p=><article key={p.id} className="pm-property-thumbnail">
    <div className="pm-property-cover" style={p.photo_url?{backgroundImage:`linear-gradient(0deg,rgba(0,0,0,.84),rgba(0,0,0,.06) 78%),url("${String(p.photo_url).replace(/"/g,"%22")}")`}:undefined}>
     {!p.photo_url&&<Building2 className="pm-property-empty-image" size={34}/>}
     <button type="button" className="pm-property-photo-action" onClick={()=>choosePhoto(p.id)} disabled={uploading===p.id} title="Upload property photo" aria-label={`Upload a photo for ${p.name}`}>
      {uploading===p.id?<UploadCloud size={15}/>:p.photo_url?<Camera size={15}/>:<ImagePlus size={15}/>}<span>{uploading===p.id?"Uploading":p.photo_url?"Change photo":"Add photo"}</span>
     </button>
     <div className="pm-property-cover-name"><strong>{p.name||"Unnamed property"}</strong><span>{[p.address,p.city,p.state].filter(Boolean).join(", ")}</span></div>
    </div>
    <div className="pm-property-thumbnail-bottom"><span>{String(p.status||"HEALTHY").replaceAll("_"," ")}</span><button type="button" onClick={()=>nav(`/pm/properties/${p.id}`)}>Open property <ChevronRight size={14}/></button></div>
   </article>)}
  </section>
  <p className="pm-property-inventory-help">Photos are associated with each saved property, not your GitHub repository. Use JPEG, PNG or WebP up to 5 MB.</p>
 </main></PMShell>;
}
