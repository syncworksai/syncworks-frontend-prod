import React, { memo, useEffect, useMemo, useRef } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";

import useAudioVisualizer from "../../hooks/useAudioVisualizer";
import {
  normalizeSyncVoiceStatus,
  SYNC_VOICE_STATES,
} from "../../utils/syncVoiceStates";
import "./SyncVoiceVisualizer.css";

function drawWaveform(canvas, waveformRef, status, fallbackPhaseRef) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.clearRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 2.2 * ratio;

  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#22d3ee");
  gradient.addColorStop(0.34, "#38bdf8");
  gradient.addColorStop(0.68, "#a78bfa");
  gradient.addColorStop(1, "#f472b6");
  context.strokeStyle = gradient;
  context.shadowBlur = 15 * ratio;
  context.shadowColor = status === "error" ? "#fb7185" : "#22d3ee";

  const values = waveformRef.current;
  const hasSignal =
    values?.length &&
    Array.from(values).some((value) => Math.abs(value - 128) > 3);

  fallbackPhaseRef.current += status === "thinking" ? 0.12 : 0.06;
  context.beginPath();

  const points = 96;
  for (let index = 0; index < points; index += 1) {
    const progress = index / (points - 1);
    const x = progress * width;
    const sampleIndex = Math.floor(progress * Math.max(0, (values?.length || 1) - 1));
    const live = hasSignal ? (values[sampleIndex] - 128) / 128 : 0;
    const fallback =
      Math.sin(progress * Math.PI * 7 + fallbackPhaseRef.current) *
      Math.sin(progress * Math.PI) *
      (status === "idle" ? 0.08 : 0.18);
    const amplitude = (live || fallback) * height * 0.42;
    const y = height / 2 + amplitude;

    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.stroke();
}

const SyncVoiceVisualizer = memo(function SyncVoiceVisualizer({
  status = "idle",
  transcript = "",
  responseText = "",
  audioElement = null,
  onStartListening,
  onStopListening,
  onEndSession,
  muted = false,
  onToggleMute,
  onStatusChange,
}) {
  const normalizedStatus = normalizeSyncVoiceStatus(status);
  const state = SYNC_VOICE_STATES[normalizedStatus];
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const fallbackPhaseRef = useRef(0);

  const {
    volumeLevel,
    waveformData,
    isAudioActive,
    permissionError,
    startMicrophone,
    stopMicrophone,
  } = useAudioVisualizer({ audioElement });

  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        id: index,
        left: `${12 + ((index * 37) % 76)}%`,
        top: `${10 + ((index * 53) % 78)}%`,
      })),
    []
  );

  useEffect(() => {
    let active = true;

    const animate = () => {
      if (!active) return;
      if (canvasRef.current) {
        drawWaveform(
          canvasRef.current,
          waveformData,
          normalizedStatus,
          fallbackPhaseRef
        );
      }
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      active = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [normalizedStatus, waveformData]);

  useEffect(() => {
    if (normalizedStatus !== "listening" && isAudioActive && !audioElement) {
      stopMicrophone();
    }
  }, [
    audioElement,
    isAudioActive,
    normalizedStatus,
    stopMicrophone,
  ]);

  async function handleMicrophone() {
    if (normalizedStatus === "listening") {
      stopMicrophone();
      onStopListening?.();
      onStatusChange?.("thinking");
      return;
    }

    const started = await startMicrophone();
    if (started) {
      onStartListening?.();
      onStatusChange?.("listening");
    }
  }

  const level =
    normalizedStatus === "listening" || normalizedStatus === "speaking"
      ? Math.min(1, volumeLevel)
      : normalizedStatus === "thinking"
      ? 0.22
      : 0.06;

  return (
    <section
      className="sync-voice-shell"
      data-status={normalizedStatus}
      aria-label={`SYNC Voice: ${state.label}`}
      style={{
        "--sync-ring-duration": `${state.ringDuration}s`,
        "--sync-level": level,
        "--sync-glow": state.glow,
      }}
    >
      <img
        className="sync-voice-background"
        src="/sync/voice/sync-voice-background.png"
        alt=""
        aria-hidden="true"
      />
      <div className="sync-voice-vignette" />
      <div className="sync-voice-grid" />

      <div className="sync-voice-content">
        <div className="sync-voice-stage">
          <div className="sync-voice-particles" aria-hidden="true">
            {particles.map((particle) => (
              <span
                key={particle.id}
                className="sync-voice-particle"
                style={{
                  left: particle.left,
                  top: particle.top,
                  "--particle-index": particle.id,
                }}
              />
            ))}
          </div>

          <div className="sync-voice-orb-wrap" aria-hidden="true">
            <div
              className="sync-voice-ring"
              style={{ "--ring-inset": "0%" }}
            />
            <div
              className="sync-voice-ring sync-voice-ring--reverse"
              style={{ "--ring-inset": "9%" }}
            />
            <div
              className="sync-voice-ring sync-voice-ring--inner"
              style={{ "--ring-inset": "20%" }}
            />
            <div className="sync-voice-orb" />
            <canvas ref={canvasRef} className="sync-voice-waveform" />
          </div>

          <div className="sync-voice-status" aria-live="polite">
            <div className="sync-voice-status-label">{state.label}</div>
            <div className="sync-voice-status-copy">
              {permissionError || state.supportingText}
            </div>
          </div>
        </div>

        {transcript || responseText ? (
          <div className="sync-voice-text-panel">
            {transcript ? (
              <div className="text-sm leading-6 text-slate-300">
                <strong>You:</strong> {transcript}
              </div>
            ) : null}
            {responseText ? (
              <div className="mt-2 text-sm leading-6 text-slate-300">
                <strong>SYNC:</strong> {responseText}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="sync-voice-controls">
          <button
            type="button"
            className="sync-voice-control"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute SYNC" : "Mute SYNC"}
            aria-pressed={muted}
          >
            {muted ? (
              <VolumeX aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Volume2 aria-hidden="true" className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            className={`sync-voice-control sync-voice-control--primary ${
              normalizedStatus === "listening"
                ? "sync-voice-control--active"
                : ""
            }`}
            onClick={handleMicrophone}
            aria-label={
              normalizedStatus === "listening"
                ? "Stop listening"
                : "Start listening"
            }
          >
            {normalizedStatus === "listening" ? (
              <MicOff aria-hidden="true" className="h-8 w-8" />
            ) : (
              <Mic aria-hidden="true" className="h-8 w-8" />
            )}
          </button>

          <button
            type="button"
            className="sync-voice-control"
            onClick={() => {
              stopMicrophone();
              onEndSession?.();
            }}
            aria-label="End SYNC Voice session"
          >
            <PhoneOff aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
});

export default SyncVoiceVisualizer;
