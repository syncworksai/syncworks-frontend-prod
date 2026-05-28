// src/pages/BusinessInternalTicketCreator.jsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import UniversalTicketCreator from "../components/requests/new-request/UniversalTicketCreator";
import { MARKETPLACE_MODES } from "../components/requests/new-request/requestMarketplaceCatalog";
import { useAuth } from "../auth/AuthContext";

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.value)) return data.value;
  return [];
}

function normalizeServiceKeys(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return (
          item?.key ||
          item?.slug ||
          item?.name ||
          item?.label ||
          item?.category_key ||
          item?.service_key ||
          item?.id ||
          ""
        );
      })
      .map(String)
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
}

function collectBusinessServiceKeys(business) {
  if (!business) return [];

  const possible = [
    business.selected_services,
    business.selectedServices,
    business.service_keys,
    business.serviceKeys,
    business.services,
    business.service_categories,
    business.serviceCategories,
    business.categories,
    business.category_keys,
    business.categoryKeys,
  ];

  const keys = possible.flatMap(normalizeServiceKeys);

  const servicesText = String(
    business.services_text || business.description || business.headline || ""
  ).toLowerCase();

  const inferred = [];

  if (servicesText.includes("plumb")) inferred.push("plumbing");
  if (servicesText.includes("hvac") || servicesText.includes("air conditioning")) {
    inferred.push("hvac");
  }
  if (servicesText.includes("electric")) inferred.push("electrical");
  if (servicesText.includes("lawn") || servicesText.includes("landscap")) {
    inferred.push("lawn_landscaping");
  }
  if (servicesText.includes("tree")) inferred.push("tree_services");
  if (servicesText.includes("junk") || servicesText.includes("haul")) {
    inferred.push("junk_hauling");
  }
  if (servicesText.includes("clean")) inferred.push("cleaning");
  if (servicesText.includes("handyman")) inferred.push("handyman");
  if (servicesText.includes("roof")) inferred.push("roofing_gutters");
  if (servicesText.includes("auto") || servicesText.includes("mechanic")) {
    inferred.push("auto_services");
  }
  if (servicesText.includes("real estate") || servicesText.includes("realtor")) {
    inferred.push("real_estate");
  }
  if (servicesText.includes("property management")) {
    inferred.push("property_management");
  }
  if (servicesText.includes("dog") || servicesText.includes("pet")) {
    inferred.push("pets");
  }
  if (servicesText.includes("tutor")) inferred.push("education_tutoring");

  return Array.from(new Set([...keys, ...inferred].map(String).filter(Boolean)));
}

export default function BusinessInternalTicketCreator() {
  const navigate = useNavigate();
  const { myBusinesses, activeBusinessId } = useAuth();

  const activeBusiness = useMemo(() => {
    const list = safeList(myBusinesses);
    const found = list.find(
      (item) =>
        String(item?.id || item?.business_id || item?.business?.id || "") ===
        String(activeBusinessId || "")
    );

    return found?.business || found || null;
  }, [myBusinesses, activeBusinessId]);

  const businessServiceKeys = useMemo(
    () => collectBusinessServiceKeys(activeBusiness),
    [activeBusiness]
  );

  function handleCreated({ id }) {
    window.setTimeout(() => {
      if (id) {
        navigate(`/tickets/${id}`);
      } else {
        navigate("/sbo");
      }
    }, 700);
  }

  return (
    <UniversalTicketCreator
      mode={MARKETPLACE_MODES.BUSINESS_INTERNAL}
      business={activeBusiness}
      businessServiceKeys={businessServiceKeys}
      title="Create Business Ticket"
      subtitle="Use this when a customer calls, texts, or walks in. Only your business services should show here."
      onCreated={handleCreated}
      onCancel={() => navigate("/sbo")}
    />
  );
}