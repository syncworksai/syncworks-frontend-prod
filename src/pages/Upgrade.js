import React from "react";
import { useLocation } from "react-router-dom";

import SyncAssistantSetup from "./SyncAssistantSetup.jsx";
import LegacyUpgrade from "./Upgrade.jsx";

export default function UpgradeRouter() {
  const location = useLocation();
  const params = new URLSearchParams(location.search || "");
  const product = params.get("product");
  return React.createElement(
    product === "assistant" || product === "jarvis" ? SyncAssistantSetup : LegacyUpgrade
  );
}
