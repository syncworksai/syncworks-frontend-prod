// src/components/customer-health/HealthPremiumHome.jsx
import React from "react";
import HealthDashboard from "./HealthDashboard";

export default function HealthPremiumHome({
  profile = {},
  snapshot = {},
  history = [],
  progressLogs = [],
  onOpen,
  onStartWorkout,
}) {
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
