// src/components/customer-health/HealthPremiumHome.jsx
import React, { useEffect } from "react";
import HealthDashboard from "./HealthDashboard";

export default function HealthPremiumHome({
  profile = {},
  snapshot = {},
  history = [],
  progressLogs = [],
  onOpen,
  onStartWorkout,
}) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleHealthOpen = (event) => {
      const target = event?.detail?.target;
      if (target) onOpen?.(target);
    };

    window.addEventListener("syncworks:health-open", handleHealthOpen);
    return () => window.removeEventListener("syncworks:health-open", handleHealthOpen);
  }, [onOpen]);

  return (
    <HealthDashboard
      profile={profile}
      snapshot={snapshot}
      history={history}
      progressLogs={progressLogs}
      onOpen={onOpen}
      onStartWorkout={onStartWorkout}
    />
  );
}
