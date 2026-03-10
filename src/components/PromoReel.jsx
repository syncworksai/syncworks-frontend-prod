// src/components/PromoReel.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/client";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function PromoReel({ endpoint = "/me/news-reel/", title = "LIVE" }) {
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const res = await api.get(endpoint);
      const list = safeList(res.data).filter(Boolean);
      setItems(list);
      setIdx(0);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load promos");
      setItems([]);
      setIdx(0);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  // auto rotate every 7 seconds (only if > 1 item)
  useEffect(() => {
    if (!items?.length || items.length === 1) return;
    const t = setInterval(() => setIdx((x) => (x + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items]);

  const current = useMemo(() => {
    if (!items?.length) return null;
    return items[Math.min(idx, items.length - 1)];
  }, [items, idx]);

  if (err) {
    return (
      <div className="rounded-2xl border border-red-800 bg-red-900/10 p-4 text-sm text-red-200">
        {err}
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-200">
            {title}
          </span>
          <div className="text-sm font-semibold truncate">{current?.title || "Update"}</div>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 1 ? (
            <div className="text-[11px] text-slate-500">
              {idx + 1}/{items.length}
            </div>
          ) : null}
          <button
            onClick={load}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            Refresh
          </button>
        </div>
      </div>

      {current?.body ? (
        <div className="mt-2 text-sm text-slate-200">
          {current.body}
        </div>
      ) : null}

      {current?.image ? (
        <div className="mt-3">
          <img
            src={current.image}
            alt="Promo"
            className="w-full max-h-72 rounded-xl border border-slate-800 object-cover"
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        {current?.link_url ? (
          <a
            className="text-xs text-cyan-200 underline"
            href={current.link_url}
            target="_blank"
            rel="noreferrer"
          >
            Open link
          </a>
        ) : <span />}

        {items.length > 1 ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIdx((x) => (x - 1 + items.length) % items.length)}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
            >
              Prev
            </button>
            <button
              onClick={() => setIdx((x) => (x + 1) % items.length)}
              className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
