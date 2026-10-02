const num = (value) => Number(value || 0);
const pct = (value) => num(value).toFixed(3).replace(/^0(?=\.)/, "");

function safe(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function roundRect(ctx, x, y, w, h, r, fill, stroke = null) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function fitText(ctx, text, maxWidth) {
  let value = String(text || "");
  if (ctx.measureText(value).width <= maxWidth) return value;
  while (value.length > 2 && ctx.measureText(value + "…").width > maxWidth) value = value.slice(0, -1);
  return value + "…";
}

export async function createStatsShareImage({ teamName, scope = "ALL", rows = [] } = {}) {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Stats image export is unavailable in this browser.");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#02060c");
  gradient.addColorStop(0.55, "#07111f");
  gradient.addColorStop(1, "#10071f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(34,211,238,.08)";
  ctx.beginPath();
  ctx.arc(130, 120, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(168,85,247,.08)";
  ctx.beginPath();
  ctx.arc(970, 160, 280, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = "#67e8f9";
  ctx.font = "900 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("SYNCWORKS", 62, 72);
  ctx.fillStyle = "#c4b5fd";
  ctx.font = "800 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("GAME CENTER · TEAM STATS", 62, 104);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 44px system-ui, -apple-system, sans-serif";
  ctx.fillText(fitText(ctx, safe(teamName, "Team Stats"), 770), 62, 168);

  const label = scope === "ALL" ? "COMBINED" : String(scope || "").toUpperCase();
  roundRect(ctx, 820, 124, 195, 56, 28, "rgba(34,211,238,.12)", "rgba(103,232,249,.35)");
  ctx.textAlign = "center";
  ctx.fillStyle = "#cffafe";
  ctx.font = "900 18px system-ui, -apple-system, sans-serif";
  ctx.fillText(label, 917, 159);

  const clean = Array.isArray(rows) ? rows : [];
  const sorted = [...clean].sort((a, b) => num(b.avg) - num(a.avg) || num(b.ops) - num(a.ops) || num(b.h) - num(a.h));

  const leaders = [
    ["AVG", sorted[0] ? pct(sorted[0].avg) : "—", sorted[0]?.player?.display_name || "—"],
    ["OPS", [...clean].sort((a,b)=>num(b.ops)-num(a.ops))[0] ? pct([...clean].sort((a,b)=>num(b.ops)-num(a.ops))[0].ops) : "—", [...clean].sort((a,b)=>num(b.ops)-num(a.ops))[0]?.player?.display_name || "—"],
    ["H", Math.max(0, ...clean.map(r=>num(r.h))), [...clean].sort((a,b)=>num(b.h)-num(a.h))[0]?.player?.display_name || "—"],
    ["HR", Math.max(0, ...clean.map(r=>num(r.hr))), [...clean].sort((a,b)=>num(b.hr)-num(a.hr))[0]?.player?.display_name || "—"],
  ];

  const leaderTop = 215;
  const leaderGap = 12;
  const leaderW = (width - 124 - leaderGap * 3) / 4;
  leaders.forEach(([stat, value, name], index) => {
    const x = 62 + index * (leaderW + leaderGap);
    roundRect(ctx, x, leaderTop, leaderW, 108, 18, "rgba(255,255,255,.035)", "rgba(148,163,184,.14)");
    ctx.textAlign = "left";
    ctx.fillStyle = "#64748b";
    ctx.font = "900 12px system-ui, -apple-system, sans-serif";
    ctx.fillText(stat, x + 16, leaderTop + 25);
    ctx.fillStyle = "#fef3c7";
    ctx.font = "900 27px system-ui, -apple-system, sans-serif";
    ctx.fillText(String(value), x + 16, leaderTop + 58);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "800 12px system-ui, -apple-system, sans-serif";
    ctx.fillText(fitText(ctx, name, leaderW - 32), x + 16, leaderTop + 84);
  });

  const tableTop = 355;
  const x0 = 62;
  const tableW = width - 124;
  const rowH = 60;
  const nameW = 300;
  const statWidths = [105, 105, 105, 84, 84, 84];
  const headers = ["PLAYER", "H / AB", "AVG", "OPS", "HR", "RBI", "R"];
  roundRect(ctx, x0, tableTop, tableW, 54, 14, "rgba(9,20,33,.98)", "rgba(148,163,184,.15)");

  let x = x0;
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "900 12px system-ui, -apple-system, sans-serif";
  ctx.fillText(headers[0], x + 14, tableTop + 34);
  x += nameW;
  headers.slice(1).forEach((header, i) => {
    const w = statWidths[i];
    ctx.textAlign = "center";
    ctx.fillText(header, x + w / 2, tableTop + 34);
    x += w;
  });

  const maxRows = Math.min(sorted.length, 14);
  for (let index = 0; index < maxRows; index += 1) {
    const row = sorted[index];
    const y = tableTop + 54 + index * rowH;
    ctx.fillStyle = index % 2 ? "rgba(255,255,255,.018)" : "rgba(255,255,255,.032)";
    ctx.fillRect(x0, y, tableW, rowH);
    ctx.strokeStyle = "rgba(148,163,184,.07)";
    ctx.beginPath();
    ctx.moveTo(x0, y + rowH);
    ctx.lineTo(x0 + tableW, y + rowH);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#67e8f9";
    ctx.font = "900 12px system-ui, -apple-system, sans-serif";
    ctx.fillText("#" + (index + 1), x0 + 14, y + 37);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 16px system-ui, -apple-system, sans-serif";
    const display = [row.player?.jersey_number ? "#" + row.player.jersey_number : "", row.player?.display_name].filter(Boolean).join(" ");
    ctx.fillText(fitText(ctx, display || "Player", nameW - 68), x0 + 52, y + 37);

    const vals = [
      num(row.h) + "/" + num(row.ab),
      pct(row.avg),
      pct(row.ops),
      num(row.hr),
      num(row.rbi),
      num(row.runs),
    ];
    let sx = x0 + nameW;
    vals.forEach((value, i) => {
      const w = statWidths[i];
      ctx.textAlign = "center";
      ctx.fillStyle = i === 1 ? "#cffafe" : "#e2e8f0";
      ctx.font = i === 1 ? "900 17px system-ui, -apple-system, sans-serif" : "800 15px system-ui, -apple-system, sans-serif";
      ctx.fillText(String(value), sx + w / 2, y + 37);
      sx += w;
    });
  }

  const footerY = 1268;
  ctx.textAlign = "left";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 14px system-ui, -apple-system, sans-serif";
  ctx.fillText("Open the live stats page from the link shared with this image.", 62, footerY);
  ctx.textAlign = "right";
  ctx.fillStyle = "#67e8f9";
  ctx.font = "900 15px system-ui, -apple-system, sans-serif";
  ctx.fillText("SYNCWORKS GAME CENTER", width - 62, footerY);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create stats image.")), "image/png", 0.96);
  });
  const filename = safe(teamName, "team").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() + "-" + label.toLowerCase() + "-stats.png";
  return { blob, filename };
}

export async function shareStatsImage({ teamName, scope, rows, url } = {}) {
  const { blob, filename } = await createStatsShareImage({ teamName, scope, rows });
  const file = typeof File !== "undefined" ? new File([blob], filename, { type: "image/png" }) : null;
  const title = safe(teamName, "Team") + " Stats";
  const text = "View our current " + (scope === "ALL" ? "combined" : String(scope || "").toLowerCase()) + " stats on SyncWorks.";

  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, url, files: [file] });
    return { shared: true, downloaded: false };
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);

  try {
    await navigator.clipboard?.writeText?.(url);
  } catch {}
  return { shared: false, downloaded: true };
}
