import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Mail,
  MessageSquareText,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SYNC_HISTORY_KEY = "syncworks_sync_history_v1";
const FOLLOW_UP_DRAFTS_KEY = "syncworks_lead_followup_drafts_v1";

function loadArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage is optional.
  }
}

function dateLabel(value) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function openDraft(draft) {
  if (draft?.channel === "EMAIL" && draft?.destination) {
    window.location.href = `mailto:${draft.destination}?subject=${encodeURIComponent(
      draft.subject || ""
    )}&body=${encodeURIComponent(draft.message || "")}`;
    return;
  }

  if (draft?.channel === "SMS" && draft?.destination) {
    window.location.href = `sms:${draft.destination}?body=${encodeURIComponent(
      draft.message || ""
    )}`;
  }
}

export default function SyncHistory() {
  const navigate = useNavigate();

  const [syncHistory, setSyncHistory] = useState(() =>
    loadArray(SYNC_HISTORY_KEY)
  );
  const [followUpDrafts, setFollowUpDrafts] = useState(() =>
    loadArray(FOLLOW_UP_DRAFTS_KEY)
  );
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("ALL");

  const records = useMemo(() => {
    const briefingRecords = syncHistory.map((item) => ({
      ...item,
      recordType: "BRIEFING",
      searchText: [
        item?.title,
        item?.request,
        item?.summary,
        item?.area,
        ...(Array.isArray(item?.bullets) ? item.bullets : []),
      ]
        .filter(Boolean)
        .join(" "),
    }));

    const draftRecords = followUpDrafts.map((item) => ({
      ...item,
      recordType: "FOLLOW_UP",
      searchText: [
        item?.leadName,
        item?.destination,
        item?.subject,
        item?.message,
        item?.channel,
      ]
        .filter(Boolean)
        .join(" "),
    }));

    const needle = query.trim().toLowerCase();

    return [...briefingRecords, ...draftRecords]
      .filter((item) => tab === "ALL" || item.recordType === tab)
      .filter(
        (item) =>
          !needle ||
          String(item.searchText || "")
            .toLowerCase()
            .includes(needle)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
  }, [followUpDrafts, query, syncHistory, tab]);

  function deleteRecord(record) {
    if (record.recordType === "BRIEFING") {
      const next = syncHistory.filter((item) => item.id !== record.id);
      setSyncHistory(next);
      saveArray(SYNC_HISTORY_KEY, next);
      return;
    }

    const next = followUpDrafts.filter((item) => item.id !== record.id);
    setFollowUpDrafts(next);
    saveArray(FOLLOW_UP_DRAFTS_KEY, next);
  }

  function clearVisible() {
    if (!window.confirm("Clear the currently selected SYNC history category?")) {
      return;
    }

    if (tab === "BRIEFING") {
      setSyncHistory([]);
      saveArray(SYNC_HISTORY_KEY, []);
      return;
    }

    if (tab === "FOLLOW_UP") {
      setFollowUpDrafts([]);
      saveArray(FOLLOW_UP_DRAFTS_KEY, []);
      return;
    }

    setSyncHistory([]);
    setFollowUpDrafts([]);
    saveArray(SYNC_HISTORY_KEY, []);
    saveArray(FOLLOW_UP_DRAFTS_KEY, []);
  }

  return (
    <div className="min-h-dvh bg-[#020617] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_34%)]" />

      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/sync")}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-200"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            SYNC
          </button>

          <div className="text-center">
            <div className="text-lg font-black text-white">SYNC History</div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Briefings and prepared drafts
            </div>
          </div>

          <button
            type="button"
            onClick={clearVisible}
            disabled={!records.length}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-200 disabled:opacity-30"
            aria-label="Clear selected history"
          >
            <Trash2 aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl space-y-5 px-4 pb-24 pt-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/[0.08] p-5">
            <History aria-hidden="true" className="h-5 w-5 text-cyan-200" />
            <div className="mt-3 text-xs text-slate-400">SYNC briefings</div>
            <div className="mt-1 text-3xl font-black text-white">
              {syncHistory.length}
            </div>
          </div>

          <div className="rounded-3xl border border-violet-400/20 bg-violet-500/[0.08] p-5">
            <MessageSquareText
              aria-hidden="true"
              className="h-5 w-5 text-violet-200"
            />
            <div className="mt-3 text-xs text-slate-400">Follow-up drafts</div>
            <div className="mt-1 text-3xl font-black text-white">
              {followUpDrafts.length}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.08] p-5">
            <ShieldCheck
              aria-hidden="true"
              className="h-5 w-5 text-emerald-200"
            />
            <div className="mt-3 text-xs text-slate-400">Approval controlled</div>
            <div className="mt-1 text-lg font-black text-white">
              No automatic sends
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/65 p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4">
              <Search aria-hidden="true" className="h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search actions, leads, messages, or workspace..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                ["ALL", "All"],
                ["BRIEFING", "Briefings"],
                ["FOLLOW_UP", "Drafts"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`min-h-12 rounded-2xl border px-3 text-xs font-black ${
                    tab === value
                      ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-100"
                      : "border-slate-800 bg-slate-950 text-slate-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {records.map((record) =>
            record.recordType === "BRIEFING" ? (
              <article
                key={`briefing-${record.id}`}
                className="rounded-[2rem] border border-cyan-400/15 bg-slate-950/65 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-200">
                        Briefing
                      </span>
                      {record.live ? (
                        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
                          Live data
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-lg font-black text-white">
                      {record.title || "SYNC briefing"}
                    </h2>
                    <div className="mt-1 text-xs text-slate-500">
                      {dateLabel(record.createdAt)} · {record.area || "General"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteRecord(record)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500 hover:text-rose-200"
                    aria-label="Delete briefing"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/55 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Request
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    {record.request || "No request text saved."}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-300">
                  {record.summary}
                </p>

                {Array.isArray(record.bullets) && record.bullets.length ? (
                  <div className="mt-4 space-y-2">
                    {record.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="flex items-start gap-2 text-sm leading-6 text-slate-400"
                      >
                        <Clock3
                          aria-hidden="true"
                          className="mt-1 h-4 w-4 shrink-0 text-cyan-300"
                        />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {record.route ? (
                  <button
                    type="button"
                    onClick={() => navigate(record.route)}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-500/15 px-4 text-sm font-black text-cyan-100"
                  >
                    Open related workspace
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </button>
                ) : null}
              </article>
            ) : (
              <article
                key={`draft-${record.id}`}
                className="rounded-[2rem] border border-violet-400/15 bg-slate-950/65 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-violet-200">
                        Follow-up draft
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-300">
                        {record.channel || "Draft"}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-black text-white">
                      {record.leadName || "Saved lead follow-up"}
                    </h2>
                    <div className="mt-1 text-xs text-slate-500">
                      {dateLabel(record.createdAt)} ·{" "}
                      {record.destination || "No destination"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteRecord(record)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500 hover:text-rose-200"
                    aria-label="Delete draft"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>

                {record.subject ? (
                  <div className="mt-4 flex items-start gap-3 rounded-3xl border border-slate-800 bg-slate-900/55 p-4">
                    <Mail
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-violet-200"
                    />
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        Subject
                      </div>
                      <div className="mt-1 text-sm text-slate-200">
                        {record.subject}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex items-start gap-3 rounded-3xl border border-slate-800 bg-slate-900/55 p-4">
                  <FileText
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200"
                  />
                  <div className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {record.message || "No message saved."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openDraft(record)}
                  disabled={!record.destination}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 text-sm font-black text-white disabled:opacity-40"
                >
                  Reopen in {record.channel === "SMS" ? "text" : "email"}
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </button>
              </article>
            )
          )}

          {!records.length ? (
            <div className="grid min-h-72 place-items-center rounded-[2rem] border border-dashed border-slate-800 bg-slate-950/45 p-6 text-center">
              <div>
                <History
                  aria-hidden="true"
                  className="mx-auto h-10 w-10 text-slate-700"
                />
                <div className="mt-4 text-lg font-black text-white">
                  No matching SYNC history
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Prepared briefings and saved lead drafts will appear here.
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
