import React from "react";

export default function RoleBadge({ user }) {
  if (!user) return null;

  const isGod = !!(user.is_platform_admin || user.is_superuser);

  let label = "Customer";
  let cls = "bg-slate-800 border-slate-700 text-slate-100";

  if (isGod) {
    label = "God Mode";
    cls = "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-100";
  } else if (user.role === "SBO") {
    label = "SBO / CEO";
    cls = "bg-indigo-500/20 border-indigo-500/40 text-indigo-100";
  } else if (user.role === "EMPLOYEE") {
    label = "Employee";
    cls = "bg-emerald-500/20 border-emerald-500/40 text-emerald-100";
  } else if (user.role === "SUB") {
    label = "Subcontractor";
    cls = "bg-cyan-500/20 border-cyan-500/40 text-cyan-100";
  }

  return (
    <span className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-wider rounded-full px-3 py-1 border ${cls}`}>
      <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
