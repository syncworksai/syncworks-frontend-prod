const num = (value) => Number(value || 0);

export const TEAM_RATE_GREEN_DELTA = 0.05;

export function aggregateTeamRates(rows) {
  const clean = Array.isArray(rows) ? rows : [];
  const totals = clean.reduce((acc, row) => {
    acc.ab += num(row?.ab);
    acc.h += num(row?.h);
    acc.bb += num(row?.bb);
    acc.sf += num(row?.sf);
    acc.tb += num(row?.tb);
    return acc;
  }, { ab: 0, h: 0, bb: 0, sf: 0, tb: 0 });

  const avg = totals.ab ? totals.h / totals.ab : 0;
  const obpDen = totals.ab + totals.bb + totals.sf;
  const obp = obpDen ? (totals.h + totals.bb) / obpDen : 0;
  const slg = totals.ab ? totals.tb / totals.ab : 0;
  return {
    avg,
    obp,
    slg,
    ops: obp + slg,
  };
}

export function rateBenchmarkStatus(value, teamAverage, greenDelta = TEAM_RATE_GREEN_DELTA) {
  const player = Number(value);
  const team = Number(teamAverage);
  if (!Number.isFinite(player) || !Number.isFinite(team)) return "neutral";
  if (player < team) return "red";
  if (player >= team + greenDelta) return "green";
  return "yellow";
}

export function rateBenchmarkClasses(status, { subtle = false } = {}) {
  const styles = {
    green: subtle
      ? "border-emerald-300/20 bg-emerald-300/[.055] text-emerald-100"
      : "border-emerald-300/35 bg-emerald-300/10 text-emerald-100",
    yellow: subtle
      ? "border-amber-300/20 bg-amber-300/[.05] text-amber-100"
      : "border-amber-300/35 bg-amber-300/10 text-amber-100",
    red: subtle
      ? "border-rose-300/20 bg-rose-300/[.05] text-rose-100"
      : "border-rose-300/35 bg-rose-300/10 text-rose-100",
    neutral: "border-white/10 bg-white/[.025] text-slate-200",
  };
  return styles[status] || styles.neutral;
}

export function rateBenchmarkLabel(status) {
  if (status === "green") return "Above standard";
  if (status === "yellow") return "At / above team avg";
  if (status === "red") return "Below team avg";
  return "No benchmark";
}
