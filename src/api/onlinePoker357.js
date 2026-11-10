import api from "./client";

// Authoritative, group-scoped, server-private 3-5-7 game.
export async function getOnlinePoker357(roomId){
 const {data}=await api.get("/social/card-rooms/"+encodeURIComponent(roomId)+"/game/");
 return data;
}
export async function actOnlinePoker357(roomId,action){
 const {data}=await api.post("/social/card-rooms/"+encodeURIComponent(roomId)+"/game/",{action});
 return data;
}
