// src/components/NewsReel.jsx
import React, { useEffect, useState } from "react";
import api from "../api/client";

export default function NewsReel() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get("/me/news-reel/");
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setItems(list);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load News Reel");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl border border-red-800 bg-red-900/10 p-4 text-sm text-red-200">
        {err}
      </div>
    );
  }

  if (!items?.length) return null;

  const first = items[0];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-200">
            LIVE
          </span>
          <div className="text-sm font-semibold">{first?.title || "Updates"}</div>
        </div>

        <button
          onClick={load}
          className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
        >
          Refresh
        </button>
      </div>

      {first?.body ? <div className="mt-2 text-sm text-slate-200">{first.body}</div> : null}

      {first?.image ? (
        <div className="mt-3">
          <img
            src={first.image}
            alt="News"
            className="w-full max-h-72 rounded-xl border border-slate-800 object-cover"
          />
        </div>
      ) : null}

      {first?.link_url ? (
        <div className="mt-2">
          <a className="text-xs text-cyan-200 underline" href={first.link_url} target="_blank" rel="noreferrer">
            Open link
          </a>
        </div>
      ) : null}

      {items.length > 1 ? (
        <div className="mt-3 text-xs text-slate-500">+{items.length - 1} more update(s)</div>
      ) : null}
    </div>
  );
}
