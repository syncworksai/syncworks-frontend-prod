import React, { useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronDown, ChevronUp, ImagePlus, RotateCw, Save, ShieldCheck, Trash2 } from "lucide-react";
import {
  confirmScorebookReview, deleteScorebookPage, getScorebookImage, getScorebookPages,
  getScorebookReview, getSportsPlayers, saveScorebookReview,
  updateScorebookPage, uploadScorebookPage,
} from "../../api/sports";

const integer = (value) => Math.max(0, Math.min(99, Number.parseInt(value, 10) || 0));
const errorText = (e) => e?.response?.data?.detail || e?.message || "Couldn't complete this operation.";
const RESULTS = ["1B", "2B", "3B", "HR", "BB", "ROE", "FC", "OUT", "K", "SF"];
const emptyInning = (index) => ({ inning: index + 1, team_runs: 0, opponent_runs: 0 });

function PhotoCard({ page, gameId, canEdit, onRotate, onRemove }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    let url = "";
    getScorebookImage(gameId, page.id).then((blob) => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    }).catch(() => { if (alive) setSrc(""); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [gameId, page.id]);
  return <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
    <div className="grid h-52 place-items-center overflow-hidden bg-black/30">
      {src ? <img src={src} alt={page.side + " page " + page.page_order}
        style={{ transform: "rotate(" + (page.rotation || 0) + "deg)" }}
        className="max-h-full max-w-full object-contain" />
        : <span className="text-xs text-slate-400">Loading secure image…</span>}
    </div>
    <div className="flex items-center justify-between gap-2 p-2">
      <span className="truncate text-xs font-bold text-white">{page.side === "OPPONENT" ? "Opponent" : "Our book"} · Page {page.page_order}</span>
      {canEdit ? <div className="flex gap-2">
        <button type="button" aria-label="Rotate photo" onClick={() => onRotate(page)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-cyan-200"><RotateCw className="h-4 w-4" /></button>
        <button type="button" aria-label="Remove photo" onClick={() => onRemove(page)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-rose-300/20 text-rose-200"><Trash2 className="h-4 w-4" /></button>
      </div> : null}
    </div>
  </div>;
}

function N({ label, value, set, max = 99 }) {
  return <label className="min-w-0 text-[10px] text-slate-400">{label}
    <input type="number" min="0" max={max} value={value} onChange={(e) => set(integer(e.target.value))}
      className="mt-1 h-10 w-full min-w-0 rounded-lg border border-white/10 bg-[#050b14] px-2 text-center text-sm font-black text-white" />
  </label>;
}

export default function ScorebookArchive({ game, canScore, canManage, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState([]);
  const [review, setReview] = useState({ status: "DRAFT" });
  const [players, setPlayers] = useState([]);
  const [draft, setDraft] = useState(null);
  const [side, setSide] = useState("TEAM");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const camera = useRef(null);
  const gallery = useRef(null);
  const setPart = (key, value) => setDraft((old) => ({ ...old, [key]: value }));
  const total = (key) => (draft?.innings || []).reduce((sum, row) => sum + integer(row[key]), 0);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    Promise.all([getScorebookPages(game.id), getScorebookReview(game.id), getSportsPlayers(game.team)])
      .then(([images, saved, roster]) => {
        if (!alive) return;
        setPages(images); setReview(saved); setPlayers(roster);
        setDraft({
          innings: Array.isArray(saved.payload?.innings) ? saved.payload.innings
            : game.inning_lines?.length ? game.inning_lines.map((line) => ({
              inning: line.inning, team_runs: line.team_runs, opponent_runs: line.opponent_runs,
            })) : Array.from({ length: Math.min(10, game.innings_scheduled || 7) }, (_, i) => emptyInning(i)),
          lineup: saved.payload?.lineup || (game.lineup_spots || []).map((spot) => ({
            batting_order: spot.batting_order, player: spot.player,
          })),
          substitutions: saved.payload?.substitutions || [],
          plays: saved.payload?.plays || [],
          notes: saved.payload?.notes || "",
        });
      })
      .catch((e) => { if (alive) setError(errorText(e)); });
    return () => { alive = false; };
  }, [game.id, game.team, open]);

  async function execute(op, message) {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await op();
      if (message) setNotice(message);
      return result;
    } catch (e) { setError(errorText(e)); return null; }
    finally { setBusy(false); }
  }
  async function upload(file) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
      setError("Choose an image under 12 MB."); return;
    }
    setProgress(0);
    const done = await execute(async () => {
      const result = await uploadScorebookPage(game.id, file, side, (e) => {
        if (e.total) setProgress(Math.round(e.loaded / e.total * 100));
      });
      setPages(await getScorebookPages(game.id));
      return result;
    }, "Photo archived. Stats remain unchanged until verified.");
    setProgress(0);
    return done;
  }
  async function rotate(page) {
    const result = await execute(() => updateScorebookPage(game.id, page.id, {
      rotation: ((page.rotation || 0) + 90) % 360,
    }));
    if (result) setPages((all) => all.map((item) => item.id === result.id ? result : item));
  }
  async function remove(page) {
    if (!window.confirm("Delete this scanned page? Existing verified stats will remain.")) return;
    const done = await execute(() => deleteScorebookPage(game.id, page.id));
    if (done !== null) setPages((all) => all.filter((item) => item.id !== page.id));
  }
  async function save() {
    const result = await execute(() => saveScorebookReview(game.id, draft),
      "Saved as a pending review. Player statistics have not changed.");
    if (result) setReview((old) => ({ ...old, ...result }));
  }
  async function approve(plays) {
    if (!pages.length) { setError("Upload the actual scorebook photo first."); return; }
    if (plays && (!draft.lineup.length || !draft.plays.length)) {
      setError("Enter a starting order and verified plate appearances first."); return;
    }
    if (!window.confirm(plays
      ? "Approve every play and player identity? This changes season statistics. Review all substitutions first."
      : "Confirm final scores only? No individual hits, at-bats or RBIs will be added.")) return;
    await execute(async () => {
      const saved = await saveScorebookReview(game.id, draft);
      const answer = await confirmScorebookReview(game.id, {
        confirmed: true, approve_plays: plays,
        expected_sha256: saved.current_sha256,
        replace_existing: plays && review.status === "FULLY_VERIFIED",
      });
      setReview(await getScorebookReview(game.id));
      if (onUpdated) await onUpdated();
      setNotice(plays ? "Every verified play is attributed to its selected roster player."
        : "Final score saved. Individual statistics still require verification.");
      return answer;
    });
  }

  return <section className="rounded-2xl border border-violet-300/25 bg-[#07111f] p-3">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
      className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
      <span className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-violet-200" />
        <span><b className="block text-sm text-white">Photo Game Book</b>
          <span className="text-[10px] text-slate-400">Scan old games · Verify player stats</span></span>
      </span>
      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
    {open ? <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
      {error ? <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-xs text-rose-100">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-xs text-emerald-100">{notice}</div> : null}
      <p className="text-[10px] text-slate-400">{pages.length} page(s) · {review.status === "FULLY_VERIFIED"
        ? "All plays verified" : review.status === "SCORE_VERIFIED" ? "Final score verified · Player stats pending" : "Not yet approved"}</p>

      {canScore ? <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.05] p-3">
        <label className="text-[10px] font-black text-cyan-200">Photo belongs to
          <select value={side} onChange={(e) => setSide(e.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#050b14] px-3 text-sm text-white">
            <option value="TEAM">{game.team_name}</option>
            <option value="OPPONENT">{game.opponent_name}</option>
          </select>
        </label>
        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={gallery} type="file" accept="image/*" className="hidden"
          onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => camera.current?.click()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-2 text-xs font-black text-slate-950 disabled:opacity-40">
            <Camera className="h-4 w-4" />Take photo
          </button>
          <button type="button" disabled={busy} onClick={() => gallery.current?.click()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 text-xs font-black text-white disabled:opacity-40">
            <ImagePlus className="h-4 w-4" />Choose photo
          </button>
        </div>
        {progress ? <p className="mt-2 text-xs text-cyan-200">Uploading {progress}%…</p> : null}
        <p className="mt-2 text-[10px] leading-5 text-slate-400">Upload both teams' sheets to this game. The images are private to team members, not public GameCast viewers.</p>
      </div> : null}
      {pages.length ? <div className="grid gap-2 sm:grid-cols-2">
        {pages.map((page) => <PhotoCard key={page.id} page={page} gameId={game.id}
          canEdit={canScore} onRotate={rotate} onRemove={remove} />)}
      </div> : <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-400">No scans yet.</p>}

      {canScore && draft ? <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <h3 className="text-sm font-black text-white">Review runs by inning</h3>
        <p className="text-[10px] leading-5 text-amber-100">Photos never automatically add hits. Verify each number against the book before confirming.</p>
        <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 text-center text-[10px] font-bold text-slate-400">
          <span>Inn</span><span className="truncate">{game.team_name}</span><span className="truncate">{game.opponent_name}</span>
        </div>
        {draft.innings.map((row, index) => <div key={index} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
          <span className="text-center text-xs font-black">{row.inning}</span>
          <N label="Ours" value={row.team_runs} set={(v) => setPart("innings", draft.innings.map((r, i) => i === index ? { ...r, team_runs: v } : r))} />
          <N label="Theirs" value={row.opponent_runs} set={(v) => setPart("innings", draft.innings.map((r, i) => i === index ? { ...r, opponent_runs: v } : r))} />
        </div>)}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <b className="text-sm text-cyan-200">Total {total("team_runs")}–{total("opponent_runs")}</b>
          <div className="flex gap-2">
            <button type="button" disabled={draft.innings.length <= 1} onClick={() => setPart("innings", draft.innings.slice(0, -1))}
              className="min-h-10 rounded-lg border border-white/10 px-3 text-xs disabled:opacity-30">− Inning</button>
            <button type="button" disabled={draft.innings.length >= 10} onClick={() => setPart("innings", [...draft.innings, emptyInning(draft.innings.length)])}
              className="min-h-10 rounded-lg border border-white/10 px-3 text-xs disabled:opacity-30">+ Inning</button>
          </div>
        </div>
        <button type="button" onClick={() => setEditing(!editing)} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-white/10 px-3 text-left text-xs font-black text-cyan-200">
          Verify starters, substitutions and at-bats {editing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {editing ? <div className="space-y-3 border-t border-white/10 pt-3">
          <div><h4 className="text-xs font-black">Starting batting order</h4>
            <p className="my-1 text-[10px] text-slate-400">Choose existing roster players. Different historical games may have different lineups.</p>
            {draft.lineup.map((spot, index) => <div key={index} className="mt-1 flex items-center gap-2">
              <span className="w-6 text-center text-xs">{spot.batting_order}</span>
              <select value={spot.player || ""} onChange={(e) => setPart("lineup", draft.lineup.map((row, i) => i === index ? { ...row, player: Number(e.target.value) } : row))}
                className="h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#050b14] px-2 text-xs text-white">
                <option value="">Select existing player</option>
                {players.map((p) => <option key={p.id} value={p.id}>#{p.jersey_number || "—"} {p.display_name}</option>)}
              </select>
              <button type="button" aria-label="Remove batting slot" onClick={() => setPart("lineup",
                draft.lineup.filter((_, i) => i !== index).map((row, i) => ({ ...row, batting_order: i + 1 })))}
                className="grid h-10 w-10 place-items-center rounded-lg border border-rose-300/20 text-rose-200"><Trash2 className="h-4 w-4" /></button>
            </div>)}
            <button type="button" disabled={draft.lineup.length >= 25} onClick={() => setPart("lineup", [...draft.lineup, { batting_order: draft.lineup.length + 1, player: "" }])}
              className="mt-2 min-h-10 rounded-lg border border-white/10 px-3 text-xs text-cyan-200 disabled:opacity-40">+ Batting slot</button>
          </div>
          <div className="border-t border-white/10 pt-3">
            <h4 className="text-xs font-black">Substitutions</h4>
            <p className="my-1 text-[10px] text-slate-400">After play # determines when the incoming player takes over the slot. Previous hits stay with the original batter.</p>
            {draft.substitutions.map((sub, index) => <div key={index} className="mb-2 rounded-lg border border-white/10 p-2">
              <div className="grid grid-cols-2 gap-2">
                <N label="After play #" value={sub.after_sequence} set={(n) => setPart("substitutions", draft.substitutions.map((r, i) => i === index ? { ...r, after_sequence: n } : r))} />
                <label className="text-[10px] text-slate-400">Batting slot
                  <select value={sub.batting_order} onChange={(e) => setPart("substitutions", draft.substitutions.map((r, i) => i === index ? { ...r, batting_order: Number(e.target.value) } : r))}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-white">
                    {draft.lineup.map((spot) => <option key={spot.batting_order} value={spot.batting_order}>{spot.batting_order}</option>)}
                  </select>
                </label>
              </div>
              <select value={sub.incoming_player || ""} onChange={(e) => setPart("substitutions", draft.substitutions.map((r, i) => i === index ? { ...r, incoming_player: Number(e.target.value) } : r))}
                className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-xs text-white">
                <option value="">Incoming player</option>
                {players.map((p) => <option key={p.id} value={p.id}>#{p.jersey_number || "—"} {p.display_name}</option>)}
              </select>
              <button type="button" onClick={() => setPart("substitutions", draft.substitutions.filter((_, i) => i !== index))}
                className="mt-2 text-[10px] font-bold text-rose-200">Remove</button>
            </div>)}
            <button type="button" disabled={!draft.lineup.length} onClick={() => setPart("substitutions", [...draft.substitutions, { after_sequence: draft.plays.length, batting_order: 1, incoming_player: "" }])}
              className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-violet-200 disabled:opacity-40">+ Substitution</button>
          </div>
          <div className="border-t border-white/10 pt-3"><h4 className="text-xs font-black">Verified plate appearances ({draft.plays.length})</h4>
            {draft.plays.map((play, index) => {
              const patch = (fields) => setPart("plays", draft.plays.map((r, i) => i === index ? { ...r, ...fields } : r));
              return <div key={index} className="mt-2 space-y-2 rounded-xl border border-white/10 p-2">
                <div className="flex items-center justify-between text-xs font-black text-cyan-200">
                  <span>Play #{index + 1}</span>
                  <button type="button" onClick={() => setPart("plays", draft.plays.filter((_, i) => i !== index))} className="text-rose-200">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-slate-400">Inning
                    <select value={play.inning} onChange={(e) => patch({ inning: Number(e.target.value) })}
                      className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-white">
                      {draft.innings.map((row) => <option key={row.inning} value={row.inning}>{row.inning}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] text-slate-400">Batting slot
                    <select value={play.batting_order} onChange={(e) => patch({ batting_order: Number(e.target.value) })}
                      className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-white">
                      {draft.lineup.map((spot) => <option key={spot.batting_order} value={spot.batting_order}>{spot.batting_order}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block text-[10px] text-slate-400">Who actually batted?
                  <select value={play.player || ""} onChange={(e) => patch({ player: Number(e.target.value) })}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-white">
                    <option value="">Select roster player</option>
                    {players.map((p) => <option key={p.id} value={p.id}>#{p.jersey_number || "—"} {p.display_name}</option>)}
                  </select>
                </label>
                <label className="block text-[10px] text-slate-400">Result
                  <select value={play.result} onChange={(e) => patch({ result: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#050b14] px-2 text-white">
                    {RESULTS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <N label="Outs" value={play.outs_recorded} max={3} set={(n) => patch({ outs_recorded: n })} />
                  <N label="RBI" value={play.rbi} max={4} set={(n) => patch({ rbi: n })} />
                  <N label="Runs on play" value={play.runs_scored} max={4} set={(n) => patch({ runs_scored: n })} />
                </div>
              </div>;
            })}
            <button type="button" disabled={!draft.lineup.length || draft.plays.length >= 250} onClick={() => setPart("plays", [...draft.plays, {
              inning: draft.plays.length ? draft.plays[draft.plays.length - 1].inning : 1,
              batting_order: 1, player: "", result: "1B", outs_recorded: 0, rbi: 0, runs_scored: 0,
            }])} className="mt-3 min-h-11 w-full rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-xs font-black text-cyan-200 disabled:opacity-40">+ Add verified play</button>
            <p className="mt-2 text-[10px] text-amber-200">Every run must reconcile by inning before the app changes any player's statistics.</p>
          </div>
        </div> : null}

        <label className="block text-[10px] text-slate-400">Review notes
          <textarea rows={2} value={draft.notes || ""} onChange={(e) => setPart("notes", e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#050b14] p-2 text-xs text-white"
            placeholder="Ambiguous handwriting or substitutions to confirm…" />
        </label>
        <button type="button" disabled={busy} onClick={save}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-xs font-black text-white disabled:opacity-40">
          <Save className="h-4 w-4" />Save pending review
        </button>
        {canManage ? <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={busy || !pages.length || game.status === "LIVE"} onClick={() => approve(false)}
            className="min-h-12 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-2 text-xs font-black text-emerald-200 disabled:opacity-40">
            <Check className="mr-1 inline h-4 w-4" />Confirm score only
          </button>
          <button type="button" disabled={busy || !pages.length || !draft.plays.length || game.status === "LIVE"} onClick={() => approve(true)}
            className="min-h-12 rounded-xl bg-emerald-300 px-2 text-xs font-black text-slate-950 disabled:opacity-40">
            <ShieldCheck className="mr-1 inline h-4 w-4" />Approve all player stats
          </button>
        </div> : <p className="text-[10px] text-amber-200">Only a team manager or owner can approve imported statistics.</p>}
      </div> : null}
    </div> : null}
  </section>;
}
