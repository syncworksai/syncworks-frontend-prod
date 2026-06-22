// src/components/ModeBar.jsx
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import NotificationsBell from "./NotificationsBell";
import BusinessPicker from "./BusinessPicker";

import api, {
  getActiveBusinessId,
} from "../api/client";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function Pill({
  children,
  className = "",
}) {
  return (
    <span
      className={
        "rounded-full border px-2 py-1 text-[11px] " +
        className
      }
    >
      {children}
    </span>
  );
}

function ModuleBadge({
  children,
  tone = "cyan",
}) {
  const tones = {
    cyan:
      "border-cyan-500/35 bg-cyan-500/12 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.14)]",

    indigo:
      "border-indigo-500/35 bg-indigo-500/12 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.14)]",

    fuchsia:
      "border-fuchsia-500/35 bg-fuchsia-500/12 text-fuchsia-200 shadow-[0_0_20px_rgba(217,70,239,0.14)]",

    emerald:
      "border-emerald-500/35 bg-emerald-500/12 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.14)]",

    slate:
      "border-slate-700 bg-slate-900/60 text-slate-200",
  };

  return (
    <span
      className={cx(
        "inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em]",
        tones[tone] || tones.cyan
      )}
    >
      {children}
    </span>
  );
}

function GearIcon({
  className = "",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M19.4 13.02c.05-.33.08-.67.08-1.02s-.03-.69-.08-1.02l2.02-1.57a.7.7 0 0 0 .17-.88l-1.91-3.31a.7.7 0 0 0-.83-.31l-2.39.96a7.6 7.6 0 0 0-1.77-1.02l-.36-2.53A.7.7 0 0 0 13.65 0h-3.3a.7.7 0 0 0-.69.59L9.3 3.12c-.63.25-1.22.58-1.77 1.02l-2.39-.96a.7.7 0 0 0-.83.31L2.4 6.8a.7.7 0 0 0 .17.88l2.02 1.57c-.05.33-.08.67-.08 1.02s.03.69.08 1.02L2.57 14.6a.7.7 0 0 0-.17.88l1.91 3.31c.18.31.55.43.88.31l2.39-.96c.55.44 1.14.77 1.77 1.02l.36 2.53c.05.34.35.59.69.59h3.3c.34 0 .64-.25.69-.59l.36-2.53c.63-.25 1.22-.58 1.77-1.02l2.39.96c.33.12.7 0 .88-.31l1.91-3.31a.7.7 0 0 0-.17-.88l-2.02-1.57Z"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.9"
      />
    </svg>
  );
}

