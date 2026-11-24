import api from "./client";
import {fetchPersonalCalendarEvents} from "./personalCalendarAgenda";

export const itemType = row=>String(row?.metadata?.entity_type||"").toUpperCase();
export const openTasks = rows=>(rows||[]).filter(row=>itemType(row)==="TASK"&&String(row?.metadata?.task_status||"OPEN").toUpperCase()==="OPEN");
export const projectRecords=rows=>(rows||[]).filter(row=>itemType(row)==="PROJECT");
export async function getWorkspaceRecords(){return await fetchPersonalCalendarEvents();}
function unscheduledPayload(title,description,metadata){
  const start=new Date(),end=new Date(start.getTime()+30*60000);
  return {title,description:description||"",source:"MANUAL",start_at:start.toISOString(),end_at:end.toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Chicago",all_day:false,metadata:{task_unscheduled:true,fixed:false,...metadata}};
}
export async function addVictoriaTask(title,{projectId=null,priority="NORMAL",description="",metadata={}}={}){
  const value=String(title||"").trim();
  if(!value||value.length>180)throw new Error("Enter a task title under 180 characters.");
  const notes=String(description||"").slice(0,2000);
  const safeMetadata=metadata&&typeof metadata==="object"&&!Array.isArray(metadata)?metadata:{};
  const response=await api.post("/personal-calendar/events/",unscheduledPayload(value,notes,{...safeMetadata,entity_type:"TASK",task_status:"OPEN",task_priority:priority,origin:safeMetadata.origin==="SARAH_PM"?"SARAH_PM":"VICTORIA",...(projectId?{project_id:String(projectId)}:{})}));
  if(!response.data?.id)throw new Error("Task was not confirmed by SyncWorks.");
  window.dispatchEvent(new Event("syncworks:tasks-changed"));
  return response.data;
}
export async function markWorkspaceTask(row,status="DONE"){
  if(itemType(row)!=="TASK")throw new Error("Not a task");
  const response=await api.patch(`/personal-calendar/events/${encodeURIComponent(row.id)}/`,{metadata:{...row.metadata,task_status:status}});
  window.dispatchEvent(new Event("syncworks:tasks-changed"));
  return response.data;
}
export async function createWorkspaceProject({title,description="",type="PERSONAL",dueDate=""}){
  const value=String(title||"").trim();
  if(!value||value.length>180)throw new Error("Project title is required (max 180 characters).");
  const payload=unscheduledPayload(value,String(description).slice(0,2000),{entity_type:"PROJECT",project_status:"ACTIVE",project_type:type,project_due_date:dueDate,origin:"SYNC_PROJECTS"});
  const response=await api.post("/personal-calendar/events/",payload);
  if(!response.data?.id)throw new Error("Project was not confirmed by SyncWorks.");
  return response.data;
}
export async function updateWorkspaceProject(project,changes){
  return (await api.patch(`/personal-calendar/events/${encodeURIComponent(project.id)}/`,{
    ...(changes.title!==undefined?{title:changes.title}:{}),
    ...(changes.description!==undefined?{description:changes.description}:{}),
    metadata:{...project.metadata,...changes.metadata,entity_type:"PROJECT"}
  })).data;
}
