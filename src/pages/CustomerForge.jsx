import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Link } from "react-router-dom";

const OWNER = "jacoblord7@outlook.com";
const blocks = [
  ["04:00", "Wake & prime", "Water, brush teeth, optional cool face rinse, set intention"],
  ["04:15", "Move & listen", "Mobility or light conditioning; audiobook or philosophy"],
  ["05:15", "Breakfast & learning", "Prepare a healthy breakfast and learn one new concept"],
  ["06:15", "Market preparation", "Economic calendar, scenarios, risk and trading journal"],
  ["07:15", "Trading focus", "Follow a written plan, log decisions, avoid distraction"],
  ["09:00", "Train your craft", "Strength session or golf/softball skill work; plan recovery"],
  ["10:30", "Groom & dress", "Shower, skincare, shave if needed, intentional wardrobe"],
  ["11:00", "Family & lunch", "Quality time, healthy food, flexible childcare buffer"],
  ["13:00", "Build SyncWorks", "One defined product deliverable, test, or customer outcome"],
  ["15:30", "Income sprint", "Upwork proposals, client delivery, prospecting, follow-ups"],
  ["17:00", "Family evening", "Dinner, playtime, family and bedtime routines"],
  ["19:30", "Reflect & recover", "Review wins, plan tomorrow and wind down for sleep"]
];
const pillars = [
  ["Identity & Style", "A clean, well-fitting wardrobe; grooming; posture; confident communication", "Choose tomorrow's outfit, prepare business cards, and practice a 30-second pitch."],
  ["Wealth & Freedom", "Create durable income through products, services and measured financial decisions", "Finish one high-value business action, not just a busy task."],
  ["Athletic Excellence", "Strength, conditioning, golf, softball, mobility, recovery", "Log your session and progress gradually without sacrificing recovery."],
  ["Intellectual Growth", "Philosophy, decision-making, business, learning and critical thinking", "Explain one new idea in your own words and question an assumption."],
  ["Family & Character", "Be a present father and partner while building your future", "Protect distraction-free family time today."],
  ["Execution", "Clear priorities, financial discipline, practical follow-through", "Identify the one deliverable that matters most today."]
];
const coaching = [
  { title:"Socratic reflection", script:"What belief are you accepting without examining it? What evidence would change your mind? Choose one honest action today." },
  { title:"Stoic discipline", script:"You do not control every result. You control preparation, judgment and action. Identify what is within your control, and give it your best attention." },
  { title:"Trading composure", script:"A successful trading session is one where you follow the plan and manage risk. Do not confuse luck with skill. Define your invalidation before you act." },
  { title:"Confidence & presentation", script:"Stand tall, relax your shoulders, speak with clarity, listen carefully and make a useful offer. Confidence grows through preparation and practice." },
  { title:"Guided breathing", script:"Settle into a comfortable position. Inhale gently. Exhale slowly. Notice the body relaxing. You can return your attention to the present moment." }
];
const dayKey = () => new Date().toLocaleDateString("en-CA");
const getKey = (email) => "syncworks-forge-v1:" + email + ":" + dayKey();
function safeRead(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } }
export default function CustomerForge() {
  const { user } = useAuth();
  const email = String(user?.email || "").trim().toLowerCase();
  const permitted = email === OWNER;
  const [tab,setTab] = useState("today");
  const [completed,setCompleted] = useState({});
  const [loadedKey,setLoadedKey] = useState("");
  const [intent,setIntent] = useState("");
  const [coach,setCoach] = useState(0);
  const [bedtime,setBedtime] = useState("20:00");
  const key = getKey(email);
  useEffect(() => {
    if (!permitted) return;
    const saved = safeRead(key);
    setCompleted(saved.completed || {});
    setIntent(saved.intent || "");
    setBedtime(saved.bedtime || "20:00");
    setLoadedKey(key);
  }, [permitted,key]);
  useEffect(() => {
    if (!permitted || loadedKey !== key) return;
    localStorage.setItem(key, JSON.stringify({completed,intent,bedtime}));
  }, [permitted,key,loadedKey,completed,intent,bedtime]);
  const done = useMemo(() => blocks.filter((_,i)=>completed[i]).length,[completed]);
  function speak() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(coaching[coach].script);
    utterance.rate = .88;
    window.speechSynthesis.speak(utterance);
  }
  if (!permitted) return <main className="min-h-screen bg-slate-950 px-6 pt-28 text-white"><h1 className="text-2xl font-semibold">Private pilot</h1><p className="mt-3 text-slate-400">The Forge is not available for this account.</p><Link to="/customer" className="mt-6 inline-block text-sky-300">Return to office</Link></main>;
  return <main className="min-h-screen bg-[#080e18] px-4 pb-24 pt-24 text-[#f6f1e9] sm:pt-28">
    <div className="mx-auto max-w-5xl">
      <Link to="/customer" className="text-sm text-amber-200">← Back to my office</Link>
      <header className="mt-5 rounded-3xl border border-amber-200/20 bg-gradient-to-br from-[#28303b] to-[#0a1424] p-6">
        <p className="text-xs tracking-[.25em] text-amber-200">SYNCWORKS • PRIVATE PILOT</p>
        <h1 className="mt-2 font-serif text-4xl">THE FORGE</h1>
        <p className="mt-2 text-slate-300">Forge the mind. Strengthen the body. Build the life.</p>
        <p className="mt-4 text-sm text-amber-100">Today's victories: {done} / {blocks.length}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-300" style={{width: (done / blocks.length * 100) + "%"}} /></div>
      </header>
      <nav className="mt-5 flex flex-wrap gap-2" aria-label="Forge sections">
        {["today","vision","coach","review"].map(x=><button type="button" key={x} onClick={()=>setTab(x)} className={"rounded-full border px-4 py-2 text-sm capitalize "+(tab===x?"border-amber-200 bg-amber-200/15 text-amber-100":"border-white/20 text-slate-300")}>{x}</button>)}
      </nav>
      {tab==="today"&&<section className="mt-5">
        <h2 className="mb-2 text-xl font-semibold">Today's mission</h2>
        <label className="block text-sm text-slate-300" htmlFor="forge-intent">One action that would make today worthwhile</label>
        <input id="forge-intent" className="mt-2 mb-5 w-full rounded-xl border border-white/20 bg-[#182235] p-3" value={intent} onChange={e=>setIntent(e.target.value)} placeholder="e.g. finish the client pilot, trade my plan, be present with my child" />
        <p className="mb-4 text-xs text-slate-400">Flexible starting template, not a rigid prescription. Adjust for sleep and childcare.</p>
        <div className="space-y-2">{blocks.map(([time,title,detail],i)=><label key={time} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#142032] p-4">
          <input aria-label={"Complete "+title} type="checkbox" className="mt-1 h-5 w-5 accent-amber-300" checked={!!completed[i]} onChange={e=>setCompleted(p=>({...p,[i]:e.target.checked}))}/>
          <span className="w-14 shrink-0 text-sm font-semibold text-amber-200">{time}</span><span><strong>{title}</strong><span className="mt-1 block text-sm text-slate-400">{detail}</span></span>
        </label>)}</div>
      </section>}
      {tab==="vision"&&<section className="mt-5 grid gap-3 sm:grid-cols-2">
        {pillars.map(([name,vision,action])=><article key={name} className="rounded-2xl border border-amber-100/15 bg-[#172236] p-5">
          <h2 className="font-serif text-xl">{name}</h2><p className="mt-2 text-sm text-slate-300">{vision}</p><p className="mt-4 text-sm text-amber-200">Today's proof: {action}</p>
        </article>)}
      </section>}
      {tab==="coach"&&<section className="mt-5 max-w-2xl rounded-2xl border border-white/10 bg-[#172236] p-5">
        <h2 className="text-xl font-semibold">Headphone coaching • voice prototype</h2>
        <p className="mt-2 text-sm text-slate-400">Uses the browser's built-in speech voice; no AI or ElevenLabs connection yet.</p>
        <label htmlFor="forge-lesson" className="mt-5 block text-sm">Choose a guided reflection</label>
        <select id="forge-lesson" value={coach} onChange={e=>setCoach(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-white/20 bg-[#26354c] p-3">
          {coaching.map((x,i)=><option key={x.title} value={i}>{x.title}</option>)}
        </select>
        <p className="my-5 leading-7">{coaching[coach].script}</p>
        <div className="flex gap-2">
          <button onClick={speak} type="button" className="rounded-xl bg-amber-200 px-5 py-3 font-semibold text-slate-950">▶ Listen</button>
          <button onClick={()=>window.speechSynthesis?.cancel()} type="button" className="rounded-xl border border-white/20 px-5 py-3">Stop</button>
        </div>
      </section>}
      {tab==="review"&&<section className="mt-5 max-w-2xl rounded-2xl border border-white/10 bg-[#172236] p-5">
        <h2 className="text-xl font-semibold">Protect tomorrow's energy</h2>
        <label htmlFor="forge-bed" className="mt-4 block text-sm text-slate-300">Target bedtime for a 4 AM wake-up</label>
        <input id="forge-bed" type="time" value={bedtime} onChange={e=>setBedtime(e.target.value)} className="mt-2 rounded-xl border border-white/20 bg-[#26354c] p-3" />
        <p className="mt-3 text-sm text-slate-300">A 4 AM wake-up generally requires bedtime around 8:00–8:30 PM to allow 7.5–8 hours of sleep. Shift your start if family obligations make that unrealistic.</p>
        <p className="mt-5">Finished today: {done} of {blocks.length} blocks</p>
        <p className="mt-2 text-sm text-slate-400">Judge your day by meaningful progress and sound judgment, not perfect completion.</p>
      </section>}
      <p className="mt-8 text-xs text-slate-500">V1 prototype: daily checkboxes, intention and bedtime are saved in this browser for this account. No cross-device sync, reminders or secure backend storage yet.</p>
    </div>
  </main>;
}
