import React, { useMemo } from "react";

export default function Sparkline({ points = [], height = 36 }) {
  const d = useMemo(() => {
    if (!points.length) return "";
    const w = 120;
    const h = height;
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);

    const scaleX = (i) => (i / Math.max(points.length - 1, 1)) * w;
    const scaleY = (v) => {
      if (max === min) return h / 2;
      return h - ((v - min) / (max - min)) * h;
    };

    return points
      .map((v, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(2)} ${scaleY(v).toFixed(2)}`)
      .join(" ");
  }, [points, height]);

  return (
    <svg width="140" height={height} viewBox={`0 0 120 ${height}`} className="opacity-90">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
