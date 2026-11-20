import React from "react";
import PlatformRoute from "../components/PlatformRoute";
import PlatformDashboard from "./PlatformDashboard";

export default function PlatformDirectEntry() {
  return (
    <PlatformRoute>
      <div data-sw-platform-root="true">
        <PlatformDashboard />
      </div>
    </PlatformRoute>
  );
}
