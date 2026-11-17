import React from "react";
import CalendarPageV3 from "./CalendarPageV3";

// The full-screen calendar cockpit owns all calendar UI. Do not mount the
// legacy DOM observer/quick-actions portal; it duplicates panels and
// makes the page scroll beneath the persistent mobile navigation.
export default function CalendarPage() {
  return <CalendarPageV3 />;
}
