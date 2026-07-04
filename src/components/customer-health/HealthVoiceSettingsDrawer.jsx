import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Headphones,
  Play,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import {
  getHealthVoicePreferences,
  loadHealthVoiceOptions,
  previewHealthCoachVoice,
  saveHealthVoicePreferences,
  stopCoachVoice,
} from "./healthCoachVoice";

const ENERGY_OPTIONS = [
  {
    key: "calm",
    label: "Calm",
    description:
      "Instructional, steady, and reassuring.",
  },
  {
    key: "balanced",
    label: "Balanced",
    description:
      "Positive coaching with measured energy.",
  },
  {
    key: "high_energy",
    label: "High Energy",
    description:
      "Upbeat, outgoing, and highly motivational.",
  },
  {
    key: "competition",
    label: "Competition",
    description:
      "Direct, intense, and performance focused.",
  },
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function HealthVoiceSettingsDrawer({
  open,
  onClose,
  audioEnabled,
  onAudioEnabledChange,
}) {
  const [preferences, setPreferences] = useState(
    () => getHealthVoicePreferences()
  );
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] =
    useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    setPreferences(getHealthVoicePreferences());
    setLoading(true);
    setMessage("");

    loadHealthVoiceOptions()
      .then((result) => {
        setOptions(result);
      })
      .catch(() => {
        setOptions(null);
        setMessage(
          "ElevenLabs could not be reached. Browser voice fallback remains available."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open]);

  const availableVoices = useMemo(
    () =>
      Array.isArray(options?.voices)
        ? options.voices.filter(
            (voice) => voice?.available
          )
        : [],
    [options]
  );

  if (!open) return null;

  function updatePreference(key, value) {
    setPreferences((current) => {
      const next = {
        ...current,
        [key]: value,
      };

      saveHealthVoicePreferences(next);
      return next;
    });
  }

  async function runPreview() {
    setPreviewing(true);
    setMessage("");

    try {
      previewHealthCoachVoice({
        energy:
          preferences.energy || "high_energy",
        voiceKey:
          preferences.voiceKey ||
          "sync_fitness_coach",
      });

      setMessage(
        "Playing SYNC Fitness Coach preview."
      );
    } catch {
      setMessage(
        "Preview could not start. Browser fallback will be used when available."
      );
    } finally {
      window.setTimeout(() => {
        setPreviewing(false);
      }, 1600);
    }
  }

  function stopPreview() {
    stopCoachVoice();
    setPreviewing(false);
    setMessage("Voice playback stopped.");
  }

  function toggleAudio() {
    const next = !audioEnabled;
    onAudioEnabledChange?.(next);

    if (!next) {
      stopCoachVoice();
    }
  }

  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/80 p-3 backdrop-blur-xl sm:items-center">
      <button
        type="button"
        aria-label="Close voice settings"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-voice-settings-title"
        className="relative z-[171] max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(57,255,136,0.12),transparent_34%),linear-gradient(180deg,#07111f,#030712)] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.78)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              <Headphones size={14} />
              SYNC Voice
            </div>

            <h2
              id="health-voice-settings-title"
              className="mt-3 text-3xl font-black tracking-tight text-white"
            >
              Choose your coach intensity
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              SYNC Fitness Coach is the current ElevenLabs voice. More voices can be added later without changing these controls.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close voice settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-black text-white">
                Coaching audio
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                Turn all workout and daily Health coaching audio on or off.
              </div>
            </div>

            <button
              type="button"
              onClick={toggleAudio}
              className={cx(
                "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black",
                audioEnabled
                  ? "border-lime-300/30 bg-lime-300/12 text-lime-100"
                  : "border-white/10 bg-white/[0.04] text-slate-300"
              )}
            >
              {audioEnabled ? (
                <Volume2 size={18} />
              ) : (
                <VolumeX size={18} />
              )}
              {audioEnabled ? "Audio On" : "Audio Off"}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
            Coach intensity
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {ENERGY_OPTIONS.map((option) => {
              const selected =
                preferences.energy === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    updatePreference(
                      "energy",
                      option.key
                    )
                  }
                  className={cx(
                    "rounded-2xl border p-4 text-left transition",
                    selected
                      ? "border-fuchsia-300/40 bg-fuchsia-300/14 shadow-[0_0_24px_rgba(232,121,249,0.14)]"
                      : "border-white/10 bg-white/[0.035] hover:border-cyan-300/25"
                  )}
                >
                  <div className="text-sm font-black text-white">
                    {option.label}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
            Current voice
          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-black text-white">
                {availableVoices[0]?.name ||
                  "SYNC Fitness Coach"}
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-400">
                {loading
                  ? "Checking ElevenLabs connection..."
                  : availableVoices.length
                  ? "ElevenLabs connected through the secure SyncWorks backend."
                  : "Using browser fallback until ElevenLabs is available."}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={runPreview}
                disabled={!audioEnabled || previewing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-lime-300/30 bg-lime-300/12 px-4 text-sm font-black text-lime-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play size={17} />
                Preview
              </button>

              <button
                type="button"
                onClick={stopPreview}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200"
              >
                <Square size={16} />
                Stop
              </button>
            </div>
          </div>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <input
            type="checkbox"
            checked={
              preferences.browserFallback !== false
            }
            onChange={(event) =>
              updatePreference(
                "browserFallback",
                event.target.checked
              )
            }
            className="mt-1 h-4 w-4 accent-cyan-400"
          />

          <span>
            <span className="block text-sm font-black text-white">
              Use browser voice as automatic backup
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">
              If ElevenLabs is unavailable or slow, coaching continues using the device voice instead of going silent.
            </span>
          </span>
        </label>

        {message ? (
          <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-xs font-bold leading-5 text-amber-100">
            {message}
          </div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-12 w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/12 text-sm font-black text-cyan-100"
        >
          Save and Close
        </button>
      </section>
    </div>
  );
}