import {useEffect,useState} from "react";

export const WORKSPACE_THEME_KEY = "sw_workspace_appearance_v1";
const ROOMS = {
  classic:"classic-office",
  future:"syncworks-future",
  modern:"modern-dark",
  light:"clean-light",
  legacy:"syncworks-future",
};
export function readBusinessWorkspaceTheme(){
  try {
    const saved=JSON.parse(window.localStorage.getItem(WORKSPACE_THEME_KEY)||"{}");
    const choice=String(saved?.theme||"legacy").toLowerCase();
    return Object.prototype.hasOwnProperty.call(ROOMS,choice)?choice:"legacy";
  } catch {return "legacy";}
}
export function useBusinessWorkspaceTheme(){
  const [theme,setTheme]=useState(readBusinessWorkspaceTheme);
  useEffect(()=>{
    const update=()=>setTheme(readBusinessWorkspaceTheme());
    window.addEventListener("storage",update);
    window.addEventListener("sw:workspace-appearance",update);
    return ()=>{
      window.removeEventListener("storage",update);
      window.removeEventListener("sw:workspace-appearance",update);
    };
  },[]);
  return {
    theme,
    themeProps:{
      "data-sw-business-theme":theme,
      style:{"--sw-business-office-photo":`url("/office-themes/${ROOMS[theme]}.webp")`},
    },
  };
}
