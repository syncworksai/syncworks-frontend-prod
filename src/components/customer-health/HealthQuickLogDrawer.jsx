// src/components/customer-health/HealthQuickLogDrawer.jsx
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

function safeNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "").replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function todayYmd() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function calculateBmi({
  weight,
  heightFt,
  heightIn,
}) {
  const pounds = safeNumber(weight, 0);
  const inches =
    safeNumber(heightFt, 0) * 12 +
    safeNumber(heightIn, 0);

  if (pounds <= 0 || inches <= 0) {
    return "";
  }

  return String(
    Math.round(
      ((pounds / (inches * inches)) * 703) * 10
    ) / 10
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function FieldLabel({ children }) {
  return (
    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>

      <div className="relative mt-2">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-3 pr-14 text-base font-black text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/45"
        />

        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-black text-slate-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function QuickAmount({
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-slate-200 transition hover:border-emerald-300/30 hover:text-white active:scale-[0.98]"
    >
      {label}
    </button>
  );
}

function DrawerShell({
  title,
  eyebrow,
  subtitle,
  onClose,
  children,
  footer,
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/85 px-3 pt-3 backdrop-blur-xl sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close quick log"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-[131] flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(0,245,106,0.10),transparent_30%),linear-gradient(180deg,#0d130f,#040705)] shadow-[0_28px_90px_rgba(0,0,0,0.78)] sm:max-h-[92vh] sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] p-4 sm:p-5">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
              {eyebrow}
            </div>

            <h3 className="mt-1 text-2xl font-black text-white">
              {title}
            </h3>

            {subtitle ? (
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {subtitle}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:border-emerald-300/35 hover:text-emerald-200"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-28 sm:p-5 sm:pb-5">
          {children}
        </div>

        {footer ? (
          <div className="sticky bottom-0 border-t border-white/[0.07] bg-[#050806]/95 p-4 backdrop-blur-xl sm:p-5">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default function HealthQuickLogDrawer({
  open,
  type,
  onClose,
  onSave,
  onChooseType,
  profile,
  snapshot,
}) {
  const [date, setDate] =
    useState(todayYmd());
  const [value, setValue] =
    useState("");
  const [secondary, setSecondary] =
    useState("");
  const [tertiary, setTertiary] =
    useState("");
  const [note, setNote] =
    useState("");
  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    if (!open) return;

    if (type === "meal") {
      onChooseType?.("nutrition-coach");
      return;
    }

    setDate(todayYmd());
    setNote("");
    setSaving(false);
    setSecondary("");
    setTertiary("");

    if (type === "weight") {
      setValue(
        snapshot?.weight ||
          profile?.weight ||
          ""
      );
    } else if (type === "steps") {
      setValue(snapshot?.steps || "");
    } else if (type === "sleep") {
      setValue(
        snapshot?.last_sleep_hours ||
          snapshot?.sleep_hours ||
          ""
      );
    } else if (
      type === "readiness"
    ) {
      setValue(
        snapshot?.readiness || "Good"
      );
    } else {
      setValue("");
    }
  }, [
    open,
    type,
    profile,
    snapshot,
    onChooseType,
  ]);

  const calculatedBmi = useMemo(
    () =>
      type === "weight"
        ? calculateBmi({
            weight: value,
            heightFt: profile?.height_ft,
            heightIn: profile?.height_in,
          })
        : "",
    [
      type,
      value,
      profile?.height_ft,
      profile?.height_in,
    ]
  );

  if (!open || type === "meal") {
    return null;
  }

  if (type === "menu") {
    const groups = [
      {
        title: "Daily Health",
        items: [
          [
            "weight",
            "Weight / BMI",
            "Track weight changes and BMI.",
          ],
          [
            "steps",
            "Steps",
            "Enter today's or a past day's steps.",
          ],
          [
            "sleep",
            "Sleep",
            "Log hours slept for recovery guidance.",
          ],
          [
            "readiness",
            "Readiness / Pain",
            "Tell the coach how your body feels.",
          ],
        ],
      },
      {
        title: "Nutrition",
        items: [
          [
            "nutrition-coach",
            "Meal / Nutrition",
            "Describe food naturally, analyze it with AI, reuse a saved meal, or enter macros.",
          ],
          [
            "protein",
            "Protein",
            "Quick-add protein grams.",
          ],
          [
            "calories",
            "Calories",
            "Quick-add calorie intake.",
          ],
          [
            "water",
            "Water",
            "Quick-add hydration.",
          ],
        ],
      },
    ];

    return (
      <DrawerShell
        eyebrow="Universal Health Log"
        title="What would you like to log?"
        subtitle="Choose a category, then save today's data or select a past date."
        onClose={onClose}
      >
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {group.title}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {group.items.map(
                  ([
                    itemValue,
                    label,
                    description,
                  ]) => (
                    <button
                      key={itemValue}
                      type="button"
                      onClick={() =>
                        onChooseType?.(
                          itemValue
                        )
                      }
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.05] active:scale-[0.99]"
                    >
                      <div className="text-sm font-black text-white">
                        {label}
                      </div>

                      <div className="mt-1 text-xs leading-5 text-slate-400">
                        {description}
                      </div>
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </DrawerShell>
    );
  }

  const titles = {
    weight: "Log weight",
    steps: "Log steps",
    water: "Log water",
    protein: "Log protein",
    calories: "Log calories",
    sleep: "Log sleep",
    readiness: "Log readiness",
  };

  const subtitles = {
    weight:
      "Add a weight check-in. Your trend graph and BMI estimate will update.",
    steps:
      "Enter your current daily step total or a past day's total.",
    water:
      "Add water to today or enter a total for another date.",
    protein:
      "Add protein to today or enter a total for another date.",
    calories:
      "Add calories to today or enter a total for another date.",
    sleep:
      "Log the number of hours you slept for the selected date.",
    readiness:
      "Tell your coach how ready, sore, or uncomfortable you feel.",
  };

  function addAmount(amount) {
    setValue((previous) =>
      String(
        Math.max(
          0,
          safeNumber(previous, 0) +
            amount
        )
      )
    );
  }

  async function handleSave() {
    if (saving) return;

    setSaving(true);

    try {
      await onSave?.({
        type,
        ymd: date,
        value,
        secondary,
        tertiary,
        note,
        bmi: calculatedBmi,
      });

      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  const canSave =
    type === "readiness"
      ? Boolean(value)
      : safeNumber(value, 0) > 0;

  const footer = (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={onClose}
        className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200"
      >
        Cancel
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave || saving}
        className="h-12 rounded-2xl border border-emerald-300/45 bg-emerald-400 text-sm font-black text-black shadow-[0_0_26px_rgba(0,245,106,0.16)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving
          ? "Saving..."
          : "Save Entry"}
      </button>
    </div>
  );

  return (
    <DrawerShell
      eyebrow="Quick Log"
      title={
        titles[type] ||
        "Log health data"
      }
      subtitle={subtitles[type]}
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-4">
        <label className="block">
          <FieldLabel>Date</FieldLabel>

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
            className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm font-black text-white outline-none focus:border-emerald-300/45"
          />
        </label>

        {type === "weight" ? (
          <>
            <NumberField
              label="Weight"
              value={value}
              onChange={setValue}
              placeholder="205"
              suffix="lb"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
                <FieldLabel>
                  Calculated BMI
                </FieldLabel>

                <div className="mt-2 text-3xl font-black text-white">
                  {calculatedBmi || "-"}
                </div>

                <div className="mt-1 text-xs leading-5 text-slate-400">
                  General screening estimate only.
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <FieldLabel>
                  Goal Weight
                </FieldLabel>

                <div className="mt-2 text-3xl font-black text-white">
                  {profile?.target_weight ||
                    "-"}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Update in Health Profile
                </div>
              </div>
            </div>
          </>
        ) : null}

        {type === "steps" ? (
          <>
            <NumberField
              label="Steps"
              value={value}
              onChange={setValue}
              placeholder="8000"
            />

            <div className="grid grid-cols-3 gap-2">
              {[1000, 2500, 5000].map(
                (amount) => (
                  <QuickAmount
                    key={amount}
                    label={`+${amount.toLocaleString()}`}
                    onClick={() =>
                      addAmount(amount)
                    }
                  />
                )
              )}
            </div>
          </>
        ) : null}

        {type === "water" ? (
          <>
            <NumberField
              label="Water"
              value={value}
              onChange={setValue}
              placeholder="16"
              suffix="oz"
            />

            <div className="grid grid-cols-4 gap-2">
              {[8, 12, 16, 24].map(
                (amount) => (
                  <QuickAmount
                    key={amount}
                    label={`+${amount} oz`}
                    onClick={() =>
                      addAmount(amount)
                    }
                  />
                )
              )}
            </div>
          </>
        ) : null}

        {type === "protein" ? (
          <>
            <NumberField
              label="Protein"
              value={value}
              onChange={setValue}
              placeholder="25"
              suffix="g"
            />

            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 40].map(
                (amount) => (
                  <QuickAmount
                    key={amount}
                    label={`+${amount} g`}
                    onClick={() =>
                      addAmount(amount)
                    }
                  />
                )
              )}
            </div>
          </>
        ) : null}

        {type === "calories" ? (
          <NumberField
            label="Calories"
            value={value}
            onChange={setValue}
            placeholder="500"
            suffix="kcal"
          />
        ) : null}

        {type === "sleep" ? (
          <NumberField
            label="Hours slept"
            value={value}
            onChange={setValue}
            placeholder="7.5"
            suffix="hours"
          />
        ) : null}

        {type === "readiness" ? (
          <>
            <label className="block">
              <FieldLabel>
                Readiness
              </FieldLabel>

              <select
                value={value}
                onChange={(event) =>
                  setValue(
                    event.target.value
                  )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm font-black text-white outline-none focus:border-emerald-300/45"
              >
                <option value="Excellent">
                  Excellent
                </option>
                <option value="Good">
                  Good
                </option>
                <option value="Fair">
                  Fair
                </option>
                <option value="Low">
                  Low
                </option>
                <option value="Recovery needed">
                  Recovery needed
                </option>
              </select>
            </label>

            <NumberField
              label="Pain or soreness (0-10)"
              value={secondary}
              onChange={setSecondary}
              placeholder="0"
            />
          </>
        ) : null}

        <label className="block">
          <FieldLabel>
            Note (optional)
          </FieldLabel>

          <textarea
            value={note}
            onChange={(event) =>
              setNote(event.target.value)
            }
            rows={3}
            placeholder="Add context for your coach"
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-emerald-300/45"
          />
        </label>
      </div>
    </DrawerShell>
  );
}