function ProfileIcon({
  className = "",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M20 21a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon({
  className = "",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M14 12H3m0 0 3-3M3 12l3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportIcon({
  className = "",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2a8 8 0 0 0-8 8v3a4 4 0 0 0 4 4h1v-7H6V10a6 6 0 1 1 12 0v.5h-3v7h1a4 4 0 0 0 4-4v-3a8 8 0 0 0-8-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M9 20h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FeedIcon({
  className = "",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6h12M6 11h12M6 16h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M20 20V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.9"
      />
    </svg>
  );
}

function PlusIcon({
  className = "",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuIcon({
  className = "",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightIcon({
  className = "",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RightActions({
  rightActions,
}) {
  const isConfigArray =
    Array.isArray(rightActions) &&
    rightActions.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.label === "string" &&
        typeof item.onClick === "function"
    );

  if (!rightActions) {
    return null;
  }

  if (!isConfigArray) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        {rightActions}
      </div>
    );
  }

  function toneClass(tone) {
    if (tone === "cyan") {
      return "border border-cyan-500/35 bg-cyan-500/18 text-cyan-100 hover:bg-cyan-500/24";
    }

    if (tone === "indigo") {
      return "border border-indigo-500/35 bg-indigo-500/18 text-indigo-100 hover:bg-indigo-500/24";
    }

    if (tone === "fuchsia") {
      return "border border-fuchsia-500/28 bg-fuchsia-500/14 text-fuchsia-100 hover:bg-fuchsia-500/20";
    }

    if (tone === "emerald") {
      return "border border-emerald-500/28 bg-emerald-500/14 text-emerald-100 hover:bg-emerald-500/18";
    }

    return "border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40";
  }

  return (
    <div className="hidden items-center gap-2 md:flex">
      {rightActions.map(
        (action, index) => (
          <button
            key={`${action.label}-${index}`}
            type="button"
            title={
              action.title ||
              action.label
            }
            onClick={action.onClick}
            disabled={!!action.disabled}
            className={cx(
              "inline-flex h-10 items-center justify-center rounded-2xl px-4 text-xs transition",
              toneClass(action.tone),
              action.disabled
                ? "cursor-not-allowed opacity-50"
                : ""
            )}
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
  tone = "slate",
  className = "",
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/16"
      : tone === "fuchsia"
      ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/16"
      : "border-slate-800 bg-slate-950/55 text-slate-300 hover:border-transparent hover:bg-slate-900/60 hover:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cx(
        "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
        toneClass,
        className
      )}
    >
      {children}
    </button>
  );
}

function DrawerItem({
  label,
  subtitle = "",
  active = false,
  locked = false,
  onClick,
  tone = "cyan",
}) {
  const tones = {
    cyan:
      "border-cyan-500/25 bg-cyan-500/8 text-cyan-100",

    indigo:
      "border-indigo-500/25 bg-indigo-500/8 text-indigo-100",

    fuchsia:
      "border-fuchsia-500/25 bg-fuchsia-500/8 text-fuchsia-100",

    emerald:
      "border-emerald-500/25 bg-emerald-500/8 text-emerald-100",

    slate:
      "border-slate-800 bg-slate-950/45 text-slate-100",

    rose:
      "border-rose-500/25 bg-rose-500/8 text-rose-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left transition",
        tones[tone] || tones.slate,
        active
          ? "ring-1 ring-cyan-300/35 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
          : "",
        locked
          ? "opacity-75"
          : "hover:bg-slate-900/60"
      )}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-black text-white">
            {label}
          </span>

          {active ? (
            <span className="rounded-full border border-cyan-400/35 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-cyan-200">
              Active
            </span>
          ) : null}

          {locked ? (
            <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-300">
              Locked
            </span>
          ) : null}
        </span>

        {subtitle ? (
          <span className="mt-1 block truncate text-xs text-slate-400">
            {subtitle}
          </span>
        ) : null}
      </span>

      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}

function normalizeBusinesses(
  myBusinesses
) {
  const list = Array.isArray(
    myBusinesses
  )
    ? myBusinesses
    : [];

  return list
    .map((item) => {
      if (!item) {
        return null;
      }

      if (
        item.business &&
        typeof item.business ===
          "object"
      ) {
        return item.business;
      }

      return item;
    })
    .filter(Boolean);
}

function safeStr(value) {
  return String(value || "").trim();
}

function toNiceName({
  first,
  last,
  fallback = "",
}) {
  const firstName = safeStr(first);
  const lastName = safeStr(last);

  const fullName =
    `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    safeStr(fallback)
  );
}

function normalizeApiError(error) {
  const data =
    error?.response?.data;

  if (!data) {
    return (
      error?.message ||
      "Request failed."
    );
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return String(data.detail);
  }

  if (
    typeof data === "object"
  ) {
    return Object.entries(data)
      .map(([key, value]) => {
        const output =
          Array.isArray(value)
            ? value.join(", ")
            : String(value);

        return `${key}: ${output}`;
      })
      .join(" • ");
  }

  return "Request failed.";
}

function setActiveBusinessEverywhere(
  businessId
) {
  if (!businessId) {
    return;
  }

  const id = String(businessId);

  try {
    localStorage.setItem(
      "activeBusinessId",
      id
    );

    localStorage.setItem(
      "active_business_id",
      id
    );

    localStorage.setItem(
      "sw_active_business_id",
      id
    );

    localStorage.setItem(
      "syncworks_active_business_id",
      id
    );
  } catch {
    // no-op
  }

  try {
    window.dispatchEvent(
      new CustomEvent(
        "sw:activeBusinessChanged",
        {
          detail: {
            businessId: id,
          },
        }
      )
    );
  } catch {
    // no-op
  }
}

function CreateBusinessDrawer({
  open,
  onClose,
  onCreated,
}) {
  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [form, setForm] =
    useState({
      name: "",
      phone: "",
      base_zip: "",
      accepts_marketplace_tickets:
        true,
      access_code: "",
    });

  useEffect(() => {
    if (!open) {
      return;
    }

    setError("");
    setSuccess("");
  }, [open]);

  if (!open) {
    return null;
  }

  async function submit() {
    setError("");
    setSuccess("");

    const name =
      safeStr(form.name);

    const baseZip =
      safeStr(form.base_zip);

    const phone =
      safeStr(form.phone);

    const accessCode =
      safeStr(form.access_code);

    if (!name) {
      setError(
        "Business name is required."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        base_zip:
          baseZip || undefined,
        phone:
          phone || undefined,
        accepts_marketplace_tickets:
          !!form.accepts_marketplace_tickets,
      };

      let created = null;

      try {
        const response =
          await api.post(
            "/businesses/",
            payload
          );

        created =
          response.data;
      } catch {
        const fallbackPayload = {
          name,
          business_name: name,
          base_zip:
            baseZip || "",
          phone:
            phone || "",
          accepts_marketplace_tickets:
            !!form.accepts_marketplace_tickets,
        };

        const response =
          await api.post(
            "/businesses/",
            fallbackPayload
          );

        created =
          response.data;
      }

      const businessId =
        created?.id ||
        created?.business_id ||
        created?.business?.id ||
        created?.business
          ?.business_id;

      if (businessId) {
        setActiveBusinessEverywhere(
          businessId
        );
      }

      if (accessCode) {
        try {
          await api.post(
            "/access-codes/redeem/",
            {
              code: accessCode,
              business_id:
                businessId ||
                undefined,
            }
          );
        } catch {
          try {
            await api.post(
              "/businesses/redeem-access-code/",
              {
                code:
                  accessCode,
                business_id:
                  businessId ||
                  undefined,
              }
            );
          } catch {
            // Do not block business
            // creation if the optional
            // code endpoint differs.
          }
        }
      }

      setSuccess(
        "Business created. Opening setup..."
      );

      setForm({
        name: "",
        phone: "",
        base_zip: "",
        accepts_marketplace_tickets:
          true,
        access_code: "",
      });

      window.setTimeout(() => {
        onCreated?.(created);
      }, 250);
    } catch (requestError) {
      setError(
        normalizeApiError(
          requestError
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={
          saving
            ? undefined
            : onClose
        }
      />

      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-cyan-500/20 bg-slate-950 shadow-[0_0_80px_rgba(34,211,238,0.16)] md:inset-y-4 md:left-auto md:right-4 md:w-[460px] md:rounded-[2rem]">
        <div className="relative overflow-hidden border-b border-slate-800 px-5 py-5">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Business Setup
              </div>

              <div className="mt-2 text-xl font-black text-white">
                Create a business
              </div>

              <div className="mt-1 text-sm text-slate-400">
                Add the business, set
                the active business,
                then continue setup.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          {error ? (
            <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <div>
            <label className="text-xs font-semibold text-slate-400">
              Business name{" "}
              <span className="text-rose-300">
                *
              </span>
            </label>

            <input
              value={form.name}
              onChange={(event) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    name:
                      event.target
                        .value,
                  })
                )
              }
              className="mt-1 h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
              placeholder="Jacob's Lawn Care"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-400">
                Base ZIP
              </label>

              <input
                value={
                  form.base_zip
                }
                onChange={(event) =>
                  setForm(
                    (previous) => ({
                      ...previous,
                      base_zip:
                        event.target
                          .value,
                    })
                  )
                }
                className="mt-1 h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
                placeholder="36117"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">
                Phone
              </label>

              <input
                value={form.phone}
                onChange={(event) =>
                  setForm(
                    (previous) => ({
                      ...previous,
                      phone:
                        event.target
                          .value,
                    })
                  )
                }
                className="mt-1 h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
                placeholder="334..."
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <input
              type="checkbox"
              checked={
                !!form.accepts_marketplace_tickets
              }
              onChange={(event) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    accepts_marketplace_tickets:
                      event.target
                        .checked,
                  })
                )
              }
              className="mt-1"
            />

            <span>
              <span className="block text-sm font-semibold text-slate-100">
                Accept marketplace
                requests
              </span>

              <span className="mt-1 block text-xs text-slate-500">
                Allows matching
                requests in this
                business ZIP/service
                area once services are
                configured.
              </span>
            </span>
          </label>

          <div>
            <label className="text-xs font-semibold text-slate-400">
              Access code
            </label>

            <input
              value={
                form.access_code
              }
              onChange={(event) =>
                setForm(
                  (previous) => ({
                    ...previous,
                    access_code:
                      event.target
                        .value,
                  })
                )
              }
              className="mt-1 h-11 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
              placeholder="Optional lifetime / promo code"
            />

            <div className="mt-1 text-[11px] text-slate-500">
              Business creation will
              not fail if the
              access-code endpoint
              needs separate backend
              wiring.
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Creating..."
              : "Create Business"}
          </button>

          <button
            type="button"
            onClick={() => {
              onClose?.();

              window.location.href =
                "/upgrade";
            }}
            disabled={saving}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-5 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/15 disabled:opacity-50"
          >
            Use upgrade /
            access-code page instead
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileMenuDrawer({
  open,
  onClose,
  mode,
  canPersonal,
  canBusiness,
  canEmployee,
  canPm,
  canGodMode,
  goMode,
  goFeed,
  goSupport,
  goProfile,
  goSettings,
  onLogout,
  openInvestorPortal,
  openTenantPortal,
  investorActive,
  tenantActive,
}) {
  if (!open) {
    return null;
  }

  function run(action) {
    onClose?.();

    window.setTimeout(() => {
      action?.();
    }, 80);
  }

  return (
    <div className="fixed inset-0 z-[88]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute bottom-3 right-3 top-3 w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-slate-950 shadow-[0_0_80px_rgba(34,211,238,0.16)]">
        <div className="relative border-b border-slate-800 p-4">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">
                SyncWorks Menu
              </div>

              <div className="mt-2 text-lg font-black text-white">
                Choose where to go
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Clean app flow.
                Everything else stays
                tucked away.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            >
              Close
            </button>
          </div>
        </div>

        <div className="h-[calc(100%-105px)] overflow-y-auto p-4">
          <div className="space-y-3">
            <div>
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Main Modes
              </div>

              <div className="space-y-2">
                <DrawerItem
                  label="Personal"
                  subtitle="Request services, track jobs, messages, and payments"
                  active={
                    mode ===
                    "CUSTOMER"
                  }
                  locked={
                    !canPersonal
                  }
                  tone="cyan"
                  onClick={() =>
                    run(() =>
                      goMode(
                        "CUSTOMER",
                        "/customer",
                        !canPersonal
                      )
                    )
                  }
                />

                <DrawerItem
                  label="Business"
                  subtitle="Business dashboard, requests, customers, and finance"
                  active={
                    mode === "SBO"
                  }
                  locked={
                    !canBusiness
                  }
                  tone="indigo"
                  onClick={() =>
                    run(() =>
                      goMode(
                        "SBO",
                        "/sbo",
                        !canBusiness
                      )
                    )
                  }
                />

                <DrawerItem
                  label="PM"
                  subtitle="Property manager portal"
                  active={
                    mode === "PM"
                  }
                  locked={!canPm}
                  tone="fuchsia"
                  onClick={() =>
                    run(() =>
                      goMode(
                        "PM",
                        "/pm",
                        !canPm
                      )
                    )
                  }
                />

                <DrawerItem
                  label="Employee"
                  subtitle="Team member workspace"
                  active={
                    mode ===
                    "EMPLOYEE"
                  }
                  locked={
                    !canEmployee
                  }
                  tone="cyan"
                  onClick={() =>
                    run(() =>
                      goMode(
                        "EMPLOYEE",
                        "/employee",
                        !canEmployee
                      )
                    )
                  }
                />

                {canGodMode ? (
                  <DrawerItem
                    label="God Mode"
                    subtitle="Internal SyncWorks command center"
                    active={
                      mode ===
                      "PLATFORM"
                    }
                    locked={false}
                    tone="slate"
                    onClick={() =>
                      run(() =>
                        goMode(
                          "PLATFORM",
                          "/platform",
                          false
                        )
                      )
                    }
                  />
                ) : null}
              </div>
            </div>

            <div className="pt-2">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Portals
              </div>

              <div className="space-y-2">
                <DrawerItem
                  label="Investor"
                  subtitle="Investor portal"
                  active={
                    investorActive
                  }
                  locked={false}
                  tone="slate"
                  onClick={() =>
                    run(
                      openInvestorPortal
                    )
                  }
                />

                <DrawerItem
                  label="Tenant"
                  subtitle="Tenant portal"
                  active={
                    tenantActive
                  }
                  locked={false}
                  tone="slate"
                  onClick={() =>
                    run(
                      openTenantPortal
                    )
                  }
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Account
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    run(goFeed)
                  }
                  className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-3 text-sm font-bold text-fuchsia-100"
                >
                  Newsfeed
                </button>

                <button
                  type="button"
                  onClick={() =>
                    run(goSupport)
                  }
                  className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-3 text-sm font-bold text-cyan-100"
                >
                  Support
                </button>

                <button
                  type="button"
                  onClick={() =>
                    run(goProfile)
                  }
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm font-bold text-slate-100"
                >
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() =>
                    run(goSettings)
                  }
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm font-bold text-slate-100"
                >
                  Settings
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  run(onLogout)
                }
                className="mt-2 w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-3 text-sm font-black text-rose-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModeBar({
  title = "SyncWorks",
  subtitle = "",
  rightActions = null,
}) {
  const nav = useNavigate();
  const location =
    useLocation();

  const {
    mode,
    setMode,
    availableModes,
    isPlatformAdmin,
    myBusinesses,
    logout,
    user,
  } = useAuth();

  const [
    createBusinessOpen,
    setCreateBusinessOpen,
  ] = useState(false);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  useEffect(() => {
    const styleId =
      "syncworks-modebar-clean-css";

    if (
      document.getElementById(
        styleId
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id = styleId;

    style.textContent = `
      @keyframes swWaveDrift {
        0% {
          transform: translate3d(-8%, 0, 0) scale(1);
          opacity: .55;
        }
        50% {
          transform: translate3d(8%, 0, 0) scale(1.02);
          opacity: .72;
        }
        100% {
          transform: translate3d(-8%, 0, 0) scale(1);
          opacity: .55;
        }
      }

      @keyframes swShineSweep {
        0% {
          transform: translateX(-120%);
          opacity: 0;
        }
        25% {
          opacity: .14;
        }
        60% {
          opacity: .08;
        }
        100% {
          transform: translateX(120%);
          opacity: 0;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }, []);

  const pathname = String(
    location.pathname || ""
  ).toLowerCase();

  const businesses = useMemo(
    () =>
      normalizeBusinesses(
        myBusinesses
      ),
    [myBusinesses]
  );

  const hasBusinesses =
    businesses.length > 0;

  const showBusinessPicker =
    useMemo(() => {
      return (
        hasBusinesses &&
        [
          "SBO",
          "EMPLOYEE",
          "PM",
          "PLATFORM",
        ].includes(mode)
      );
    }, [
      hasBusinesses,
      mode,
    ]);

  const showBusinessCreate =
    useMemo(() => {
      return (
        [
          "CUSTOMER",
          "SBO",
          "EMPLOYEE",
          "PM",
          "PLATFORM",
        ].includes(mode) ||
        isPlatformAdmin
      );
    }, [
      mode,
      isPlatformAdmin,
    ]);

  const investorActive =
    pathname.startsWith(
      "/investor"
    );

  const tenantActive =
    pathname.startsWith(
      "/tenant"
    );

  const canPersonal =
    !!availableModes?.CUSTOMER;

  const canBusiness =
    !!availableModes?.SBO ||
    !!isPlatformAdmin;

  const canEmployee =
    !!availableModes?.EMPLOYEE ||
    !!isPlatformAdmin;

  const canPm =
    !!availableModes?.PM ||
    !!isPlatformAdmin;

  const canGodMode =
    !!isPlatformAdmin &&
    !!availableModes?.PLATFORM;

  function goSettings() {
    const from =
      `${
        location.pathname || "/"
      }${
        location.search || ""
      }`;

    nav(
      `/settings?return=${encodeURIComponent(
        from
      )}`
    );
  }

  function goProfile() {
    try {
      nav("/profile");
    } catch {
      nav("/customer");
    }
  }

  function goMode(
    nextMode,
    destination,
    locked
  ) {
    if (locked) {
      const from =
        `${
          location.pathname || "/"
        }${
          location.search || ""
        }`;

      nav(
        `/upgrade?return=${encodeURIComponent(
          from
        )}`
      );

      return;
    }

    setMode(nextMode);
    nav(destination);
  }

  async function onLogout() {
    try {
      await logout();
    } finally {
      nav("/login", {
        replace: true,
      });
    }
  }

  const activeBusiness =
    useMemo(() => {
      const activeIdRaw =
        getActiveBusinessId?.() ||
        "";

      const activeId =
        activeIdRaw
          ? Number(activeIdRaw)
          : null;

      if (!activeId) {
        return null;
      }

      return (
        businesses.find(
          (business) =>
            Number(business?.id) ===
            Number(activeId)
        ) || null
      );
    }, [businesses]);

  const roleLabel =
    useMemo(() => {
      if (
        mode === "CUSTOMER"
      ) {
        return "Personal";
      }

      if (mode === "SBO") {
        return "Business";
      }

      if (
        mode === "EMPLOYEE"
      ) {
        return "Employee";
      }

      if (mode === "PM") {
        return "Property Manager";
      }

      if (
        mode === "PLATFORM"
      ) {
        return "God Mode";
      }

      return "SyncWorks";
    }, [mode]);

  const roleBadgeTone =
    useMemo(() => {
      if (
        mode === "CUSTOMER"
      ) {
        return "cyan";
      }

      if (mode === "SBO") {
        return "indigo";
      }

      if (
        mode === "EMPLOYEE"
      ) {
        return "cyan";
      }

      if (mode === "PM") {
        return "fuchsia";
      }

      if (
        mode === "PLATFORM"
      ) {
        return "slate";
      }

      return "cyan";
    }, [mode]);

  const customerName =
    useMemo(() => {
      const currentUser =
        user || {};

      return toNiceName({
        first:
          currentUser.first_name ||
          currentUser.firstName,

        last:
          currentUser.last_name ||
          currentUser.lastName,

        fallback:
          currentUser.name ||
          currentUser.username ||
          currentUser.email ||
          "",
      });
    }, [user]);

  const businessName =
    safeStr(
      activeBusiness?.name
    );

  const businessOwner =
    safeStr(
      activeBusiness?.owner_name ||
      activeBusiness?.ownerName
    );

  const businessPhone =
    safeStr(
      activeBusiness?.phone ||
      activeBusiness
        ?.phone_number ||
      activeBusiness
        ?.phoneNumber
    );

  const identityLeft =
    useMemo(() => {
      if (
        mode === "CUSTOMER"
      ) {
        return (
          customerName ||
          "Personal"
        );
      }

      if (
        [
          "SBO",
          "EMPLOYEE",
          "PM",
          "PLATFORM",
        ].includes(mode)
      ) {
        return (
          businessName ||
          (mode === "PLATFORM"
            ? "SyncWorks Internal"
            : "No Business Selected")
        );
      }

      return "SyncWorks";
    }, [
      mode,
      customerName,
      businessName,
    ]);

  const identitySub =
    useMemo(() => {
      if (
        ![
          "SBO",
          "EMPLOYEE",
          "PM",
          "PLATFORM",
        ].includes(mode)
      ) {
        return "";
      }

      if (
        !hasBusinesses &&
        mode !== "PLATFORM"
      ) {
        return "Create a business to unlock business tools.";
      }

      return [
        businessOwner
          ? `Owner: ${businessOwner}`
          : "",

        businessPhone
          ? `Phone: ${businessPhone}`
          : "",
      ]
        .filter(Boolean)
        .join(" • ");
    }, [
      mode,
      businessOwner,
      businessPhone,
      hasBusinesses,
    ]);

  function goSupport() {
    nav("/support");
  }

  function goFeed() {
    nav("/newsfeed");
  }

  function openInvestorPortal() {
    nav("/investor");
  }

  function openTenantPortal() {
    nav("/tenant");
  }

  function onBusinessCreated() {
    setCreateBusinessOpen(false);
    setMode?.("SBO");

    nav(
      "/sbo/settings?return=%2Fsbo&setup=1&created=1"
    );

    window.location.reload();
  }

  return (
    <>
      <div className="sticky top-0 z-50 overflow-hidden border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -inset-10 blur-3xl"
            style={{
              animation:
                "swWaveDrift 10s ease-in-out infinite",

              background:
                "radial-gradient(900px 180px at 20% 50%, rgba(34,211,238,0.14), rgba(0,0,0,0) 60%)," +
                "radial-gradient(900px 180px at 70% 55%, rgba(99,102,241,0.12), rgba(0,0,0,0) 60%)," +
                "radial-gradient(900px 180px at 90% 45%, rgba(217,70,239,0.12), rgba(0,0,0,0) 60%)",
            }}
          />

          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity: 0.09,
            }}
          >
            <img
              src="/brands/syncworks new logo.jpg"
              alt=""
              className="w-[820px] max-w-none select-none object-contain blur-[2px]"
              draggable={false}
            />
          </div>

          <div
            className="absolute -inset-x-40 -inset-y-10 blur-xl"
            style={{
              animation:
                "swShineSweep 12s ease-in-out infinite",

              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.09) 45%, rgba(255,255,255,0) 100%)",
            }}
          />

          <div className="absolute inset-0 bg-slate-950/72" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/brands/syncworks new logo.jpg"
                alt="SyncWorks"
                className="h-12 w-12 shrink-0 rounded-2xl border border-cyan-500/20 bg-slate-950/70 object-cover shadow-[0_0_40px_rgba(99,102,241,0.18)] md:h-16 md:w-16"
              />

              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate text-base font-extrabold tracking-wide text-slate-100">
                    SyncWorks
                  </div>

                  <Pill className="hidden border-slate-800 bg-slate-900/40 text-slate-300 sm:inline-flex">
                    v7.1
                  </Pill>

                  <ModuleBadge
                    tone={
                      roleBadgeTone
                    }
                  >
                    {roleLabel}
                  </ModuleBadge>
                </div>

                <div className="mt-1 max-w-[190px] truncate text-sm text-slate-200 sm:max-w-[320px] md:max-w-[520px]">
                  {identityLeft}
                </div>

                {identitySub ? (
                  <div className="mt-0.5 hidden max-w-[520px] truncate text-[11px] text-slate-400 sm:block">
                    {identitySub}
                  </div>
                ) : null}

                {title &&
                title !==
                  "SyncWorks" ? (
                  <div className="mt-1 hidden truncate text-[11px] text-cyan-200 sm:block">
                    {title}
                  </div>
                ) : null}

                {subtitle ? (
                  <div className="mt-0.5 hidden truncate text-[11px] text-slate-500 sm:block">
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {showBusinessPicker ? (
                <BusinessPicker className="hidden md:block" />
              ) : null}

              {showBusinessCreate ? (
                <button
                  type="button"
                  onClick={() =>
                    setCreateBusinessOpen(
                      true
                    )
                  }
                  className="hidden h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-500/35 bg-cyan-500/12 px-4 text-xs font-black text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)] transition hover:bg-cyan-500/18 md:inline-flex"
                  title="Create a business"
                >
                  <PlusIcon className="h-4 w-4" />
                  Business
                </button>
              ) : null}

              <div className="hidden">
                <RightActions
                  rightActions={
                    rightActions
                  }
                />
              </div>

              <div className="hidden">
                <IconButton
                  title="Newsfeed"
                  onClick={goFeed}
                  tone="fuchsia"
                >
                  <FeedIcon className="h-5 w-5" />
                </IconButton>

                <IconButton
                  title="Support"
                  onClick={goSupport}
                  tone="cyan"
                >
                  <SupportIcon className="h-5 w-5" />
                </IconButton>

                <NotificationsBell />

                <button
                  type="button"
                  onClick={onLogout}
                  title="Logout"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/55 text-slate-300 transition hover:border-transparent hover:bg-slate-900/60 hover:text-white"
                >
                  <LogoutIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={goProfile}
                  title="Profile"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/55 text-slate-300 transition hover:border-transparent hover:bg-slate-900/60 hover:text-white"
                >
                  <ProfileIcon className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={goSettings}
                  title="Settings"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/55 text-slate-300 transition hover:border-transparent hover:bg-slate-900/60 hover:text-white"
                >
                  <GearIcon className="h-5 w-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(
                    true
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/30 bg-slate-950/65 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.14)] transition hover:bg-cyan-500/10"
                title="Open menu"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="relative space-y-2 px-4 pb-3 md:hidden">
          {showBusinessPicker ? (
            <BusinessPicker />
          ) : null}

          {showBusinessCreate ? (
            <button
              type="button"
              onClick={() =>
                setCreateBusinessOpen(
                  true
                )
              }
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/35 bg-cyan-500/12 px-4 text-sm font-black text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)] transition hover:bg-cyan-500/18"
            >
              <PlusIcon className="h-4 w-4" />
              Create Business
            </button>
          ) : null}
        </div>
      </div>

      <MobileMenuDrawer
        open={mobileMenuOpen}
        onClose={() =>
          setMobileMenuOpen(false)
        }
        mode={mode}
        canPersonal={canPersonal}
        canBusiness={canBusiness}
        canEmployee={canEmployee}
        canPm={canPm}
        canGodMode={canGodMode}
        goMode={goMode}
        goFeed={goFeed}
        goSupport={goSupport}
        goProfile={goProfile}
        goSettings={goSettings}
        onLogout={onLogout}
        openInvestorPortal={
          openInvestorPortal
        }
        openTenantPortal={
          openTenantPortal
        }
        investorActive={
          investorActive
        }
        tenantActive={
          tenantActive
        }
      />

      <CreateBusinessDrawer
        open={
          createBusinessOpen
        }
        onClose={() =>
          setCreateBusinessOpen(
            false
          )
        }
        onCreated={
          onBusinessCreated
        }
      />
    </>
  );
}