import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, RotateCcw, Users, WalletCards } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STORAGE = "sw-card-club-local-preview-v1";
const starter = { name: "Saturday Card Club", members: ["You", "Friend 1", "Friend 2"], transactions: [] };
const dollars = (cents) => (Math.abs(cents) / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const parseCents = (value) => Math.round(Number(value) * 100);
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (data && Array.isArray(data.members) && Array.isArray(data.transactions)) return data;
  } catch { /* empty or unavailable storage */ }
  return starter;
}
export default function CustomerCardClubs() {
  const nav = useNavigate();
  const [club, setClub] = useState(load);
  const [newMember, setNewMember] = useState("");
  const [kind, setKind] = useState("buyin");
  const [player, setPlayer] = useState("You");
  const [recipient, setRecipient] = useState("Friend 1");
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify(club)); setSaveError(""); }
    catch { setSaveError("This browser cannot persist changes. Do not rely on the tally."); }
  }, [club]);
  const balances = useMemo(() => {
    const totals = Object.fromEntries(club.members.map((member) => [member, 0]));
    let pot = 0;
    for (const entry of club.transactions) {
      if (entry.kind === "buyin") { totals[entry.player] -= entry.cents; pot += entry.cents; }
      if (entry.kind === "award") { totals[entry.player] += entry.cents; pot -= entry.cents; }
      if (entry.kind === "settlement") { totals[entry.player] += entry.cents; totals[entry.recipient] -= entry.cents; }
    }
    return { totals, pot };
  }, [club]);
  function addEntry(event) {
    event.preventDefault();
    const cents = parseCents(amount);
    if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000) return;
    if (!club.members.includes(player)) return;
    if (kind === "award" && cents > balances.pot) return;
    if (kind === "settlement" && (player === recipient || !club.members.includes(recipient))) return;
    setClub((old) => ({ ...old, transactions: [...old.transactions, {
      id: crypto.randomUUID?.() || String(Date.now() + Math.random()), time: new Date().toISOString(),
      kind, player, recipient: kind === "settlement" ? recipient : null, cents, note: note.trim().slice(0, 140),
    }] }));
    setNote("");
  }
  function addMember(event) {
    event.preventDefault();
    const name = newMember.trim().slice(0, 32);
    if (!name || club.members.some((member) => member.toLowerCase() === name.toLowerCase()) || club.members.length >= 20) return;
    setClub((old) => ({ ...old, members: [...old.members, name] }));
    setNewMember("");
  }
  function clearAll() {
    if (window.confirm("Clear all LOCAL club preview records? This cannot be undone.")) setClub(starter);
  }
  return <main className="min-h-dvh bg-[#020817] px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))] text-slate-100">
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 flex items-center justify-between gap-2"><button type="button" onClick={() => nav("/customer/games")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-sm"><ArrowLeft size={17}/> Games</button><div className="text-right"><div className="text-xs font-black tracking-widest text-violet-300">SYNCWORKS GAMES</div><h1 className="text-xl font-black">Card Clubs</h1></div></header>
      <div role="status" className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100"><strong>Device-only preview — NOT shared.</strong> This sample tally is stored in this browser only, not in your SyncWorks account or Social Group. Other members cannot see it. No deposits, money custody, transfers, or payment instructions are available here. Do not use it as an authoritative financial record.</div>
      {saveError && <p role="alert" className="mb-3 text-sm text-rose-300">{saveError}</p>}
      <div className="mb-4 rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4"><label className="text-[10px] font-black uppercase tracking-widest text-violet-300" htmlFor="clubName">Club name</label><input id="clubName" value={club.name} maxLength={64} onChange={(event) => setClub((old) => ({ ...old, name: event.target.value }))} className="mt-2 block w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-lg font-black"/><div className="mt-3 flex gap-2"><button type="button" onClick={() => nav("/connect")} className="min-h-10 rounded-lg border border-white/20 px-3 text-xs font-semibold">Open Social Groups</button><button type="button" onClick={clearAll} className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-lg border border-rose-400/25 px-3 text-xs text-rose-200"><RotateCcw size={13}/> Reset preview</button></div></div>
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="mb-3 flex items-center gap-2"><WalletCards className="text-emerald-300"/><h2 className="text-lg font-black">Running tally</h2></div><div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4"><div className="text-xs font-bold text-amber-200">Unallocated virtual pot</div><div className="text-3xl font-black">{dollars(balances.pot)}</div></div><div className="space-y-2">{club.members.map((member) => <div key={member} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><span className="truncate text-sm font-bold">{member}</span><span className={`whitespace-nowrap font-black ${balances.totals[member] < 0 ? "text-rose-300" : balances.totals[member] > 0 ? "text-emerald-300" : "text-slate-300"}`}>{balances.totals[member] < 0 ? "−" : balances.totals[member] > 0 ? "+" : ""}{dollars(balances.totals[member])}</span></div>)}</div><p className="mt-3 text-[11px] leading-5 text-slate-400">Negative = net owed in this virtual tally; positive = net earned. The sum of balances plus the unallocated pot is always zero. A recorded settlement adjusts both members equally.</p></section>
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Plus size={19}/> Record an entry</h2><form className="grid gap-3" onSubmit={addEntry}><label className="text-xs text-slate-400">Type<select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"><option value="buyin">Buy-in to virtual pot</option><option value="award">Award from virtual pot</option><option value="settlement">Record an off-app settlement (payer → receiver)</option></select></label><label className="text-xs text-slate-400">{kind === "settlement" ? "Receiver (credited)" : "Player"}<select value={player} onChange={(e) => setPlayer(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white">{club.members.map((member) => <option key={member}>{member}</option>)}</select></label>{kind === "settlement" && <label className="text-xs text-slate-400">Payer (debited)<select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white">{club.members.map((member) => <option key={member}>{member}</option>)}</select></label>}<label className="text-xs text-slate-400">Amount (USD)<input type="number" step="0.01" min="0.01" max="1000000" required value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"/></label><label className="text-xs text-slate-400">Optional note<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="Saturday game" className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 p-3 text-white"/></label><button type="submit" disabled={kind === "award" && parseCents(amount) > balances.pot || kind === "settlement" && player === recipient} className="min-h-12 rounded-xl bg-cyan-500 font-black text-black disabled:cursor-not-allowed disabled:opacity-40">Add to running tally</button></form></section>
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="mb-3 flex items-center gap-2 text-lg font-black"><Users size={19}/> Members</h2><form onSubmit={addMember} className="flex gap-2"><input value={newMember} onChange={(e) => setNewMember(e.target.value)} maxLength={32} placeholder="Member name" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-900 p-3 text-white"/><button type="submit" className="rounded-xl bg-violet-500 px-4 text-sm font-bold">Add</button></form></section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><h2 className="mb-3 text-lg font-black">Activity log</h2>{club.transactions.length === 0 ? <p className="text-sm text-slate-400">No entries yet.</p> : <div className="space-y-2">{[...club.transactions].reverse().map((entry) => <div key={entry.id} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between gap-2"><span className="text-xs font-bold">{entry.kind === "buyin" ? `${entry.player} · buy-in` : entry.kind === "award" ? `${entry.player} · award` : `${entry.recipient} → ${entry.player} · recorded settlement`}</span><span className="text-sm font-black">{dollars(entry.cents)}</span></div><div className="mt-1 text-[10px] text-slate-500">{new Date(entry.time).toLocaleString()}{entry.note ? ` · ${entry.note}` : ""}</div></div>)}</div>}</section>
    </div>
  </main>;
}
