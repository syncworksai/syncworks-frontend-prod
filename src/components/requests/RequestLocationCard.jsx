// src/components/requests/RequestLocationCard.jsx
import React from "react";

export default function RequestLocationCard({
  address,
  setAddress,
  unit,
  setUnit,
  accessNotes,
  setAccessNotes,
}) {
  return (
    <div className="space-y-3">
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3"
      />

      <input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="Unit / Apt"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3"
      />

      <textarea
        value={accessNotes}
        onChange={(e) => setAccessNotes(e.target.value)}
        placeholder="Access notes (gate code, etc)"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3"
      />
    </div>
  );
}