import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import ModeBar from "../components/ModeBar";

/**
 * Sales OS Home
 * - Lists pipelines for current business context
 * - Connects into board: /sales/board?pipeline_id=ID&tab=board
 */

export default function SalesOSHome() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState([]);
  const [creating, setCreating] = useState(false);

  const [newName, setNewName] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/sales/pipelines/");
      setPipelines(res?.data?.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createPipeline() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await api.post("/sales/pipelines/", { name: newName.trim() });
      const created = res?.data;
      setNewName("");
      await load();
      if (created?.id) {
        nav(`/sales/board?pipeline_id=${created.id}&tab=board`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#050816] to-black text-slate-100">
      <ModeBar />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-slate-400">Sales OS</div>
            <h1 className="text-2xl font-semibold tracking-tight">Pipelines</h1>
          </div>

          <button
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
            onClick={load}
          >
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm text-slate-300 w-full md:w-[360px]">
              New pipeline name
              <input
                className="mt-1 w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-slate-100 outline-none"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Main Pipeline"
              />
            </label>

            <button
              className="px-5 py-2 rounded-2xl bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-white/15 hover:from-cyan-500/40 hover:to-purple-500/40"
              onClick={createPipeline}
              disabled={creating || !newName.trim()}
            >
              {creating ? "Creating…" : "Create Pipeline"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
          {loading ? (
            <div className="p-6 text-slate-300">Loading…</div>
          ) : (
            <div className="divide-y divide-white/10">
              {pipelines.map((p) => (
                <button
                  key={p.id}
                  onClick={() => nav(`/sales/board?pipeline_id=${p.id}&tab=board`)}
                  className="w-full text-left px-5 py-4 hover:bg-white/[0.05] transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-slate-100 font-medium">{p.name}</div>
                    <div className="text-xs text-slate-400">
                      Pipeline #{p.id} • Updated{" "}
                      {p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div className="text-sm text-slate-300">Open →</div>
                </button>
              ))}

              {pipelines.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  No pipelines yet. Create one above.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}