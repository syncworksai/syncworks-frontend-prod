const num = (value) => Number(value || 0);
const list = (value) => Array.isArray(value) ? value : [];

function playerId(row) {
  return Number(row?.player ?? row?.player_detail?.id ?? row?.id ?? 0);
}

function playerDetail(row) {
  return row?.player_detail || (row?.display_name ? row : {}) || {};
}

function safeName(value, fallback = "Player") {
  const text = String(value || "").trim();
  return text || fallback;
}

function metricsFor(plays) {
  const rows = list(plays);
  let ab = 0;
  let h = 0;
  let rbi = 0;
  let runs = 0;
  let hr = 0;
  for (const play of rows) {
    if (!["BB", "SF"].includes(play.result)) ab += 1;
    if (["1B", "2B", "3B", "HR"].includes(play.result)) h += 1;
    if (play.result === "HR") hr += 1;
    rbi += num(play.rbi);
    runs += num(play.runs_scored);
  }
  return { ab, h, rbi, runs, hr };
}

function resultText(play) {
  if (!play) return "";
  const main = String(play.result || "");
  const extras = [];
  if (num(play.rbi)) extras.push(`${num(play.rbi)} RBI`);
  if (num(play.runs_scored)) extras.push(`+${num(play.runs_scored)} R`);
  return [main, ...extras].join(" · ");
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke = null) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
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

function downloadBlob(blob, filename, title) {
  const file = typeof File !== "undefined" ? new File([blob], filename, { type: "image/png" }) : null;
  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    return navigator.share({ files: [file], title }).catch(() => {});
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return Promise.resolve();
}

