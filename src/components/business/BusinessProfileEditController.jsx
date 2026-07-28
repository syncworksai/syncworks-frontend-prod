import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

function normalize(value) {
  return String(value || "").trim();
}

function findSection(title) {
  const headings = Array.from(document.querySelectorAll("section div, section h1, section h2, section h3"));
  const heading = headings.find((node) => normalize(node.textContent) === title);
  return heading?.closest("section") || null;
}

function fieldValue(section, label) {
  if (!section) return "";
  const labels = Array.from(section.querySelectorAll("label"));
  const fieldLabel = labels.find((node) => normalize(node.textContent).startsWith(label));
  const control = fieldLabel?.querySelector("input, textarea, select");
  return normalize(control?.value);
}

function setSectionLocked(section, locked) {
  if (!section) return;

  section.dataset.profileLocked = locked ? "true" : "false";
  section.querySelectorAll("input, textarea, select, button").forEach((control) => {
    const type = normalize(control.getAttribute("type")).toLowerCase();
    const isFileControl = type === "file";
    const isFormField = control.matches("input, textarea, select");
    const isUploadButton = control.tagName === "BUTTON" && normalize(control.textContent).toLowerCase().includes("upload");

    if (isFormField || isUploadButton) {
      control.disabled = locked;
      control.setAttribute("aria-disabled", locked ? "true" : "false");
    }

    if (isFileControl) control.tabIndex = locked ? -1 : 0;
  });
}

export default function BusinessProfileEditController() {
  const location = useLocation();
  const isBusinessSettings = location.pathname.replace(/\/+$/, "") === "/sbo/settings";
  const section = useMemo(() => new URLSearchParams(location.search || "").get("section") || "business", [location.search]);
  const [editing, setEditing] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  useEffect(() => {
    if (!isBusinessSettings || section !== "business") return undefined;

    let active = true;
    let timer = null;

    const syncLock = () => {
      if (!active) return;

      const profileSection = findSection("Business Profile");
      const logoSection = findSection("Business Logo");
      if (!profileSection) return;

      const businessName = fieldValue(profileSection, "Business Name");
      const email = fieldValue(profileSection, "Business Email");
      const phone = fieldValue(profileSection, "Phone");
      const hasSavedData = Boolean(businessName && (email || phone));

      setSavedProfile(hasSavedData);
      setSectionLocked(profileSection, hasSavedData && !editing);
      setSectionLocked(logoSection, hasSavedData && !editing);
    };

    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(syncLock, 60);
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
    timer = window.setTimeout(syncLock, 120);

    return () => {
      active = false;
      observer.disconnect();
      window.clearTimeout(timer);
      setSectionLocked(findSection("Business Profile"), false);
      setSectionLocked(findSection("Business Logo"), false);
    };
  }, [editing, isBusinessSettings, section]);

  if (!isBusinessSettings || section !== "business" || !savedProfile) return null;

  return (
    <div className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-[70] flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-slate-950/95 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl md:bottom-6 md:right-6">
      <div className="hidden px-2 text-xs text-slate-400 sm:block">
        {editing ? "Profile fields are unlocked." : "Saved profile"}
      </div>
      <button
        type="button"
        onClick={() => setEditing((current) => !current)}
        className={editing
          ? "min-h-11 rounded-xl border border-emerald-400/35 bg-emerald-500/15 px-4 text-sm font-black text-emerald-100"
          : "min-h-11 rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950"}
      >
        {editing ? "Done Editing" : "Edit Profile"}
      </button>
    </div>
  );
}
