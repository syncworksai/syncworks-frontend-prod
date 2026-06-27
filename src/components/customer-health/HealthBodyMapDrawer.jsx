// src/components/customer-health/HealthBodyMapDrawer.jsx
import React, { useMemo, useState } from "react";
import HealthDrawer from "./HealthDrawer";
import {
  HEALTH_BODY_MAP_GROUPS,
} from "./healthBodyMapConfig";
import { trackExerciseLibraryKpi } from "./healthExerciseCatalog";
import { speakCoachText } from "./healthCoachVoice";

function Zone({
  label,
  selected,
  color,
  onClick,
  children,
}) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Select ${label}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
      className="cursor-pointer outline-none"
    >
      <g
        style={{
          filter: selected
            ? `drop-shadow(0 0 14px ${color})`
            : `drop-shadow(0 0 5px ${color}66)`,
        }}
      >
        {React.cloneElement(children, {
          fill: selected ? color : `${color}88`,
          stroke: selected ? "#ffffff" : color,
          strokeWidth: selected ? 3 : 1.5,
          opacity: selected ? 1 : 0.78,
        })}
      </g>
    </g>
  );
}

function FrontBody({ selected, select }) {
  return (
    <svg viewBox="0 0 260 620" className="mx-auto h-[520px] w-full max-w-[280px]">
      <defs>
        <linearGradient id="bodyFront" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e2744" />
          <stop offset="100%" stopColor="#07101f" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="48" r="31" fill="url(#bodyFront)" stroke="#34dfff" strokeWidth="2" />
      <path d="M96 84 Q130 70 164 84 L181 190 Q169 240 164 285 L160 350 L100 350 L96 285 Q91 240 79 190 Z" fill="url(#bodyFront)" stroke="#34dfff" strokeWidth="2"/>
      <path d="M78 104 Q47 118 42 180 L28 292 Q26 320 47 322 L64 220 L82 160 Z" fill="url(#bodyFront)" stroke="#34dfff" strokeWidth="2"/>
      <path d="M182 104 Q213 118 218 180 L232 292 Q234 320 213 322 L196 220 L178 160 Z" fill="url(#bodyFront)" stroke="#34dfff" strokeWidth="2"/>
      <path d="M103 350 L77 584 Q83 606 104 602 L127 410 L130 350 Z" fill="url(#bodyFront)" stroke="#34dfff" strokeWidth="2"/>
      <path d="M157 350 L183 584 Q177 606 156 602 L133 410 L130 350 Z" fill="url(#bodyFront)" stroke="#34dfff" strokeWidth="2"/>

      <Zone label="Shoulders" color="#ffc857" selected={selected==="Shoulders"} onClick={() => select("Shoulders")}>
        <path d="M78 103 Q57 111 48 133 Q65 151 84 142 L97 112 Q88 103 78 103 Z M182 103 Q203 111 212 133 Q195 151 176 142 L163 112 Q172 103 182 103 Z"/>
      </Zone>
      <Zone label="Chest" color="#ff5e7d" selected={selected==="Chest"} onClick={() => select("Chest")}>
        <path d="M96 111 Q130 95 164 111 L166 170 Q130 191 94 170 Z"/>
      </Zone>
      <Zone label="Biceps" color="#70ff3d" selected={selected==="Biceps"} onClick={() => select("Biceps")}>
        <path d="M60 145 Q75 138 84 153 L72 225 Q59 231 50 218 Z M200 145 Q185 138 176 153 L188 225 Q201 231 210 218 Z"/>
      </Zone>
      <Zone label="Forearms" color="#34dfff" selected={selected==="Forearms"} onClick={() => select("Forearms")}>
        <path d="M49 219 Q60 224 72 226 L61 298 Q50 313 38 299 Z M211 219 Q200 224 188 226 L199 298 Q210 313 222 299 Z"/>
      </Zone>
      <Zone label="Abs" color="#2f8cff" selected={selected==="Abs"} onClick={() => select("Abs")}>
        <path d="M111 175 L149 175 L154 286 Q130 304 106 286 Z"/>
      </Zone>
      <Zone label="Obliques" color="#ff9f2e" selected={selected==="Obliques"} onClick={() => select("Obliques")}>
        <path d="M95 177 L111 179 L106 286 L91 267 Z M165 177 L149 179 L154 286 L169 267 Z"/>
      </Zone>
      <Zone label="Hip Flexors" color="#39ff88" selected={selected==="Hip Flexors"} onClick={() => select("Hip Flexors")}>
        <path d="M101 287 Q115 299 127 307 L115 354 L98 342 Z M159 287 Q145 299 133 307 L145 354 L162 342 Z"/>
      </Zone>
      <Zone label="Adductors" color="#34dfff" selected={selected==="Adductors"} onClick={() => select("Adductors")}>
        <path d="M116 348 L129 348 L122 450 L104 430 Z M144 348 L131 348 L138 450 L156 430 Z"/>
      </Zone>
      <Zone label="Quads" color="#d95cff" selected={selected==="Quads"} onClick={() => select("Quads")}>
        <path d="M96 349 L116 349 L103 493 L82 489 Z M164 349 L144 349 L157 493 L178 489 Z"/>
      </Zone>
      <Zone label="Calves" color="#ff6b5e" selected={selected==="Calves"} onClick={() => select("Calves")}>
        <path d="M82 496 L104 500 L99 582 L79 582 Z M178 496 L156 500 L161 582 L181 582 Z"/>
      </Zone>
    </svg>
  );
}

