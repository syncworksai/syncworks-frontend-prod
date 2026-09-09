import React, { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarPlus,
  Check,
  ChevronDown,
  CreditCard,
  Dumbbell,
  Flag,
  HeartPulse,
  ListTodo,
  MapPin,
  Plus,
  ReceiptText,
  Route,
  Sparkles,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

import api from "../../api/client";
import { trackSyncUsage } from "../../api/syncUsage";

const CATEGORY_OPTIONS = [
  { id: "APPOINTMENT", label: "Appointment", icon: CalendarPlus, mode: "FIXED", calendar: true },
  { id: "TASK", label: "Task", icon: ListTodo, mode: "FLEXIBLE", calendar: true },
  { id: "REMINDER", label: "Reminder", icon: Flag, mode: "REMINDER", calendar: true },
  { id: "TRAVEL", label: "Travel", icon: Route, mode: "TRAVEL_AWARE", calendar: true },
  { id: "WORKOUT", label: "Workout", icon: Dumbbell, mode: "FLEXIBLE", calendar: true },
  { id: "MEAL", label: "Meal", icon: Utensils, mode: "FLEXIBLE", calendar: true },
  { id: "PROJECT", label: "Project block", icon: BriefcaseBusiness, mode: "FLEXIBLE", calendar: true },
  { id: "FINANCE", label: "Finance", icon: WalletCards, mode: "DEADLINE", calendar: false },
];

const SCHEDULING_OPTIONS = [
  ["FIXED", "Fixed time"],
  ["FLEXIBLE", "Flexible"],
  ["DEADLINE", "Deadline only"],
  ["REMINDER", "Reminder only"],
  ["TIME_BLOCK", "Time block"],
  ["TRAVEL_AWARE", "Travel aware"],
  ["ALL_DAY", "All day"],
];

const FINANCE_TYPES = [
  ["DEBT", "Credit card / debt"],
  ["BILL", "Bill"],
  ["ACCOUNT", "Checking / account"],
  ["GOAL", "Goal"],
];

function pad(value) { return String(value).padStart(2, "0"); }
function ymd(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function addMinutes(time, minutes = 60) {
  const [hours, mins] = String(time || "09:00").split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function blankItem(category = "APPOINTMENT") {
  const option = CATEGORY_OPTIONS.find((item) => item.id === category) || CATEGORY_OPTIONS[0];
  return {
    category,
    title: "",
    date: ymd(),
    time: "09:00",
    end_time: "10:00",
    scheduling_mode: option.mode,
    address: "",
    cost: "",
    notes: "",
    travel_aware: category === "TRAVEL" || category === "APPOINTMENT",
    arrive_early: "15",
    project_name: "",
    meal_type: "LUNCH",
    finance_type: "DEBT",
    balance: "",
    minimum_payment: "",
    apr: "",
    account_kind: "CREDIT_CARD",
    credit_limit: "",
    target_amount: "",
  };
}

function fieldClass() {
  return "mt-1 h-10 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none focus:border-cyan-400/35";
}

function categoryLabel(id) {
  return CATEGORY_OPTIONS.find((item) => item.id === id)?.label || id;
}

function schedulingLabel(id) {
  return SCHEDULING_OPTIONS.find(([value]) => value === id)?.[1] || id;
}

async function saveCalendarItem(item) {
  const mode = item.scheduling_mode;
  const allDay = mode === "ALL_DAY" || mode === "DEADLINE";
  const start = new Date(`${item.date}T${allDay ? "00:00" : item.time || "09:00"}`);
  const end = allDay
    ? new Date(`${item.date}T23:59`)
    : new Date(`${item.date}T${item.end_time || addMinutes(item.time, 60)}`);
  const entityType = item.category === "TASK" ? "TASK" : "EVENT";

  const payload = {
    title: item.title.trim(),
    description: item.notes || "",
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    all_day: allDay,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
    location_name: item.address || "",
    address_line1: item.address || "",
    arrival_buffer_minutes: Number(item.arrive_early || 0),
    reminder_minutes: mode === "REMINDER" ? 0 : 30,
    source: "MANUAL",
    metadata: {
      entity_type: entityType,
      category: item.category,
      scheduling_mode: mode,
      fixed: mode === "FIXED" || mode === "TRAVEL_AWARE",
      travel_aware: Boolean(item.travel_aware || mode === "TRAVEL_AWARE"),
      cost: item.cost ? Number(item.cost) : null,
      project_name: item.project_name || "",
      meal_type: item.category === "MEAL" ? item.meal_type : "",
      navigation_handoff: "MAPS",
      carplay_ready: Boolean(item.address),
      quick_add: true,
    },
  };
  return api.post("/personal-calendar/events/", payload);
}

async function saveFinanceItem(item) {
  const name = item.title.trim();
  if (item.finance_type === "DEBT") {
    return api.post("/personal-finance/liabilities/", {
      name,
      kind: item.account_kind || "CREDIT_CARD",
      outstanding_balance: item.balance || null,
      minimum_payment: item.minimum_payment || null,
      next_payment_amount: item.minimum_payment || null,
      next_payment_date: item.date || null,
      apr: item.apr || null,
      is_manual: true,
    });
  }
  if (item.finance_type === "ACCOUNT") {
    return api.post("/personal-finance/accounts/", {
      name,
      kind: item.account_kind || "CHECKING",
      current_balance: item.balance || null,
      credit_limit: item.credit_limit || null,
      is_manual: true,
    });
  }
  if (item.finance_type === "GOAL") {
    return api.post("/personal-finance/goals/", {
      name,
      kind: "SAVINGS",
      target_amount: item.target_amount || null,
      current_amount: item.balance || 0,
      target_date: item.date || null,
      active: true,
    });
  }
  return api.post("/personal-finance/obligations/", {
    name,
    category: "OTHER",
    expected_amount: item.minimum_payment || item.cost || null,
    next_due_date: item.date || null,
    recurring: true,
    cadence: "MONTHLY",
    active: true,
    is_manual: true,
  });
}

export default function UnifiedQuickAdd({ onSaved, buttonClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState(() => blankItem());
  const [queue, setQueue] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((option) => option.id === item.category) || CATEGORY_OPTIONS[0],
    [item.category],
  );

  function changeCategory(category) {
    setItem((current) => ({
      ...blankItem(category),
      title: current.title,
      date: current.date,
      notes: current.notes,
    }));
  }

  function validate(current) {
    if (!String(current.title || "").trim()) return "Add a name or title first.";
    if (current.category !== "FINANCE" && !current.date) return "Choose a date.";
    return "";
  }

  function addToQueue() {
    const problem = validate(item);
    if (problem) return setNotice(problem);
    setQueue((current) => [...current, { ...item, client_id: `${Date.now()}-${current.length}` }]);
    setItem(blankItem(item.category));
    setNotice("Added to batch. Add another or save the batch.");
    trackSyncUsage("CALENDAR", "QUICK_ADD_QUEUED", {
      category: item.category,
      scheduling_mode: item.scheduling_mode,
      batch: true,
    });
  }

  async function saveItems(items) {
    if (!items.length) return;
    setSaving(true);
    setNotice("");
    let saved = 0;
    const failures = [];
    for (const current of items) {
      try {
        if (current.category === "FINANCE") await saveFinanceItem(current);
        else await saveCalendarItem(current);
        saved += 1;
        await trackSyncUsage(current.category === "FINANCE" ? "FINANCE" : "CALENDAR", "QUICK_ADD_SAVED", {
          category: current.category,
          scheduling_mode: current.scheduling_mode,
          completed: true,
          batch: items.length > 1,
          carplay_ready: Boolean(current.address),
        });
      } catch (error) {
        failures.push(error?.response?.data?.detail || `${current.title} could not be saved.`);
      }
    }
    setSaving(false);
    if (saved) {
      setQueue([]);
      setItem(blankItem());
      setNotice(`${saved} item${saved === 1 ? "" : "s"} added${failures.length ? `; ${failures.length} need attention` : ""}.`);
      onSaved?.();
    } else {
      setNotice(failures[0] || "Nothing was saved.");
    }
  }

  function saveCurrent() {
    const problem = validate(item);
    if (problem) return setNotice(problem);
    return saveItems([item]);
  }

  return <>
    <button
      type="button"
      onClick={() => { setOpen(true); trackSyncUsage("CALENDAR", "QUICK_ADD_OPENED", { source: "command_center" }); }}
      className={buttonClassName || "inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-[11px] font-black text-white"}
    >
      <Plus className="h-4 w-4" />Quick Add
      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
    </button>

    {open ? <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/75 p-2 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={() => setOpen(false)}>
      <div className="max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-t-[1.8rem] border border-cyan-400/20 bg-[#050b16] p-4 shadow-2xl sm:rounded-[1.8rem] sm:p-5" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-cyan-200"><Sparkles className="h-4 w-4" />SYNC Quick Add</div>
            <h2 className="mt-1 text-xl font-black text-white">Add what matters. SYNC handles the scheduling behavior.</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Add one item or queue several credit cards, appointments, projects, meals, workouts, or tasks and save them together.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-400"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = option.id === item.category;
            return <button type="button" key={option.id} onClick={() => changeCategory(option.id)} className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[10px] font-black ${active ? "border-cyan-300/30 bg-cyan-500/10 text-cyan-100" : "border-white/10 text-slate-500"}`}><Icon className="h-3.5 w-3.5" />{option.label}</button>;
          })}
        </div>

        <div className="mt-4 grid gap-3 rounded-[1.4rem] border border-white/10 bg-white/[.025] p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:col-span-2">{item.category === "FINANCE" ? "Account / bill name" : "Title"}<input className={fieldClass()} value={item.title} onChange={(event) => setItem((current) => ({ ...current, title: event.target.value }))} placeholder={item.category === "FINANCE" ? "Capital One, mortgage, checking…" : "Dentist, softball, project work…"} /></label>

          {item.category === "FINANCE" ? <>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Finance type<select className={fieldClass()} value={item.finance_type} onChange={(event) => setItem((current) => ({ ...current, finance_type: event.target.value, account_kind: event.target.value === "ACCOUNT" ? "CHECKING" : "CREDIT_CARD" }))}>{FINANCE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.finance_type === "ACCOUNT" ? "Balance" : item.finance_type === "GOAL" ? "Current saved" : "Current balance"}<input className={fieldClass()} inputMode="decimal" value={item.balance} onChange={(event) => setItem((current) => ({ ...current, balance: event.target.value }))} placeholder="0.00" /></label>
            {item.finance_type === "DEBT" ? <><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Minimum payment<input className={fieldClass()} inputMode="decimal" value={item.minimum_payment} onChange={(event) => setItem((current) => ({ ...current, minimum_payment: event.target.value }))} placeholder="0.00" /></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Due date<input className={fieldClass()} type="date" value={item.date} onChange={(event) => setItem((current) => ({ ...current, date: event.target.value }))} /></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">APR %<input className={fieldClass()} inputMode="decimal" value={item.apr} onChange={(event) => setItem((current) => ({ ...current, apr: event.target.value }))} placeholder="24.99" /></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Credit limit<input className={fieldClass()} inputMode="decimal" value={item.credit_limit} onChange={(event) => setItem((current) => ({ ...current, credit_limit: event.target.value }))} placeholder="Optional" /></label></> : null}
            {item.finance_type === "BILL" ? <><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Amount<input className={fieldClass()} inputMode="decimal" value={item.minimum_payment} onChange={(event) => setItem((current) => ({ ...current, minimum_payment: event.target.value }))} /></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Due date<input className={fieldClass()} type="date" value={item.date} onChange={(event) => setItem((current) => ({ ...current, date: event.target.value }))} /></label></> : null}
            {item.finance_type === "GOAL" ? <><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Goal amount<input className={fieldClass()} inputMode="decimal" value={item.target_amount} onChange={(event) => setItem((current) => ({ ...current, target_amount: event.target.value }))} /></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Target date<input className={fieldClass()} type="date" value={item.date} onChange={(event) => setItem((current) => ({ ...current, date: event.target.value }))} /></label></> : null}
          </> : <>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date<input className={fieldClass()} type="date" value={item.date} onChange={(event) => setItem((current) => ({ ...current, date: event.target.value }))} /></label>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Scheduling<select className={fieldClass()} value={item.scheduling_mode} onChange={(event) => setItem((current) => ({ ...current, scheduling_mode: event.target.value }))}>{SCHEDULING_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {!(["DEADLINE", "REMINDER", "ALL_DAY"].includes(item.scheduling_mode)) ? <><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Start<input className={fieldClass()} type="time" value={item.time} onChange={(event) => setItem((current) => ({ ...current, time: event.target.value }))} /></label><label className="text-[10px] font-black uppercase tracking-wider text-slate-500">End<input className={fieldClass()} type="time" value={item.end_time} onChange={(event) => setItem((current) => ({ ...current, end_time: event.target.value }))} /></label></> : null}
            {item.category === "APPOINTMENT" ? <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cost<input className={fieldClass()} inputMode="decimal" value={item.cost} onChange={(event) => setItem((current) => ({ ...current, cost: event.target.value }))} placeholder="Optional" /></label> : null}
            {item.category === "PROJECT" ? <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Project<input className={fieldClass()} value={item.project_name} onChange={(event) => setItem((current) => ({ ...current, project_name: event.target.value }))} placeholder="SyncWorks Social…" /></label> : null}
            {item.category === "MEAL" ? <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Meal<select className={fieldClass()} value={item.meal_type} onChange={(event) => setItem((current) => ({ ...current, meal_type: event.target.value }))}><option>BREAKFAST</option><option>LUNCH</option><option>DINNER</option><option>SNACK</option></select></label> : null}
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:col-span-2">Address / destination<div className="relative"><MapPin className="absolute left-3 top-4 h-3.5 w-3.5 text-slate-600" /><input className={`${fieldClass()} pl-9`} value={item.address} onChange={(event) => setItem((current) => ({ ...current, address: event.target.value, travel_aware: Boolean(event.target.value) }))} placeholder="Optional — enables travel/Maps/CarPlay handoff" /></div></label>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Arrive early<input className={fieldClass()} inputMode="numeric" value={item.arrive_early} onChange={(event) => setItem((current) => ({ ...current, arrive_early: event.target.value }))} /></label>
          </>}

          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:col-span-2 lg:col-span-4">Notes<textarea rows={2} value={item.notes} onChange={(event) => setItem((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white outline-none" placeholder="Optional" /></label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] text-slate-500"><span className="font-black text-slate-300">{categoryLabel(item.category)}</span> · {schedulingLabel(item.scheduling_mode)}{item.address ? " · travel aware" : ""}</div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={addToQueue} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-violet-400/20 bg-violet-500/[.08] px-3 text-[10px] font-black text-violet-100"><Plus className="h-3.5 w-3.5" />Add to batch</button><button type="button" onClick={saveCurrent} disabled={saving} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 text-[10px] font-black text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save now"}</button></div>
        </div>

        {queue.length ? <section className="mt-4 rounded-[1.35rem] border border-violet-400/20 bg-violet-500/[.04] p-3"><div className="flex items-center justify-between gap-2"><div><div className="text-[9px] font-black uppercase tracking-[.16em] text-violet-200">Batch ready</div><div className="mt-1 text-xs text-slate-400">{queue.length} item{queue.length === 1 ? "" : "s"} ready to save together.</div></div><button type="button" onClick={() => saveItems(queue)} disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2 text-[10px] font-black text-white disabled:opacity-40">Save all {queue.length}</button></div><div className="mt-3 grid gap-2 md:grid-cols-2">{queue.map((queued, index) => <div key={queued.client_id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-2.5"><div className="min-w-0"><div className="truncate text-[11px] font-black text-white">{queued.title}</div><div className="mt-0.5 text-[9px] text-slate-500">{categoryLabel(queued.category)} · {queued.category === "FINANCE" ? queued.finance_type : `${queued.date} · ${schedulingLabel(queued.scheduling_mode)}`}</div></div><button type="button" onClick={() => setQueue((current) => current.filter((_, queueIndex) => queueIndex !== index))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-500"><X className="h-3.5 w-3.5" /></button></div>)}</div></section> : null}

        {notice ? <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-500/[.06] p-2.5 text-[10px] leading-4 text-cyan-100">{notice}</div> : null}
      </div>
    </div> : null}
  </>;
}
