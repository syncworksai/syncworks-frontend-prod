// src/components/BusinessCards/BarcodeScannerModal.jsx
import React, { useEffect, useRef, useState } from "react";

export default function BarcodeScannerModal({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [err, setErr] = useState("");

  async function stop() {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch {
      // ignore
    }
  }

  async function start() {
    setErr("");

    if (!("BarcodeDetector" in window)) {
      setErr("Scanner not supported in this browser. Paste the code instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

      const tick = async () => {
        try {
          const video = videoRef.current;
          if (!video) return;

          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length) {
            const raw = (barcodes[0]?.rawValue || "").trim();
            if (raw) {
              onDetected?.(raw);
              await stop();
              onClose?.();
              return;
            }
          }
        } catch {
          // ignore scan errors
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setErr("Camera permission denied or unavailable. Paste the code instead.");
    }
  }

  useEffect(() => {
    if (!open) return;
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-100">Scan QR Code</div>
            <div className="text-sm text-slate-400 mt-1">
              Point the camera at the QR. It should contain an <span className="text-slate-300">SW-...</span> code.
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 text-slate-200"
          >
            Close
          </button>
        </div>

        {err ? (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            {err}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl overflow-hidden border border-slate-800 bg-black">
          <video ref={videoRef} className="w-full h-[320px] object-cover" playsInline muted />
        </div>

        <div className="mt-3 text-xs text-slate-500">
          If scanning fails, use “Add by Code” and paste the <span className="text-slate-300">SW-</span> value.
        </div>
      </div>
    </div>
  );
}