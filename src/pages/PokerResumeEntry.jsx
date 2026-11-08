import React,{useEffect,useState} from "react";
import {Navigate} from "react-router-dom";
import {useAuth} from "../auth/AuthContext";
import {getCardRoom} from "../api/cardRooms";
import {clearPokerResume,readPokerResume} from "../games/pokerResume.mjs";

// Mounted inside ProtectedRoute. The account has already been authenticated.
// Don't resume a room from another account or a closed/unavailable table.
export default function PokerResumeEntry(){
 const {user}=useAuth();
 const [target,setTarget]=useState(null);
 useEffect(()=>{
  let mounted=true;
  const stored=readPokerResume(user);
  if(!stored){setTarget("/customer");return()=>{mounted=false;};}
  setTarget(null);
  getCardRoom(stored.roomId).then(room=>{
   if(!mounted)return;
   const stillSeated=room?.seats?.some(seat=>String(seat.user_id)===String(user?.id));
   if(String(room?.group)===stored.groupId&&room?.state!=="CLOSED"&&stillSeated){
     setTarget(stored.path);
   }else{clearPokerResume(user);setTarget("/customer");}
  }).catch(err=>{
   if(!mounted)return;
   // Preserve the pointer on transient connection errors; never clear login.
   if(err?.response?.status===404||err?.response?.status===403)clearPokerResume(user);
   setTarget("/customer");
  });
  return()=>{mounted=false;};
 },[user?.id]);
 if(!target)return <main className="flex min-h-dvh items-center justify-center bg-[#020817] px-4 text-center text-sm text-slate-300">Restoring your SyncWorks poker room…</main>;
 return <Navigate to={target} replace/>;
}
