// src/components/customer-health/HealthApiDiagnosticsCard.jsx
import React, { useMemo, useState } from "react";
import { getToken } from "../../api/client";
import {
  getHealthAthleteProfile,
  updateHealthAthleteProfile,
} from "../../api/healthProfiles";

const FALLBACK_KEY =
  "syncworks_health_profile_fallback_probe";

function statusClass(status) {
  if (status === "pass") {
    return "border-lime-300/25 bg-lime-300/[0.07] text-lime-100";
  }
  if (status === "fail") {
    return "border-rose-300/25 bg-rose-300/[0.07] text-rose-100";
  }
  if (status === "running") {
    return "border-cyan-300/25 bg-cyan-300/[0.07] text-cyan-100";
  }
  return "border-white/10 bg-white/[0.03] text-slate-300";
}

function DiagnosticRow({ label, status, detail }) {
  return (
    <div className={`rounded-xl border p-3 ${statusClass(status)}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black text-white">{label}</div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em]">
          {status || "pending"}
        </div>
      </div>
      <div className="mt-1 text-[10px] leading-4 opacity-80">
        {detail}
      </div>
    </div>
  );
}

function safeProfilePatch(profile = {}) {
  return {
    date_of_birth: profile.date_of_birth || null,
    primary_sport: profile.primary_sport || "General Fitness",
    training_experience:
      profile.training_experience || "beginner",
    measurements:
      profile.measurements &&
      typeof profile.measurements === "object"
        ? profile.measurements
        : {},
    requires_plan_review:
      Boolean(profile.requires_plan_review),
  };
}

export default function HealthApiDiagnosticsCard() {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState("");
  const [results, setResults] = useState({
    auth: {
      status: "pending",
      detail: "Authenticated token has not been checked.",
    },
    read: {
      status: "pending",
      detail: "Profile endpoint has not been tested.",
    },
    write: {
      status: "pending",
      detail: "Safe round-trip write has not been tested.",
    },
    readback: {
      status: "pending",
      detail: "Server readback has not been compared.",
    },
    fallback: {
      status: "pending",
      detail: "Browser fallback storage has not been tested.",
    },
  });

  const overall = useMemo(() => {
    const values = Object.values(results);
    if (values.some((item) => item.status === "fail")) {
      return "Attention needed";
    }
    if (
      values.length &&
      values.every((item) => item.status === "pass")
    ) {
      return "All systems passed";
    }
    if (values.some((item) => item.status === "running")) {
      return "Testing";
    }
    return "Not tested";
  }, [results]);

  function updateResult(key, value) {
    setResults((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...value,
      },
    }));
  }

  async function runDiagnostics() {
    if (running) return;

    setRunning(true);
    setLastRunAt("");
    setResults((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, value]) => [
          key,
          {
            ...value,
            status: "running",
            detail: "Testing...",
          },
        ])
      )
    );

    try {
      const token = getToken();

      if (!token) {
        updateResult("auth", {
          status: "fail",
          detail:
            "No authenticated SyncWorks token is available. Log in again before testing.",
        });
        throw new Error("Authenticated token is missing.");
      }

      updateResult("auth", {
        status: "pass",
        detail:
          "Authenticated token is available. The token value was not displayed or logged.",
      });

      const firstRead = await getHealthAthleteProfile();

      if (!firstRead || !firstRead.id) {
        throw new Error(
          "Profile endpoint returned no persisted profile identifier."
        );
      }

      updateResult("read", {
        status: "pass",
        detail: `Profile loaded from the authenticated API. Version ${firstRead.profile_version || 1}.`,
      });

      const patch = safeProfilePatch(firstRead);
      const writeResult =
        await updateHealthAthleteProfile(patch);

      if (!writeResult || !writeResult.id) {
        throw new Error(
          "Profile write returned no persisted profile identifier."
        );
      }

      updateResult("write", {
        status: "pass",
        detail:
          "Safe no-change profile write completed. Existing values were sent back without intentionally changing the athlete profile.",
      });

      const secondRead = await getHealthAthleteProfile();

      const sameId =
        String(firstRead.id) === String(secondRead?.id);
      const versionAdvanced =
        Number(secondRead?.profile_version || 0) >=
        Number(writeResult?.profile_version || 0);

      if (!sameId || !versionAdvanced) {
        throw new Error(
          "Readback did not match the persisted profile."
        );
      }

      updateResult("readback", {
        status: "pass",
        detail: `Readback matched profile ID ${secondRead.id}. Server version is ${secondRead.profile_version || "available"}.`,
      });

      try {
        const probe = {
          at: new Date().toISOString(),
          profileId: secondRead.id,
        };

        localStorage.setItem(
          FALLBACK_KEY,
          JSON.stringify(probe)
        );

        const restored = JSON.parse(
          localStorage.getItem(FALLBACK_KEY) || "{}"
        );

        localStorage.removeItem(FALLBACK_KEY);

        if (
          String(restored.profileId) !==
          String(secondRead.id)
        ) {
          throw new Error(
            "Fallback probe did not restore correctly."
          );
        }

        updateResult("fallback", {
          status: "pass",
          detail:
            "Browser fallback storage wrote, restored, and removed a temporary probe successfully.",
        });
      } catch (error) {
        updateResult("fallback", {
          status: "fail",
          detail:
            error?.message ||
            "Browser fallback storage is unavailable.",
        });
      }

      setLastRunAt(new Date().toLocaleString());
    } catch (error) {
      setResults((current) => {
        const next = { ...current };

        for (const [key, value] of Object.entries(next)) {
          if (value.status === "running") {
            next[key] = {
              ...value,
              status: "fail",
              detail:
                error?.message ||
                "Diagnostic stopped before this check completed.",
            };
          }
        }

        return next;
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-violet-300/18 bg-[linear-gradient(145deg,rgba(12,8,18,0.98),rgba(4,2,7,0.99))] p-4 shadow-[0_0_34px_rgba(139,92,246,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
            Health API Diagnostics
          </div>
          <h2 className="mt-1 text-xl font-black text-white">
            Persistence and fallback verification
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Run an authenticated production check of profile read, safe write, server readback, and browser fallback storage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 rounded-xl border border-violet-300/25 bg-violet-300/10 px-3 py-2 text-[10px] font-black text-violet-100"
        >
          {expanded ? "Close" : "Open"}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
            Current status
          </div>
          <div className="mt-1 text-sm font-black text-white">
            {overall}
          </div>
        </div>

        {lastRunAt ? (
          <div className="text-right text-[9px] text-slate-500">
            Last run
            <div className="mt-1 font-bold text-slate-300">
              {lastRunAt}
            </div>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <DiagnosticRow label="Authentication" {...results.auth} />
            <DiagnosticRow label="Profile read" {...results.read} />
            <DiagnosticRow label="Safe write" {...results.write} />
            <DiagnosticRow label="Server readback" {...results.readback} />
            <DiagnosticRow label="Local fallback" {...results.fallback} />
          </div>

          <button
            type="button"
            disabled={running}
            onClick={runDiagnostics}
            className="h-12 w-full rounded-xl border border-violet-300/35 bg-violet-300/10 text-sm font-black text-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running
              ? "Running Diagnostics..."
              : "Run Safe Persistence Test"}
          </button>

          <div className="text-[10px] leading-4 text-slate-500">
            The test reads your authenticated profile, writes the same existing values back, verifies the saved record, and tests temporary browser storage. It does not display your token or intentionally reset your program.
          </div>
        </div>
      ) : null}
    </section>
  );
}