function BackBody({ selected, select }) {
  return (
    <svg viewBox="0 0 260 620" className="mx-auto h-[520px] w-full max-w-[280px]">
      <defs>
        <linearGradient id="bodyBack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e2744" />
          <stop offset="100%" stopColor="#07101f" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="48" r="31" fill="url(#bodyBack)" stroke="#34dfff" strokeWidth="2" />
      <path d="M96 84 Q130 70 164 84 L181 190 Q169 240 164 285 L160 350 L100 350 L96 285 Q91 240 79 190 Z" fill="url(#bodyBack)" stroke="#34dfff" strokeWidth="2"/>
      <path d="M78 104 Q47 118 42 180 L28 292 Q26 320 47 322 L64 220 L82 160 Z" fill="url(#bodyBack)" stroke="#34dfff" strokeWidth="2"/>
      <path d="M182 104 Q213 118 218 180 L232 292 Q234 320 213 322 L196 220 L178 160 Z" fill="url(#bodyBack)" stroke="#34dfff" strokeWidth="2"/>
      <path d="M103 350 L77 584 Q83 606 104 602 L127 410 L130 350 Z" fill="url(#bodyBack)" stroke="#34dfff" strokeWidth="2"/>
      <path d="M157 350 L183 584 Q177 606 156 602 L133 410 L130 350 Z" fill="url(#bodyBack)" stroke="#34dfff" strokeWidth="2"/>

      <Zone label="Traps" color="#ff6f9e" selected={selected==="Traps"} onClick={() => select("Traps")}>
        <path d="M101 86 Q130 75 159 86 L166 157 Q130 137 94 157 Z"/>
      </Zone>
      <Zone label="Shoulders" color="#ffc857" selected={selected==="Shoulders"} onClick={() => select("Shoulders")}>
        <path d="M78 103 Q57 111 48 133 Q65 151 84 142 L97 112 Q88 103 78 103 Z M182 103 Q203 111 212 133 Q195 151 176 142 L163 112 Q172 103 182 103 Z"/>
      </Zone>
      <Zone label="Triceps" color="#8b5cff" selected={selected==="Triceps"} onClick={() => select("Triceps")}>
        <path d="M58 145 Q73 139 84 154 L73 229 Q60 232 50 217 Z M202 145 Q187 139 176 154 L187 229 Q200 232 210 217 Z"/>
      </Zone>
      <Zone label="Forearms" color="#34dfff" selected={selected==="Forearms"} onClick={() => select("Forearms")}>
        <path d="M49 219 Q60 224 72 226 L61 298 Q50 313 38 299 Z M211 219 Q200 224 188 226 L199 298 Q210 313 222 299 Z"/>
      </Zone>
      <Zone label="Lats" color="#70d95c" selected={selected==="Lats"} onClick={() => select("Lats")}>
        <path d="M94 154 Q112 145 125 158 L116 260 L90 242 Z M166 154 Q148 145 135 158 L144 260 L170 242 Z"/>
      </Zone>
      <Zone label="Lower Back" color="#2f8cff" selected={selected==="Lower Back"} onClick={() => select("Lower Back")}>
        <path d="M116 159 L144 159 L151 292 Q130 310 109 292 Z"/>
      </Zone>
      <Zone label="Glutes" color="#ff9f2e" selected={selected==="Glutes"} onClick={() => select("Glutes")}>
        <path d="M98 286 Q115 280 129 299 L126 352 Q105 365 94 344 Z M162 286 Q145 280 131 299 L134 352 Q155 365 166 344 Z"/>
      </Zone>
      <Zone label="Hamstrings" color="#8b5cff" selected={selected==="Hamstrings"} onClick={() => select("Hamstrings")}>
        <path d="M98 351 L126 351 L111 493 L83 489 Z M162 351 L134 351 L149 493 L177 489 Z"/>
      </Zone>
      <Zone label="Calves" color="#ff6b5e" selected={selected==="Calves"} onClick={() => select("Calves")}>
        <path d="M82 496 L105 500 L99 582 L79 582 Z M178 496 L155 500 L161 582 L181 582 Z"/>
      </Zone>
    </svg>
  );
}

