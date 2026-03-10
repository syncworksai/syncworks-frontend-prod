// src/components/BusinessCards/StarRating.jsx
import React from "react";

export default function StarRating({ value = 0, outOf = 5, className = "" }) {
  const v = Math.max(0, Math.min(outOf, Number(value) || 0));
  const stars = Array.from({ length: outOf }).map((_, i) => (i + 1 <= v ? "★" : "☆"));

  return (
    <div className={"inline-flex items-center gap-1 text-amber-200 " + className} aria-label={`Rating ${v} of ${outOf}`}>
      {stars.map((s, idx) => (
        <span key={idx} className="text-sm leading-none">
          {s}
        </span>
      ))}
    </div>
  );
}