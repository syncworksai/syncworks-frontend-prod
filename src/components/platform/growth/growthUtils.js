export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.value)) return data.value;
  return [];
}

export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export function toneFromStatus(status) {
  const s = String(status || "").toUpperCase();
  if (["ACTIVE", "LIVE", "OPEN", "RUNNING", "CONNECTED", "PUBLISHED", "HEALTHY"].includes(s)) return "emerald";
  if (["NEW", "PENDING", "QUEUED", "WARM", "SCHEDULED"].includes(s)) return "cyan";
  if (["PAUSED", "WAITING", "IDLE", "DRAFT", "PLANNED", "WARN"].includes(s)) return "amber";
  if (["FAILED", "ERROR", "BLOCKED", "DROPPED", "LOST", "EXPIRED", "MISSING"].includes(s)) return "rose";
  if (["QUALIFIED", "IN_PROGRESS"].includes(s)) return "purple";
  return "slate";
}

export function normalizeSource(v) {
  const raw = String(v || "").trim().toLowerCase();
  if (!raw) return "Manual";
  if (raw.includes("facebook")) return "Facebook Ads";
  if (raw.includes("instagram")) return "Instagram";
  if (raw.includes("google")) return "Google";
  if (raw.includes("referral")) return "Referral";
  if (raw.includes("website") || raw.includes("web")) return "Website";
  if (raw.includes("manual")) return "Manual";
  return "Manual";
}

export function sourceTone(source) {
  if (source === "Facebook Ads") return "cyan";
  if (source === "Instagram") return "purple";
  if (source === "Google") return "emerald";
  if (source === "Referral") return "amber";
  if (source === "Website") return "slate";
  return "slate";
}