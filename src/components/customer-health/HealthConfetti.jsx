// src/components/customer-health/HealthConfetti.jsx
import React, { useEffect, useMemo, useState } from "react";

const COLORS = [
  "bg-cyan-300",
  "bg-emerald-300",
  "bg-fuchsia-300",
  "bg-amber-300",
  "bg-indigo-300",
  "bg-rose-300",
];

export default function HealthConfetti({ active, title, subtitle, onDone }) {
  const [visible, setVisible] = useState(false);

  const pieces = useMemo(() => {
    return Array.from({ length: 46 }).map((_, index) => ({
      id: index,
      left: `${Math.floor(Math.random() * 100)}%`,
      delay: `${Math.random() * 0.35}s`,
      duration: `${1.1 + Math.random() * 1.2}s`,
      rotate: `${Math.floor(Math.random() * 360)}deg`,
      color: COLORS[index % COLORS.length],
      size: index % 3 === 0 ? "h-3 w-2" : index % 3 === 1 ? "h-2 w-2" : "h-4 w-1.5",
    }));
  }, [active]);

  useEffect(() => {
    if (!active) return;

    setVisible(true);

    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2400);

    const doneTimer = window.setTimeout(() => {
      onDone?.();
    }, 2850);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [active, onDone]);

  if (!active && !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      <style>
        {`
          @keyframes swHealthConfettiFall {
            0% {
              transform: translate3d(0, -20vh, 0) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            100% {
              transform: translate3d(0, 110vh, 0) rotate(740deg);
              opacity: 0;
            }
          }

          @keyframes swHealthCelebrationPop {
            0% {
              transform: translate(-50%, -50%) scale(.88);
              opacity: 0;
            }
            12% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            84% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(.94);
              opacity: 0;
            }
          }
        `}
      </style>

      {pieces.map((piece) => (
        <div
          key={piece.id}
          className={`absolute top-0 rounded-sm ${piece.color} ${piece.size}`}
          style={{
            left: piece.left,
            animation: `swHealthConfettiFall ${piece.duration} ease-in forwards`,
            animationDelay: piece.delay,
            transform: `rotate(${piece.rotate})`,
          }}
        />
      ))}

      <div
        className="absolute left-1/2 top-[42%] w-[min(92vw,420px)] rounded-3xl border border-emerald-400/30 bg-slate-950/90 p-5 text-center shadow-[0_22px_80px_rgba(16,185,129,.22)] backdrop-blur-xl"
        style={{
          animation: "swHealthCelebrationPop 2.55s ease-in-out forwards",
        }}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-3xl">
          🎉
        </div>
        <div className="mt-3 text-xl font-black text-white">
          {title || "Milestone reached!"}
        </div>
        <div className="mt-2 text-sm leading-6 text-slate-300">
          {subtitle || "That is progress. Keep stacking wins."}
        </div>
      </div>
    </div>
  );
}