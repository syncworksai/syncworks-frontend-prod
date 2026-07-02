import { useCallback, useEffect, useRef, useState } from "react";

const mediaElementSources = new WeakMap();

function rmsFromTimeDomain(values) {
  if (!values?.length) return 0;
  let sum = 0;

  for (let index = 0; index < values.length; index += 1) {
    const normalized = (values[index] - 128) / 128;
    sum += normalized * normalized;
  }

  return Math.min(1, Math.sqrt(sum / values.length) * 2.4);
}

export default function useAudioVisualizer({ audioElement = null } = {}) {
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [permissionError, setPermissionError] = useState("");

  const contextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const frameRef = useRef(0);
  const waveformRef = useRef(new Uint8Array(128));
  const frequencyRef = useRef(new Uint8Array(64));
  const visibleRef = useRef(true);

  const ensureContext = useCallback(() => {
    if (!contextRef.current) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }
      contextRef.current = new AudioContextClass();
    }

    if (contextRef.current.state === "suspended") {
      contextRef.current.resume();
    }

    return contextRef.current;
  }, []);

  const stopLoop = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  }, []);

  const runLoop = useCallback(() => {
    stopLoop();

    const tick = () => {
      const analyser = analyserRef.current;
      if (!analyser || !visibleRef.current) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const waveform = waveformRef.current;
      const frequency = frequencyRef.current;
      analyser.getByteTimeDomainData(waveform);
      analyser.getByteFrequencyData(frequency);
      setVolumeLevel((current) => current * 0.72 + rmsFromTimeDomain(waveform) * 0.28);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
  }, [stopLoop]);

  const disconnectSource = useCallback(() => {
    try {
      sourceRef.current?.disconnect();
    } catch {
      // Audio node may already be disconnected.
    }
    sourceRef.current = null;

    try {
      analyserRef.current?.disconnect();
    } catch {
      // Audio node may already be disconnected.
    }
    analyserRef.current = null;
  }, []);

  const stopMicrophone = useCallback(() => {
    stopLoop();
    disconnectSource();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setVolumeLevel(0);
    setIsAudioActive(false);
  }, [disconnectSource, stopLoop]);

  const startMicrophone = useCallback(async () => {
    setPermissionError("");
    stopMicrophone();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = ensureContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      streamRef.current = stream;
      sourceRef.current = source;
      analyserRef.current = analyser;
      waveformRef.current = new Uint8Array(analyser.fftSize);
      frequencyRef.current = new Uint8Array(analyser.frequencyBinCount);

      setIsAudioActive(true);
      runLoop();
      return true;
    } catch (error) {
      setPermissionError(
        error?.message || "Microphone permission was not granted."
      );
      stopMicrophone();
      return false;
    }
  }, [ensureContext, runLoop, stopMicrophone]);

  const connectAudioElement = useCallback(
    (element) => {
      if (!element) return false;

      try {
        const context = ensureContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;

        let source = mediaElementSources.get(element);
        if (!source) {
          source = context.createMediaElementSource(element);
          mediaElementSources.set(element, source);
        }

        disconnectSource();
        source.connect(analyser);
        analyser.connect(context.destination);

        sourceRef.current = source;
        analyserRef.current = analyser;
        waveformRef.current = new Uint8Array(analyser.fftSize);
        frequencyRef.current = new Uint8Array(analyser.frequencyBinCount);

        setIsAudioActive(true);
        runLoop();
        return true;
      } catch (error) {
        setPermissionError(
          error?.message || "Unable to connect the speaking audio source."
        );
        return false;
      }
    },
    [disconnectSource, ensureContext, runLoop]
  );

  useEffect(() => {
    if (!audioElement) return undefined;

    const handlePlaybackStart = () => {
      connectAudioElement(audioElement);
    };

    audioElement.addEventListener("play", handlePlaybackStart);
    audioElement.addEventListener("playing", handlePlaybackStart);

    let frame = 0;
    if (!audioElement.paused) {
      frame = requestAnimationFrame(handlePlaybackStart);
    }

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }

      audioElement.removeEventListener("play", handlePlaybackStart);
      audioElement.removeEventListener("playing", handlePlaybackStart);
    };
  }, [audioElement, connectAudioElement]);

  useEffect(() => {
    const handleVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(
    () => () => {
      stopMicrophone();
      contextRef.current?.close?.();
      contextRef.current = null;
    },
    [stopMicrophone]
  );

  return {
    volumeLevel,
    waveformData: waveformRef,
    frequencyData: frequencyRef,
    isAudioActive,
    permissionError,
    startMicrophone,
    stopMicrophone,
    connectAudioElement,
  };
}
