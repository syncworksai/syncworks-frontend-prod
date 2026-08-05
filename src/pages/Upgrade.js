import React from "react";
import { useLocation } from "react-router-dom";

import JarvisSetup from "./JarvisSetup.jsx";
import LegacyUpgrade from "./Upgrade.jsx";

export default function UpgradeRouter() {
  const location = useLocation();
  const params = new URLSearchParams(location.search || "");
  return React.createElement(
    params.get("product") === "jarvis" ? JarvisSetup : LegacyUpgrade
  );
}