export default function HealthBodyMapDrawer({
  open,
  onClose,
  selectedMuscle = "All",
  onSelectMuscle,
}) {
  const [view, setView] = useState("front");

  const visibleGroups = useMemo(
    () =>
      HEALTH_BODY_MAP_GROUPS.filter(
        (item) => item.side === "both" || item.side === view
      ),
    [view]
  );

  function choose(group) {
    trackExerciseLibraryKpi("body_map_muscle_selected", {
      muscle_group: group,
      body_view: view,
    });

    speakCoachText({
      text: `${group} selected. I am showing exercises that target this area.`,
      audioMode: "essential",
      voicePreference: "auto",
      rate: 0.98,
    });

    onSelectMuscle?.(group);
    onClose?.();
  }

  return (
    <HealthDrawer
      open={open}
      onClose={onClose}
      title="Neon Muscle Map"
      subtitle="Tap a muscle group to filter the exercise library."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {["front", "back"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setView(item);
                trackExerciseLibraryKpi("body_map_view_changed", {
                  body_view: item,
                });
              }}
              className={
                view === item
                  ? "h-11 rounded-2xl border border-cyan-300/40 bg-cyan-300/15 text-sm font-black uppercase tracking-[0.2em] text-cyan-100"
                  : "h-11 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-black uppercase tracking-[0.2em] text-slate-400"
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[#030712]">
          <img
            src="/health/body-map/full-body-hero.png"
            alt="Front and back anatomical muscle reference"
            className="max-h-[520px] w-full object-contain"
          />
          <div className="border-t border-white/10 px-3 py-2 text-center text-[10px] font-bold text-slate-500">
            Muscle reference. Use the interactive map below to filter exercises.
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-cyan-400/25 bg-[#030712] p-3 shadow-[0_0_45px_rgba(34,211,238,0.10)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,223,255,0.10),transparent_42%)]" />
          <div className="relative">
            {view === "front" ? (
              <FrontBody selected={selectedMuscle} select={choose} />
            ) : (
              <BackBody selected={selectedMuscle} select={choose} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleGroups.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => choose(item.id)}
              className="flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-left text-xs font-black text-white"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: item.color,
                  boxShadow: `0 0 12px ${item.color}`,
                }}
              />
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            onSelectMuscle?.("All");
            onClose?.();
          }}
          className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-black text-slate-200"
        >
          Clear Muscle Filter
        </button>
      </div>
    </HealthDrawer>
  );
}
