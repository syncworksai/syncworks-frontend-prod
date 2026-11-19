/**
 * Extract only SyncWorks-issued business-card codes. Never trust arbitrary
 * QR URLs as destinations or use them as API endpoints.
 */
export function extractBusinessCardCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^SW-[A-Za-z0-9_-]{8,80}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !["syncworksapp.com","www.syncworksapp.com"].includes(url.hostname.toLowerCase())) return "";
    if (!["/customer/rolodex","/customer/business-cards"].includes(url.pathname.replace(/\/$/, ""))) return "";
    const code = url.searchParams.get("code") || "";
    return /^SW-[A-Za-z0-9_-]{8,80}$/.test(code) ? code : "";
  } catch { return ""; }
}
