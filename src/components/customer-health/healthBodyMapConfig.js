// src/components/customer-health/healthBodyMapConfig.js

export const HEALTH_BODY_MAP_GROUPS = [
  { id: "Chest", label: "Chest", color: "#ff5e7d", side: "front" },
  { id: "Shoulders", label: "Shoulders", color: "#ffc857", side: "both" },
  { id: "Biceps", label: "Biceps", color: "#70ff3d", side: "front" },
  { id: "Triceps", label: "Triceps", color: "#8b5cff", side: "back" },
  { id: "Forearms", label: "Forearms", color: "#34dfff", side: "both" },
  { id: "Abs", label: "Abs", color: "#2f8cff", side: "front" },
  { id: "Obliques", label: "Obliques", color: "#ff9f2e", side: "front" },
  { id: "Quads", label: "Quads", color: "#d95cff", side: "front" },
  { id: "Hamstrings", label: "Hamstrings", color: "#8b5cff", side: "back" },
  { id: "Calves", label: "Calves", color: "#ff6b5e", side: "both" },
  { id: "Traps", label: "Traps", color: "#ff6f9e", side: "back" },
  { id: "Lats", label: "Lats", color: "#70d95c", side: "back" },
  { id: "Lower Back", label: "Lower Back", color: "#2f8cff", side: "back" },
  { id: "Glutes", label: "Glutes", color: "#ff9f2e", side: "back" },
  { id: "Adductors", label: "Adductors", color: "#34dfff", side: "front" },
  { id: "Hip Flexors", label: "Hip Flexors", color: "#39ff88", side: "front" },
];

export const HEALTH_BODY_MAP_ALIASES = {
  Chest: ["Chest", "Pectorals"],
  Shoulders: ["Shoulders", "Delts", "Deltoids"],
  Biceps: ["Biceps"],
  Triceps: ["Triceps"],
  Forearms: ["Forearms", "Grip"],
  Abs: ["Abs", "Core", "Rectus Abdominis"],
  Obliques: ["Obliques", "Core"],
  Quads: ["Quads", "Quadriceps"],
  Hamstrings: ["Hamstrings"],
  Calves: ["Calves"],
  Traps: ["Traps", "Trapezius", "Upper Back"],
  Lats: ["Lats", "Latissimus Dorsi", "Back"],
  "Lower Back": ["Lower Back", "Erector Spinae", "Back"],
  Glutes: ["Glutes", "Gluteus Maximus"],
  Adductors: ["Adductors", "Inner Thigh"],
  "Hip Flexors": ["Hip Flexors", "Psoas", "Hip"],
};

export function exerciseMatchesBodyGroup(exercise, group) {
  if (!group || group === "All") return true;
  const aliases = HEALTH_BODY_MAP_ALIASES[group] || [group];
  const haystack = [
    exercise?.name,
    exercise?.category,
    exercise?.movement_pattern,
    exercise?.feel,
    ...(exercise?.primary_muscles || []),
    ...(exercise?.secondary_muscles || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return aliases.some((alias) =>
    haystack.includes(String(alias).toLowerCase())
  );
}
