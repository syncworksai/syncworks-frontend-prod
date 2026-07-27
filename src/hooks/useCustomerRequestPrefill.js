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

export async function loadCustomerRequestProfile() {
  if (cachedProfile) return cachedProfile;
  if (!profilePromise) {
    profilePromise = api
      .get("/customer-settings/me/")
      .then((response) => {
        const data = response?.data || {};
        const customer = data.customer_profile || {};
        const location = splitAddress(data.default_address, data.default_zip);
        cachedProfile = {
          firstName: customer.first_name || "",
          lastName: customer.last_name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          preferredContactMethod: customer.preferred_contact_method || "EMAIL",
          ...location,
        };
        return cachedProfile;
      })
      .catch(() => null)
      .finally(() => {
        profilePromise = null;
      });
  }
  return profilePromise;
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
