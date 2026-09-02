import React from "react";
import PlatformRoute from "../components/PlatformRoute";
import PlatformDashboard from "./PlatformDashboard";
import PlatformCommerceDock from "../components/platform/PlatformCommerceDock";

export default function PlatformDirectEntry() {
  return (
    <PlatformRoute>
      <div data-sw-platform-root="true">
        <PlatformDashboard />
        <PlatformCommerceDock />
      </div>
    </PlatformRoute>
  );
}
