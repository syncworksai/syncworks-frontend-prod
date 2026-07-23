// src/components/customer-health/HealthAthleteProfileCard.jsx
import React, { useMemo, useState } from "react";
import {
  SPORT_OPTIONS,
  buildAgeAwareGuidance,
  buildAthleteProfilePatch,
  buildSportProfile,
  calculateAge,
  normalizeMeasurements,
} from "./healthAthleteProfile";

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </div>
      {children}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/35";

export default function HealthAthleteProfileCard({
  profile,
  snapshot,
  onCoachUpdate,
  onOpen,
}) {
  const existingMeasurements = normalizeMeasurements(
    snapshot?.measurements || profile?.measurements || {}
  );

  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(
    profile?.date_of_birth || snapshot?.date_of_birth || ""
  );
  const [sport, setSport] = useState(
    profile?.primary_sport ||
      snapshot?.primary_sport ||
      "General Fitness"
  );
  const [trainingExperience, setTrainingExperience] =
    useState(
      profile?.training_experience ||
        snapshot?.training_experience ||
        "beginner"
    );
  const [measurements, setMeasurements] = useState(
    existingMeasurements
  );

  const age = calculateAge(dateOfBirth);

  const guidance = useMemo(
    () =>
      buildAgeAwareGuidance({
        age,
        sport,
        trainingExperience,
      }),
    [age, sport, trainingExperience]
  );

  const sportProfile = useMemo(
    () => buildSportProfile(sport),
    [sport]
  );

  function updateMeasurement(key, value) {
    setMeasurements((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function saveProfile() {
    const patch = buildAthleteProfilePatch({
      dateOfBirth,
      sport,
      trainingExperience,
      measurements,
    });

    onCoachUpdate?.(patch);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <section className="rounded-[1.75rem] border border-lime-300/18 bg-[linear-gradient(145deg,rgba(8,15,10,0.98),rgba(2,5,3,0.99))] p-4 shadow-[0_0_34px_rgba(112,255,61,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-300">
            Athlete Profile
          </div>
          <h2 className="mt-1 text-xl font-black text-white">
            Measurements, age, and sport
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            SYNC uses this profile to make training more age-appropriate, sport-aware, and measurable.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 rounded-xl border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-[10px] font-black text-lime-100"
        >
          {expanded ? "Close" : "Edit"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
            Age
          </div>
          <div className="mt-1 text-lg font-black text-white">
            {age || "—"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
            Sport
          </div>
          <div className="mt-1 truncate text-sm font-black text-white">
            {sport}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
            Experience
          </div>
          <div className="mt-1 capitalize text-sm font-black text-white">
            {trainingExperience}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.05] p-3">
        <div className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200">
          {guidance.headline}
        </div>
        <div className="mt-2 text-xs leading-5 text-slate-300">
          {guidance.volumeGuidance}
        </div>
        {guidance.supervisionNote ? (
          <div className="mt-2 text-[10px] font-bold leading-4 text-amber-100">
            {guidance.supervisionNote}
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date of birth">
              <input
                type="date"
                value={dateOfBirth}
                onChange={(event) =>
                  setDateOfBirth(event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="Primary sport">
              <select
                value={sport}
                onChange={(event) =>
                  setSport(event.target.value)
                }
                className={inputClass}
              >
                {SPORT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Training experience">
              <select
                value={trainingExperience}
                onChange={(event) =>
                  setTrainingExperience(event.target.value)
                }
                className={inputClass}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">
                  Intermediate
                </option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
          </div>

          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
              Body measurements
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["weight", "Weight"],
                ["height", "Height"],
                ["waist", "Waist"],
                ["hips", "Hips"],
                ["chest", "Chest"],
                ["arm", "Arm"],
                ["thigh", "Thigh"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    inputMode="decimal"
                    value={measurements[key] || ""}
                    onChange={(event) =>
                      updateMeasurement(
                        key,
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="0"
                  />
                </Field>
              ))}

              <Field label="Body unit">
                <select
                  value={measurements.measurementUnit}
                  onChange={(event) =>
                    updateMeasurement(
                      "measurementUnit",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="in">Inches</option>
                  <option value="cm">Centimeters</option>
                </select>
              </Field>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-sm">
              <Field label="Weight unit">
                <select
                  value={measurements.weightUnit}
                  onChange={(event) =>
                    updateMeasurement(
                      "weightUnit",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="lb">Pounds</option>
                  <option value="kg">Kilograms</option>
                </select>
              </Field>
              <Field label="Height unit">
                <select
                  value={measurements.heightUnit}
                  onChange={(event) =>
                    updateMeasurement(
                      "heightUnit",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="in">Inches</option>
                  <option value="cm">Centimeters</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-lime-300/15 bg-lime-300/[0.05] p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-lime-200">
                Sport priorities
              </div>
              <div className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                {sportProfile.priorities.map((item) => (
                  <div key={item}>• {item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-200">
                Programming cautions
              </div>
              <div className="mt-2 space-y-1 text-xs leading-5 text-slate-300">
                {sportProfile.cautions.map((item) => (
                  <div key={item}>• {item}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={saveProfile}
              className="h-12 rounded-xl border border-lime-300/35 bg-lime-300/12 text-sm font-black text-lime-100"
            >
              {saved
                ? "Profile Saved"
                : "Save Athlete Profile"}
            </button>

            <button
              type="button"
              onClick={() => onOpen?.("profile-intake")}
              className="h-12 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-white"
            >
              Open Full Health Profile
            </button>
          </div>

          <div className="text-[10px] leading-4 text-slate-500">
            Measurements are for personal progress tracking. They are not a diagnosis, body-composition scan, or medical assessment.
          </div>
        </div>
      ) : null}
    </section>
  );
}
