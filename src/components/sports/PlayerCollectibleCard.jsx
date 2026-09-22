import React, { useEffect, useState } from "react";
import { Camera, Crosshair, Flame, Footprints, LockKeyhole, Medal, Pencil, ShieldCheck, Trophy, Zap } from "lucide-react";

const BADGE_META = {
  POWER: { title: "Power", icon: Zap, tone: "#FBBF24", description: "Extra-base hitting" },
  CONTACT: { title: "Contact", icon: Crosshair, tone: "#22D3EE", description: "Consistent hitting" },
  SPEED: { title: "Speed", icon: Footprints, tone: "#70FF3D", description: "Verified baserunning" },
  CLUTCH: { title: "Clutch", icon: Flame, tone: "#C084FC", description: "Verified late-game hits" },
};
const STYLE = {
  CLASSIC: {
    label: "Classic Gold", border: "#D4AF37",
    background: "radial-gradient(ellipse at 90% 0%,rgba(234,179,8,.16),transparent 50%),linear-gradient(145deg,#211a15,#0b1221 58%,#12151f)",
    text: "#FDE68A",
  },
  NEON: {
    label: "Neon Night", border: "#22D3EE",
    background: "radial-gradient(ellipse at 80% 10%,rgba(139,92,246,.24),transparent 48%),radial-gradient(ellipse at 0 100%,rgba(34,211,238,.18),transparent 55%),#07111f",
    text: "#CFFAFE",
  },
  DIAMOND: {
    label: "Diamond", border: "#A78BFA",
    background: "radial-gradient(ellipse at 85% 0%,rgba(167,139,250,.25),transparent 50%),linear-gradient(145deg,#1b1730,#061321)",
    text: "#E9D5FF",
  },
  MIDNIGHT: {
    label: "Midnight", border: "#94A3B8",
    background: "linear-gradient(130deg,#1e293b,#030712 66%,#121a2a)",
    text: "#E2E8F0",
  },
};

const pretty = (value) => Number(value || 0).toFixed(3).replace(/^0(?=\.)/, "");
const initials = (name) => String(name || "P").trim().split(/\s+/).slice(0, 2).map((word) => word[0] || "").join("").toUpperCase();

export function SportsPlayerPhoto({ player, profile, size = "md", className = "" }) {
  const url = profile?.profile_photo_url || profile?.card_photo_url || "";
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const sizes = { sm: "h-12 w-12 text-sm", md: "h-16 w-16 text-xl", lg: "h-28 w-28 text-3xl", card: "h-full w-full text-5xl" };
  const shape = sizes[size] || sizes.md;
  const common = shape + " shrink-0 overflow-hidden rounded-xl border border-white/15 object-cover " + className;
  const position = Math.min(100, Math.max(0, Number(profile?.card_photo_position ?? 50)));
  if (url && !failed) return <img
    src={url} alt={`${player?.display_name || "Player"} portrait`} className={common}
    style={{ objectPosition: `center ${position}%` }} onError={() => setFailed(true)}
    loading="lazy"
  />;
  return <div className={common + " grid place-items-center bg-gradient-to-br from-cyan-300/20 via-violet-400/10 to-slate-800 font-black text-cyan-100"} aria-label="Player initials">{initials(player?.display_name)}</div>;
}

