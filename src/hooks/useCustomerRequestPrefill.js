// src/hooks/useCustomerRequestPrefill.js
import { useEffect, useState } from "react";
import api from "../api/client";

let cachedProfile = null;
let profilePromise = null;

function splitAddress(value, fallbackZip = "") {
  const raw = String(value || "").trim();
  const result = {
    address: raw,
    unit: "",
    city: "",
    stateRegion: "",
    serviceZip: String(fallbackZip || "").trim(),
  };

  if (!raw) return result;

  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    result.address = parts.slice(0, -2).join(", ");
    result.city = parts[parts.length - 2] || "";
    const stateZip = parts[parts.length - 1] || "";
    const match = stateZip.match(/^([A-Za-z]{2})(?:\s+([0-9]{5}(?:-[0-9]{4})?))?$/);
    if (match) {
      result.stateRegion = match[1].toUpperCase();
      result.serviceZip = match[2] || result.serviceZip;
    }
  }

  return result;
}

function fromIdentity(data = {}) {
  const home = data.default_service_location || data.home_location || null;
  return {
    firstName: data?.user?.first_name || "",
    lastName: data?.user?.last_name || "",
    email: data?.user?.email || "",
    phone: data?.identity?.phone || "",
    preferredContactMethod: "EMAIL",
    address: home?.address_line1 || "",
    unit: home?.address_line2 || "",
    city: home?.city || "",
    stateRegion: home?.state || "",
    serviceZip: home?.postal_code || "",
    homeLocation: data.home_location || null,
    defaultServiceLocation: home,
    savedLocations: Array.isArray(data.locations) ? data.locations : [],
    source: "IDENTITY",
  };
}

async function legacyProfile() {
  const response = await api.get("/customer-settings/me/");
  const data = response?.data || {};
  const customer = data.customer_profile || {};
  const location = splitAddress(data.default_address, data.default_zip);
  return {
    firstName: customer.first_name || "",
    lastName: customer.last_name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    preferredContactMethod: customer.preferred_contact_method || "EMAIL",
    savedLocations: [],
    source: "LEGACY",
    ...location,
  };
}

export async function loadCustomerRequestProfile({ force = false } = {}) {
  if (force) cachedProfile = null;
  if (cachedProfile) return cachedProfile;
  if (!profilePromise) {
    profilePromise = (async () => {
      try {
        const response = await api.get("/identity/profile/");
        cachedProfile = fromIdentity(response?.data || {});
        return cachedProfile;
      } catch {
        // Transition safely while the identity API deploys. Once available it is
        // authoritative even when the user intentionally has no Home saved.
      }
      try {
        cachedProfile = await legacyProfile();
        return cachedProfile;
      } catch {
        return null;
      }
    })().finally(() => {
      profilePromise = null;
    });
  }
  return profilePromise;
}

export function clearCustomerRequestProfileCache() {
  cachedProfile = null;
}

export default function useCustomerRequestPrefill({ enabled = true, onProfile } = {}) {
  const [status, setStatus] = useState(enabled ? "loading" : "idle");

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setStatus("idle");
      return undefined;
    }

    setStatus("loading");
    loadCustomerRequestProfile().then((profile) => {
      if (!active) return;
      if (profile) {
        onProfile?.(profile);
        setStatus("ready");
      } else {
        setStatus("unavailable");
      }
    });

    return () => {
      active = false;
    };
  }, [enabled, onProfile]);

  return status;
}
