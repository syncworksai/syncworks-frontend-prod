// Deterministic, fictional presentation fixtures: never submitted to production APIs.
export const demoPeople = [
  ["Daniel Brooks","HVAC","Field","On site",22,102,97],["Marcus Reed","Plumbing","Field","Available",19,91,95],
  ["Olivia Carter","Electrical","Field","En route",26,108,98],["Ethan Foster","Maintenance","Field","On site",17,83,96],
  ["Sophia Bennett","HVAC","Field","On site",24,116,94],["Noah Mitchell","Plumbing","Field","Available",20,88,98],
  ["Amelia Parker","Electrical","Field","Scheduled",23,107,96],["Liam Edwards","Maintenance","Field","On site",15,82,99],
  ["Ava Richardson","HVAC","Field","Available",27,118,95],["James Peterson","Plumbing","Field","Scheduled",20,96,97],
  ["Mia Collins","Maintenance","Field","On site",13,79,98],["Benjamin Hayes","Electrical","Field","Available",25,112,96],
  ["Charlotte Lewis","HVAC","Field","En route",24,109,97],["Lucas Morgan","Plumbing","Field","Scheduled",18,94,95],
  ["Harper Simmons","Maintenance","Field","Available",21,85,99],["Henry Wallace","Electrical","Field","On site",23,99,96],
  ["Grace Turner","HVAC","Field","Scheduled",28,111,97],["Alexander Price","Maintenance","Field","On site",18,86,98],
].map(([name,trade,team,status,travel,onSite,sla],i)=>({id:i+1,name,trade,team,status,travel,onSite,sla,completed:24+(i*7)%17}));
export const demoCustomers = ["Hamilton Office Park","Willow Creek Residences","Cedar Ridge Retail","Ashford Apartments","Riverside Medical Offices","Oakwood Medical Center","Brookfield Logistics","Pinecrest Townhomes","Summit Business Plaza","Maple Grove Offices","Westlake Dental","Crescent Park Retail","Heritage Landing","Redwood Apartments","Stonebridge Offices","Eastbrook Dental","Northgate Commons","Greenway Medical","Kingston Commerce","Autumn Ridge Homes","Fairview Industrial","Elm Street Offices","Orchard Square","Meadowbrook Estates"];
export const demoServices=["HVAC preventive maintenance","Plumbing repair","Electrical diagnostics","Water heater service","Commercial cooling repair","Lighting retrofit","Drain clearing","Routine property inspection","Air handler repair","Fixture replacement","Emergency plumbing"];
const statuses=["NEW","ASSIGNED","ACCEPTED","SCHEDULED","EN_ROUTE","ON_SITE","IN_PROGRESS","NEEDS_QUOTE","QUOTED","APPROVED","COMPLETED","INVOICED","PAID"];
export const demoJobs=Array.from({length:42},(_,i)=>{
 const status=["IN_PROGRESS","SCHEDULED","ON_SITE","COMPLETED","PAID","NEW","INVOICED","ASSIGNED","EN_ROUTE","COMPLETED","PAID","NEEDS_QUOTE"][i%12];
 return {id:"SW-"+String(1041+i),customer:demoCustomers[i%demoCustomers.length],service:demoServices[i%demoServices.length],technicianId:demoPeople[i%demoPeople.length].id,status,amount:325+((i*167)%2150),hour:8+(i%9),minute:(i%2)*30,dayOffset:Math.floor(i/12),travelMinutes:14+(i*3)%27,siteMinutes:55+(i*17)%134,priority:["P2","P3","P4","P1"][i%4]};
});
export const demoProperties=[
 {name:"Willow Creek Residences",units:32,occupied:30,rent:41800,open:3},
 {name:"Ashford Apartments",units:24,occupied:23,rent:31900,open:5},
 {name:"Cedar Ridge Townhomes",units:18,occupied:17,rent:23800,open:2},
 {name:"Riverside Cottages",units:12,occupied:11,rent:14900,open:2}
];
export const demoLeads=Array.from({length:18},(_,i)=>({id:i+1,name:demoCustomers[(i*3)%demoCustomers.length],source:["Website","Referral","Marketplace","Google","Direct"][i%5],stage:["New","Contacted","Qualified","Proposal","Won","Lost"][i%6],value:450+((i*311)%4600)}));
export const demoInvoices=Array.from({length:36},(_,i)=>{
 const total=350+((i*213)%2400),paid=[0,total,Math.round(total*.55),total][i%4];
 return {id:"INV-"+String(5001+i),customer:demoCustomers[(i*5)%demoCustomers.length],total,paid,status:paid===total?"Paid":paid===0?"Unpaid":"Partial"};
});
export const money = n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
export const statusSteps=["NEW","ASSIGNED","ACCEPTED","SCHEDULED","EN_ROUTE","ON_SITE","IN_PROGRESS","COMPLETED","INVOICED","PAID"];
export function summarize(jobs,invoices){
 const invoiced=invoices.reduce((s,x)=>s+x.total,0);
 const collected=invoices.reduce((s,x)=>s+x.paid,0);
 const completed=jobs.filter(x=>["COMPLETED","INVOICED","PAID"].includes(x.status)).length;
 return {invoiced,collected,outstanding:invoiced-collected,completed,active:jobs.filter(x=>!["COMPLETED","INVOICED","PAID","CANCELLED"].includes(x.status)).length,paid:invoices.filter(x=>x.status==="Paid").length};
}
