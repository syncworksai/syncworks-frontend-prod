// Deterministic job qualification. Estimates, not predictions or a live Upwork feed.
export const clamp=(x,min,max)=>Math.min(max,Math.max(min,Number(x)||0));
export const money=value=>Number(value||0).toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2});
export function qualify(job){
 const budget=clamp(job.budget,0,1000000);
 const hours=clamp(job.reviewHours,0,10000);
 const feePct=clamp(job.reviewFeePct??10,0,50);
 const cashCost=clamp(job.reviewCashCost,0,100000);
 const connects=clamp(job.reviewConnects,0,10000);
 const connectCost=clamp(job.reviewConnectCost,0,5);
 const fees=budget*feePct/100;
 const expense=cashCost+connects*connectCost;
 const projectedNet=budget-fees-expense;
 const effectiveHourly=hours>0?projectedNet/hours:null;
 const verified=job.reviewPaymentVerified==="yes";
 const history=job.reviewClientHistory==="positive";
 const automation=job.reviewAutomation==="high";
 const permission=job.reviewPermission==="allowed";
 const knownScope=Boolean((job.description||"").trim())&&hours>0;
 const risk=job.reviewRisk||"unknown";
 const required=[];
 if(!job.reviewPaymentVerified||job.reviewPaymentVerified==="unknown")required.push("Verify client payment method");
 if(!job.reviewClientHistory||job.reviewClientHistory==="unknown")required.push("Inspect client hiring and spending history");
 if(!knownScope)required.push("Confirm requirements and estimate work hours");
 if(job.reviewPermission!=="allowed")required.push("Confirm client and platform permit the intended tools");
 if(!job.reviewDeadline)required.push("Verify deadline before bidding");
 if(job.reviewConnectCost==null||job.reviewConnectCost==="")required.push("Enter the real cost per Connect (or zero if already owned)");
 if(job.reviewRisk!=="low")required.push("Review confidentiality, scope and delivery risks");
 const provisional=!hours||job.reviewConnects==null||job.reviewConnects===""||job.reviewConnectCost==null||job.reviewConnectCost===""||job.reviewPaymentVerified!=="yes";
 const points=(verified?15:0)+(history?10:0)+(knownScope?20:0)+(automation?15:job.reviewAutomation==="medium"?7:0)+(permission?15:0)+(risk==="low"?15:risk==="medium"?5:0)+(effectiveHourly!==null&&effectiveHourly>=25?10:effectiveHourly!==null&&effectiveHourly>=15?5:0);
 const flags=[];
 if(risk==="high")flags.push("High scope or compliance risk");
 if(job.reviewPermission==="prohibited")flags.push("Requested automation not permitted");
 if(effectiveHourly!==null&&effectiveHourly<12)flags.push("Low estimated net hourly return");
 const blocked=flags.some(x=>x.includes("not permitted"))||risk==="high";
 const grade=blocked?"Hold":required.length?"Needs verification":points>=75?"Promising":"Review carefully";
 return {budget,hours,fees,expense,projectedNet,effectiveHourly,points,grade,required,flags,blocked,connects,feePct,provisional,automationReady:automation&&permission};
}
export function createReviewBrief(job,assessment){
 return [
  "SYNCWORKS FREELANCE — REVIEW BRIEF (not a submitted proposal)",
  "Job: "+job.title,
  "Source: "+(job.platform||"Unverified listing"),
  "Posting: "+(job.url||"Not recorded"),
  "Advertised budget: "+money(job.budget),
  "Requirements: "+(job.description||"Not recorded"),
  "Estimated work hours: "+(assessment.hours||"Unknown"),
  "Estimated gross (not contracted): "+money(assessment.budget),
  "Estimated platform fee: "+money(assessment.fees),
  "Estimated cash/Connect costs: "+money(assessment.expense),
  "Estimated net before tax: "+money(assessment.projectedNet),
  "Effective hourly at estimate: "+(assessment.effectiveHourly===null?"Unknown":money(assessment.effectiveHourly)),
  "Screening result: "+assessment.grade+" ("+assessment.points+"/100, rules-based)",
  "Unverified: "+(assessment.required.join("; ")||"No outstanding form fields"),
  "Alerts: "+(assessment.flags.join("; ")||"None captured"),
  "Do NOT claim experience, certifications, hiring, client acceptance, live status or guaranteed AI accuracy. Verify client rules and obtain user approval before any bid or Connects spend."
 ].join("\n");
}