export function BadgeTile({ badge, compact = false }) {
  const meta = BADGE_META[badge?.key] || BADGE_META.POWER;
  const Icon = meta.icon;
  const active = badge?.achieved === true;
  const color = active ? (badge.border_color || meta.tone) : "#334155";
  return <div
    className={`relative overflow-hidden rounded-xl border ${compact ? "p-2" : "p-3"} transition-all`}
    style={{
      borderColor: active ? color : "#334155",
      borderWidth: active ? 2 : 1,
      background: active ? `linear-gradient(145deg,${meta.tone}1c,rgba(2,6,23,.95))` : "rgba(15,23,42,.58)",
      boxShadow: active ? `0 0 0 1px ${color}32,0 0 20px ${color}38,inset 0 0 22px ${color}15` : "none",
    }}
  >
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: active ? meta.tone + "22" : "#1E293B" }}>
        {active ? <Icon className="h-5 w-5" style={{ color: meta.tone }} /> : <LockKeyhole className="h-4 w-4 text-slate-500" />}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[11px] font-black uppercase tracking-wider" style={{ color: active ? "#FFFFFF" : "#94A3B8" }}>{meta.title}</b>
        <span className={`block text-[9px] font-extrabold tracking-wide ${active ? "text-white" : "text-slate-500"}`} style={active ? { color } : {}}>
          {active ? badge.tier : "LOCKED"}
        </span>
      </span>
      {active ? <ShieldCheck className="h-4 w-4 shrink-0" style={{ color }} /> : null}
    </div>
    {!compact ? <>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] text-slate-300">
        <span>{meta.description}</span>
        <span className="shrink-0 font-bold" style={{ color: active ? color : meta.tone }}>{badge?.progress ?? 0}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, badge?.progress ?? 0))}%`, background: meta.tone }} />
      </div>
      <p className="mt-1.5 text-[9px] leading-4 text-slate-400">{badge?.next_description || "Play in a finalized game to begin earning badges."}</p>
    </> : null}
  </div>;
}

export default function PlayerCollectibleCard({ player, profile, progress, teamName, onEdit, compact = false }) {
  const theme = STYLE[profile?.card_style] || STYLE.CLASSIC;
  const badges = progress?.badges || [
    { key: "POWER" }, { key: "CONTACT" }, { key: "SPEED" }, { key: "CLUTCH" },
  ];
  const earned = progress?.achieved_count || 0;
  const ring = earned ? progress.card_border : theme.border;
  const row = progress?.season_totals || {};
  return <article
    className="relative isolate overflow-hidden rounded-[1.6rem] border-[2px] p-[3px]"
    style={{ borderColor: ring, boxShadow: earned ? `0 0 22px ${ring}44,0 0 3px ${ring}85` : `0 0 10px ${theme.border}23` }}
    aria-label={`${player?.display_name || "Player"} collectible player card`}
  >
    <div className="absolute -right-8 top-0 z-0 text-[10rem] font-black leading-none text-white/[.025]" aria-hidden="true">#{player?.jersey_number || "—"}</div>
    <div className={`relative overflow-hidden rounded-[1.45rem] ${compact ? "p-3" : "p-4"}`} style={{ background: theme.background }}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.16em]" style={{ color: theme.text }}>
          {theme.label} · {progress?.season || "Season"}
        </span>
        {onEdit ? <button type="button" onClick={onEdit} aria-label="Customize my player card" className="grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-black/30 text-white"><Pencil className="h-4 w-4" /></button> : null}
      </div>
      <div className={`grid items-center gap-3 ${compact ? "grid-cols-[6rem_1fr]" : "grid-cols-[7.5rem_1fr] sm:grid-cols-[10rem_1fr]"}`}>
        <div className={`relative overflow-hidden rounded-2xl border-2 border-white/15 bg-black/30 ${compact ? "h-[7.5rem]" : "h-[10.5rem] sm:h-[12rem]"}`} style={{ borderColor: ring + "88" }}>
          <SportsPlayerPhoto player={player} profile={profile} size="card" className="!rounded-none !border-0" />
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/90 via-black/20 to-transparent p-2 text-center">
            <span className="text-2xl font-black" style={{ color: theme.text }}>#{player?.jersey_number || "—"}</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.text }}><Trophy className="h-3 w-3" /> {teamName || "SYNCWORKS SPORTS"}</div>
          <div className={`mt-2 break-words font-black leading-tight text-white ${compact ? "text-lg" : "text-2xl"}`}>{profile?.card_nickname || player?.display_name || "Player"}</div>
          {profile?.card_nickname ? <p className="mt-1 text-xs text-slate-300">{player?.display_name}</p> : null}
          <p className="mt-2 text-[11px] font-bold" style={{ color: theme.text }}>{player?.primary_position || "Player"} · Bats {player?.bats || "—"} · Throws {player?.throws || "—"}</p>
          <div className="mt-3 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-[10px] font-black text-white">
            <Medal className="h-3.5 w-3.5" style={{ color: ring }} /> {earned} / 4 BADGES
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5 border-y border-white/10 py-3 text-center">
        {[["AVG",pretty(row.avg)],["OPS",pretty(row.ops)],["H",Number(row.h || 0)],["RBI",Number(row.rbi || 0)]].map(([label,value])=>
          <div key={label}><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div><div className="mt-1 text-sm font-black text-white sm:text-lg">{value}</div></div>
        )}
      </div>
      <div className={`mt-3 grid ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"} gap-2`}>
        {badges.map((badge)=><BadgeTile key={badge.key} badge={badge} compact={compact} />)}
      </div>
      {!compact ? <p className="mt-3 text-center text-[9px] leading-4 text-slate-400">Colored glowing borders mark earned goals. Speed and Clutch require staff-verified moments in a finished game.</p> : null}
    </div>
  </article>;
}
