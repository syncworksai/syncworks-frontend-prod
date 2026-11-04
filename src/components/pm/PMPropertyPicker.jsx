import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { matchesPMProperty } from "../../utils/pmPropertySearch";
export { matchesPMProperty };

/** Match street numbers, property names, city and ZIP in any order.
 * "338 roxana" finds "Roxana — 3380 Roxana Road" and "chastain 907" finds Chastain Park Dr.
 * A PM can use the same picker for leads, applications and tenant creation.
 */

export default function PMPropertyPicker({
  properties = [], value = "", onChange, label = "Property", placeholder = "Search property name, street number, address or ZIP...",
  disabled = false, optional = true,
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const root = useRef(null);
  const id = useId();
  const selected = properties.find(p => String(p.id) === String(value));
  const matches = useMemo(
    () => properties.filter(p => matchesPMProperty(p, query)).slice(0, 40),
    [properties, query],
  );

  useEffect(() => {
    if (!expanded) setQuery(selected ? [selected.name, selected.address].filter(Boolean).join(" · ") : "");
  }, [value, selected?.name, selected?.address, expanded]);

  useEffect(() => {
    const close = (event) => {
      if (!root.current?.contains(event.target)) setExpanded(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function pick(property) {
    onChange(property ? String(property.id) : "");
    setQuery(property ? [property.name, property.address].filter(Boolean).join(" · ") : "");
    setActiveIndex(0);
    setExpanded(false);
  }

  function keyDown(event) {
    if (event.key === "Escape") { setExpanded(false); return; }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setExpanded(true);
      setActiveIndex(index => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && expanded && matches.length) {
      event.preventDefault();
      pick(matches[Math.min(activeIndex, matches.length - 1)]);
    }
  }

  return <div ref={root} className="relative min-w-0">
    <label htmlFor={id} className="mb-1 block text-[10px] font-semibold text-slate-400">{label}</label>
    <div className="flex min-w-0 items-center gap-1">
      <input id={id} value={query} disabled={disabled} autoComplete="off"
        role="combobox" aria-expanded={expanded} aria-controls={id + "-options"}
        aria-autocomplete="list" placeholder={placeholder}
        className="min-h-10 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
        onFocus={() => { setExpanded(true); setActiveIndex(0); }}
        onClick={() => { setExpanded(true); setActiveIndex(0); }}
        onKeyDown={keyDown}
        onChange={event => {
          setQuery(event.target.value);
          if (value) onChange("");
          setExpanded(true);
          setActiveIndex(0);
        }}/>
      {optional && value ? <button type="button" aria-label="Clear property" title="Clear property"
        className="min-h-10 shrink-0 rounded-lg border border-slate-700 px-2.5 text-xs text-slate-300"
        onClick={() => pick(null)}>Clear</button> : null}
    </div>
    {expanded && !disabled ? <div id={id + "-options"} role="listbox"
      className="absolute inset-x-0 top-full z-[80] mt-1 max-h-64 overflow-y-auto rounded-xl border border-cyan-400/35 bg-[#06101d] p-1.5 shadow-2xl shadow-black">
      {optional && query.trim() === "" ? <button type="button" role="option" aria-selected={!value}
        className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-cyan-500/10"
        onClick={() => pick(null)}>Not assigned to a property</button> : null}
      {matches.length ? matches.map((p, index) => <button key={p.id} type="button" role="option"
        aria-selected={String(value) === String(p.id)}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => pick(p)}
        className={"w-full rounded-lg px-3 py-2.5 text-left transition " + (activeIndex === index ?
          "bg-cyan-400/15 text-white" : "text-slate-200 hover:bg-cyan-500/10")}>
        <div className="text-xs font-bold">{p.name || "Unnamed property"}</div>
        <div className="mt-0.5 text-[10px] text-slate-400">{[p.address, p.city, p.state, p.zip].filter(Boolean).join(" · ")}</div>
      </button>) : <p className="px-3 py-3 text-xs text-slate-400">No matching properties. Try another street number or name.</p>}
      {properties.length > 40 && !query.trim() ? <p className="px-3 py-2 text-[10px] text-slate-500">Type a street number or name to narrow results.</p> : null}
    </div> : null}
  </div>;
}
