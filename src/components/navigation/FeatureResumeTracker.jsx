import {useEffect} from "react";
import {useLocation} from "react-router-dom";
import {useAuth} from "../../auth/AuthContext";
import {saveFeatureResume} from "../../utils/featureResume.mjs";

/** Observes authenticated page navigation globally, across all SyncWorks modes. */
export default function FeatureResumeTracker(){
 const {user}=useAuth();
 const location=useLocation();
 useEffect(()=>{
  if(!user?.id)return;
  saveFeatureResume(user.id,location.pathname,location.search);
 },[user?.id,location.pathname,location.search]);
 return null;
}