export async function saveGameBookImage({
  game,
  bookPlayers = [],
  plays = [],
  innings = [],
  gameTotals = null,
  title = "SyncWorks Game Center",
} = {}) {
  if (!game) throw new Error("Game data is required.");

  const playerRows = list(bookPlayers);
  const allPlays = list(plays);
  const inningNumbers = list(innings).length
    ? list(innings).map((row) => num(row?.inning ?? row)).filter(Boolean)
    : Array.from({ length: Math.max(7, num(game?.current_inning) || 1) }, (_, index) => index + 1);

  const playerCol = 330;
  const inningWidth = 128;
  const statWidth = 105;
  const statKeys = ["H/AB", "R", "RBI", "HR"];
  const width = Math.max(1500, 90 + playerCol + inningNumbers.length * inningWidth + statKeys.length * statWidth + 90);
  const rowHeight = 84;
  const top = 330;
  const scoreHeight = 118;
  const tableTop = top + scoreHeight + 44;
  const height = Math.max(980, tableTop + 82 + Math.max(1, playerRows.length) * rowHeight + 130);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image export is unavailable in this browser.");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#02060c");
  bg.addColorStop(0.55, "#061321");
  bg.addColorStop(1, "#120827");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(34,211,238,.08)";
  ctx.beginPath();
  ctx.arc(width * 0.12, 160, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(192,132,252,.07)";
  ctx.beginPath();
  ctx.arc(width * 0.9, 180, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = "#67e8f9";
  ctx.font = "800 30px system-ui, -apple-system, sans-serif";
  ctx.fillText("SYNCWORKS", 70, 72);
  ctx.fillStyle = "#c4b5fd";
  ctx.font = "700 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("GAME CENTER · DIGITAL GAME BOOK", 70, 108);

  const finalLabel = String(game.status || "").toUpperCase() === "FINAL" ? "FINAL" : String(game.status || "GAME").toUpperCase();
  drawRoundedRect(ctx, width - 230, 54, 160, 62, 30, "rgba(52,211,153,.12)", "rgba(110,231,183,.35)");
  ctx.textAlign = "center";
  ctx.fillStyle = "#a7f3d0";
  ctx.font = "800 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(finalLabel, width - 150, 94);

  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 28px system-ui, -apple-system, sans-serif";
  ctx.fillText(safeName(game.team_name, "Team"), width * 0.28, 176);
  ctx.fillText(safeName(game.opponent_name, "Opponent"), width * 0.72, 176);
  ctx.fillStyle = "#ecfeff";
  ctx.font = "900 82px system-ui, -apple-system, sans-serif";
  ctx.fillText(String(num(game.runs_for)), width * 0.28, 260);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(num(game.runs_against)), width * 0.72, 260);
  ctx.fillStyle = "#64748b";
  ctx.font = "800 24px system-ui, -apple-system, sans-serif";
  ctx.fillText("—", width / 2, 232);

  const dateText = game.start_at ? new Date(game.start_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
  ctx.font = "600 18px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText([dateText, game.venue_name].filter(Boolean).join(" · "), width / 2, 300);

  const inningGrid = new Map([
    ...list(innings),
    ...list(game.inning_grid),
  ].map((row) => [num(row.inning), row]));
  const left = 70;
  const right = width - 70;
  drawRoundedRect(ctx, left, top, right - left, scoreHeight, 24, "rgba(7,17,31,.92)", "rgba(148,163,184,.18)");
  const scoreLabelWidth = 270;
  const scoreInningWidth = Math.min(96, (right - left - scoreLabelWidth - 150) / Math.max(1, inningNumbers.length));
  ctx.textAlign = "left";
  ctx.font = "800 17px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("LINE SCORE", left + 24, top + 30);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillText(safeName(game.team_name, "Team"), left + 24, top + 62);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(safeName(game.opponent_name, "Opponent"), left + 24, top + 94);

  inningNumbers.forEach((inning, index) => {
    const x = left + scoreLabelWidth + index * scoreInningWidth;
    const row = inningGrid.get(inning) || {};
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748b";
    ctx.font = "800 15px system-ui, -apple-system, sans-serif";
    ctx.fillText(String(inning), x + scoreInningWidth / 2, top + 28);
    ctx.fillStyle = "#cffafe";
    ctx.fillText(String(num(row.runs)), x + scoreInningWidth / 2, top + 62);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(String(num(row.opponent_runs)), x + scoreInningWidth / 2, top + 94);
  });

  const totalX = right - 110;
  ctx.textAlign = "center";
  ctx.fillStyle = "#67e8f9";
  ctx.fillText("R", totalX, top + 28);
  ctx.fillStyle = "#cffafe";
  ctx.font = "900 20px system-ui, -apple-system, sans-serif";
  ctx.fillText(String(num(game.runs_for)), totalX, top + 62);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(num(game.runs_against)), totalX, top + 94);

  const xPlayer = left;
  const xInnings = xPlayer + playerCol;
  const xStats = xInnings + inningNumbers.length * inningWidth;
  const tableWidth = playerCol + inningNumbers.length * inningWidth + statKeys.length * statWidth;

  ctx.fillStyle = "rgba(7,17,31,.96)";
  ctx.fillRect(xPlayer, tableTop, tableWidth, 64);
  ctx.strokeStyle = "rgba(148,163,184,.18)";
  ctx.strokeRect(xPlayer, tableTop, tableWidth, 64);
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748b";
  ctx.font = "800 17px system-ui, -apple-system, sans-serif";
  ctx.fillText("PLAYER", xPlayer + 18, tableTop + 39);
  inningNumbers.forEach((inning, index) => {
    ctx.textAlign = "center";
    ctx.fillText(String(inning), xInnings + index * inningWidth + inningWidth / 2, tableTop + 39);
  });
  statKeys.forEach((key, index) => {
    ctx.fillStyle = "#67e8f9";
    ctx.fillText(key, xStats + index * statWidth + statWidth / 2, tableTop + 39);
  });

  playerRows.forEach((row, rowIndex) => {
    const y = tableTop + 64 + rowIndex * rowHeight;
    ctx.fillStyle = rowIndex % 2 ? "rgba(255,255,255,.018)" : "rgba(255,255,255,.035)";
    ctx.fillRect(xPlayer, y, tableWidth, rowHeight);
    ctx.strokeStyle = "rgba(148,163,184,.09)";
    ctx.beginPath();
    ctx.moveTo(xPlayer, y + rowHeight);
    ctx.lineTo(xPlayer + tableWidth, y + rowHeight);
    ctx.stroke();

    const detail = playerDetail(row);
    const id = playerId(row);
    const playerPlays = allPlays.filter((play) => num(play.player) === id);
    const stats = row.stats || metricsFor(playerPlays);
    const order = row.batting_order ? `${row.batting_order}. ` : "";

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 18px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${order}${safeName(detail.display_name)}`, xPlayer + 18, y + 32);
    ctx.fillStyle = "#64748b";
    ctx.font = "600 14px system-ui, -apple-system, sans-serif";
    ctx.fillText([detail.jersey_number ? `#${detail.jersey_number}` : "", detail.primary_position].filter(Boolean).join(" · "), xPlayer + 18, y + 56);

    inningNumbers.forEach((inning, inningIndex) => {
      const cellPlays = playerPlays.filter((play) => num(play.inning) === inning);
      const cx = xInnings + inningIndex * inningWidth + inningWidth / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = cellPlays.some((play) => ["1B", "2B", "3B", "HR"].includes(play.result)) ? "#a7f3d0" : "#cbd5e1";
      ctx.font = "800 15px system-ui, -apple-system, sans-serif";
      const label = cellPlays.map(resultText).join(" / ");
      const clipped = label.length > 16 ? label.slice(0, 15) + "…" : label;
      ctx.fillText(clipped || "—", cx, y + 45);
    });

    const statValues = [`${num(stats.h)}/${num(stats.ab)}`, num(stats.runs), num(stats.rbi), num(stats.hr)];
    statValues.forEach((value, index) => {
      ctx.textAlign = "center";
      ctx.fillStyle = index === 0 ? "#cffafe" : "#e2e8f0";
      ctx.font = "900 18px system-ui, -apple-system, sans-serif";
      ctx.fillText(String(value), xStats + index * statWidth + statWidth / 2, y + 46);
    });
  });

  const totals = gameTotals || metricsFor(allPlays);
  const footerY = tableTop + 64 + Math.max(1, playerRows.length) * rowHeight + 42;
  ctx.textAlign = "left";
  ctx.fillStyle = "#67e8f9";
  ctx.font = "800 18px system-ui, -apple-system, sans-serif";
  ctx.fillText(`TEAM TOTALS · ${num(totals.h)} H · ${num(totals.rbi)} RBI · ${num(totals.hr)} HR`, left, footerY);
  ctx.textAlign = "right";
  ctx.fillStyle = "#64748b";
  ctx.font = "600 15px system-ui, -apple-system, sans-serif";
  ctx.fillText("Generated by SyncWorks Game Center", right, footerY);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create the image.")), "image/png", 0.96);
  });
  const base = [safeName(game.team_name, "game"), safeName(game.opponent_name, "opponent"), String(game.status || "game")].join("-").replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").toLowerCase();
  await downloadBlob(blob, `${base}-game-book.png`, `${game.team_name || "SyncWorks"} Game Book`);
}
