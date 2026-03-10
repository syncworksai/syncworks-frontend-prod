// src/components/upgrade/utils.js

export function daysUntil(dateString) {
  if (!dateString) return 0;

  const now = new Date();
  const d = new Date(dateString);

  if (Number.isNaN(d.getTime())) return 0;

  const diffMs = d.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}