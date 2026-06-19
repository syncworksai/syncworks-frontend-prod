// src/components/customer-health/SleepCheckInCard.jsx
import React, { useEffect, useState } from "react";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function SleepCheckInCard({ snapshot, setSnapshot }) {
  const [hours, setHours] = useState(
    String(snapshot?.last_sleep_hours || snapshot?.sleep_hours || "")
  );

  const [quality, setQuality] = useState(
    snapshot?.last_sleep_quality || "Good"
  );

  const [message, setMessage] = useState("");

  useEffect(() => {
    setHours(
      String(snapshot?.last_sleep_hours || snapshot?.sleep_hours || "")
    );

    setQuality(snapshot?.last_sleep_quality || "Good");
  }, [
    snapshot?.last_sleep_hours,
    snapshot?.sleep_hours,
    snapshot?.last_sleep_quality,
  ]);

  function save() {
    const numericHours = Number(hours);

    if (!Number.isFinite(numericHours) || numericHours <= 0) {
      setMessage("Enter the number of hours you slept.");
      return;
    }

    if (numericHours > 16) {
      setMessage("Sleep hours should be between 0 and 16.");
      return;
    }

    if (typeof setSnapshot !== "function") {
      setMessage("Sleep tracking is unavailable right now.");
      return;
    }

    const roundedHours = Math.round(numericHours * 10) / 10;

    setSnapshot((prev) => ({
      ...prev,
      last_sleep_hours: roundedHours,
      sleep_hours: roundedHours,
      last_sleep_quality: quality,
      last_sleep_logged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setMessage(
      "Sleep check-in saved. Today’s training and recovery guidance can now adjust."
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-cyan-300/15 bg-[#071425] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
        Last Night
      </div>

      <div className="mt-1 text-xl font-black text-white">
        Sleep check-in
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        Sleep affects workout intensity, recovery, soreness, nutrition
        priorities, and whether the coach should push or maintain today.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Hours slept
          </div>

          <input
            type="number"
            min="0"
            max="16"
            step="0.25"
            inputMode="decimal"
            value={hours}
            onChange={(event) => {
              setHours(event.target.value);
              setMessage("");
            }}
            placeholder="7.5"
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
          />
        </label>

        <label>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            Sleep quality
          </div>

          <select
            value={quality}
            onChange={(event) => {
              setQuality(event.target.value);
              setMessage("");
            }}
            className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/40"
          >
            {["Poor", "Fair", "Good", "Great"].map((item) => (
              <option key={item} value={item} className="bg-slate-950">
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {[6, 7, 8, 9].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setHours(String(value));
              setMessage("");
            }}
            className={cx(
              "rounded-2xl border px-2 py-2 text-xs font-black transition active:scale-[0.98]",
              Number(hours) === value
                ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
            )}
          >
            {value}h
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        className="mt-4 h-11 w-full rounded-2xl border border-lime-300/25 bg-lime-300/10 px-4 text-sm font-black text-lime-100 transition hover:bg-lime-300/20 active:scale-[0.99]"
      >
        Save Sleep Check-In
      </button>

      {message ? (
        <div
          className={cx(
            "mt-3 rounded-2xl border p-3 text-xs font-bold leading-5",
            message.startsWith("Sleep check-in saved")
              ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100"
          )}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}