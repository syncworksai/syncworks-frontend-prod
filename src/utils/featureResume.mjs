/**
 * Personal "Pick up where you left off" navigation bookmarks.
 * Stores only the last SAFE route per feature, not form contents, tokens,
 * health details, private hands, or server data. A bookmark is NOT a draft.
 */
const PREFIX="sw_feature_resume_v1:";
const TTL=21*24*60*60*1000;
const MAX=8;
export const FEATURE_RESUME_DEFINITIONS=Object.freeze([
 {id:"cards",label:"Card Console",icon:"spade",root:"/customer/games",prefixes:["/customer/games"]},
 {id:"property",label:"Property Management",icon:"building-2",root:"/pm",prefixes:["/pm"]},
 {id:"business",label:"Business",icon:"briefcase-business",root:"/sbo",prefixes:["/sbo"]},
 {id:"health",label:"Health & Fitness",icon:"heart-pulse",root:"/customer/health",prefixes:["/customer/health"]},
 {id:"services",label:"Service Requests",icon:"wrench",root:"/customer/tickets",prefixes:["/customer/tickets","/customer/new-request","/tickets"]},
 {id:"calendar",label:"Calendar",icon:"calendar-days",root:"/calendar",prefixes:["/calendar"]},
 {id:"social",label:"Social & Clubs",icon:"users",root:"/connect",prefixes:["/connect","/social"]},
 {id:"finance",label:"Finance",icon:"wallet",root:"/customer/finance",prefixes:["/customer/finance","/sbo/finance","/pm/payments"]},
 {id:"shop",label:"Shop Assist",icon:"shopping-bag",root:"/customer/store",prefixes:["/customer/store"]},
 {id:"assistant",label:"SYNC Assistant",icon:"sparkles",root:"/sync",prefixes:["/sync"]},
 {id:"sales",label:"Sales",icon:"chart-line",root:"/sales",prefixes:["/sales"]},
 {id:"sports",label:"Sports",icon:"trophy",root:"/sports",prefixes:["/sports"]}
]);
const blockedSegments=/(^|\/)(login|register|logout|invite|accept-invite|password|checkout|billing|payment-method|oauth|callback|onboarding)(\/|$)/i;
const normal=id=>String(id??"").trim().replace(/[^a-zA-Z0-9_-]/g,"").slice(0,90);
const key=id=>PREFIX+normal(id);
export function featureForPath(pathname){
 if(typeof pathname!=="string"||!pathname.startsWith("/")||pathname.startsWith("//")||blockedSegments.test(pathname))return null;
 const matches=FEATURE_RESUME_DEFINITIONS.flatMap(feature=>feature.prefixes.filter(prefix=>pathname===prefix||pathname.startsWith(prefix+"/")).map(prefix=>({feature,length:prefix.length})));
 matches.sort((a,b)=>b.length-a.length);
 return matches[0]?.feature||null;
}
export function safeFeatureRoute(pathname,search=""){
 if(typeof pathname!=="string"||pathname.includes("?")||pathname.includes("#")||pathname.includes("\\")||pathname.length>250)return null;
 const feature=featureForPath(pathname);
 if(!feature)return null;
 // Store only known navigation keys; never persist search, email, draft text, tokens, etc.
 const params=new URLSearchParams(search||"");
 const safe=new URLSearchParams();
 for(const field of ["group","room","tab","date","mode"]){
  const value=params.get(field);
  if(value && /^[a-zA-Z0-9_-]{1,60}$/.test(value))safe.set(field,value);
 }
 return {feature:feature.id,label:feature.label,path:pathname+(safe.size?"?"+safe.toString():"")};
}
export function readFeatureResumes(userId,now=Date.now()){
 if(!normal(userId))return [];
 try{
  const data=JSON.parse(localStorage.getItem(key(userId))||"[]");
  if(!Array.isArray(data))return [];
  return data.filter(e=>e&&e.feature===featureForPath(String(e.path||"").split("?")[0])?.id&&Number.isFinite(e.updatedAt)&&now>=e.updatedAt&&now-e.updatedAt<TTL&&safeFeatureRoute(String(e.path).split("?")[0],String(e.path).includes("?")?"?"+String(e.path).split("?").slice(1).join("?"):"")?.path===e.path)
   .sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,MAX).map(e=>({feature:e.feature,label:FEATURE_RESUME_DEFINITIONS.find(f=>f.id===e.feature)?.label||e.label,path:e.path,updatedAt:e.updatedAt}));
 }catch{return [];}
}
export function saveFeatureResume(userId,pathname,search="",now=Date.now()){
 if(!normal(userId))return false;
 const entry=safeFeatureRoute(pathname,search);
 if(!entry)return false;
 // Do not create a "resume" for the general games menu or an empty feature landing.
 if(["/customer/games","/customer","/pm","/sbo","/connect","/sync"].includes(pathname))return false;
 try{
  const items=readFeatureResumes(userId,now).filter(item=>item.feature!==entry.feature);
  localStorage.setItem(key(userId),JSON.stringify([{...entry,updatedAt:now},...items].slice(0,MAX)));
  return true;
 }catch{return false;}
}
export function clearFeatureResumes(userId){if(!normal(userId))return;try{localStorage.removeItem(key(userId));}catch{}}
