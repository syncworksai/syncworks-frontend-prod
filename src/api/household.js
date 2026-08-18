import api from "./client";

const list = (data) => Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

export async function getHouseholds(){ const {data}=await api.get("/household/households/"); return list(data); }
export async function createHousehold(payload){ const {data}=await api.post("/household/households/",payload); return data; }
export async function updateHousehold(id,payload){ const {data}=await api.patch(`/household/households/${id}/`,payload); return data; }
export async function syncHouseholdMembers(id){ const {data}=await api.post(`/household/households/${id}/sync_members/`); return data; }
export async function getHouseholdSettings(){ const {data}=await api.get("/household/member-settings/"); return list(data); }
export async function updateHouseholdSettings(id,payload){ const {data}=await api.patch(`/household/member-settings/${id}/`,payload); return data; }
export async function getHouseholdTasks(){ const {data}=await api.get("/household/tasks/"); return list(data); }
export async function createHouseholdTask(payload){ const {data}=await api.post("/household/tasks/",payload); return data; }
export async function updateHouseholdTask(id,payload){ const {data}=await api.patch(`/household/tasks/${id}/`,payload); return data; }
export async function getShoppingItems(){ const {data}=await api.get("/household/shopping/"); return list(data); }
export async function createShoppingItem(payload){ const {data}=await api.post("/household/shopping/",payload); return data; }
export async function updateShoppingItem(id,payload){ const {data}=await api.patch(`/household/shopping/${id}/`,payload); return data; }
export async function deleteShoppingItem(id){ await api.delete(`/household/shopping/${id}/`); }
export async function getHouseholdGoals(){ const {data}=await api.get("/household/goals/"); return list(data); }
export async function createHouseholdGoal(payload){ const {data}=await api.post("/household/goals/",payload); return data; }
export async function updateHouseholdGoal(id,payload){ const {data}=await api.patch(`/household/goals/${id}/`,payload); return data; }
export async function getHouseholdMeals(){ const {data}=await api.get("/household/meals/"); return list(data); }
export async function createHouseholdMeal(payload){ const {data}=await api.post("/household/meals/",payload); return data; }
