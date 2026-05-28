// src/components/requests/new-request/DynamicIntakeCard.jsx
import React from "react";
import {
  getDynamicFields,
  renderDynamicFieldInputProps,
} from "./requestDynamicFields";
import { cx } from "./requestMarketplaceCatalog";

function FieldRenderer({ field, value, onChange }) {
  const common = renderDynamicFieldInputProps(field, value, (e) =>
    onChange(field.name, e.target.value)
  );

  return (
    <label className={cx("block", field.fullWidth ? "md:col-span-2" : "")}>
      <span className="text-[11px] font-semibold text-slate-400">
        {field.label}
      </span>

      {field.type === "select" ? (
        <select {...common} className={`${common.className} cursor-pointer`}>
          <option value="" className="bg-slate-950 text-slate-100">
            Select…
          </option>
          {(field.options || []).map((option) => (
            <option
              key={option}
              value={option}
              className="bg-slate-950 text-slate-100"
            >
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea {...common} rows={field.rows || 4} />
      ) : (
        <input type={field.type || "text"} min={field.min} {...common} />
      )}
    </label>
  );
}

export default function DynamicIntakeCard({
  selectedService,
  dynamicIntake,
  setDynamicIntake,
  mode = "CUSTOMER_MARKETPLACE",
}) {
  const isBusinessInternal = mode === "BUSINESS_INTERNAL";
  const fieldGroup = getDynamicFields(selectedService);
  const fields = fieldGroup?.fields || [];

  function updateDynamicField(name, value) {
    setDynamicIntake((prev) => ({
      ...(prev || {}),
      [name]: value,
    }));
  }

  if (!selectedService) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5 text-sm text-slate-400">
        Select a service first and SyncWorks will show smart fields for that
        ticket type.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4 shadow-[0_0_34px_rgba(34,211,238,0.08)] md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-cyan-100">
            {fieldGroup?.label || "Ticket details"}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {isBusinessInternal
              ? "These fields help your team quote, schedule, assign, and complete the ticket faster."
              : "Smart fields change based on what the customer selected, so the experience feels easy instead of like a long form."}
          </div>
        </div>

        <div className="hidden rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 sm:inline-flex">
          Smart Intake
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-lg">
            {selectedService.verticalIcon || "🎫"}
          </div>

          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Ticket context
            </div>
            <div className="mt-1 text-sm font-black text-slate-100">
              {selectedService.label}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-400">
              {selectedService.verticalLabel} • {selectedService.categoryLabel} •{" "}
              {selectedService.ticketType || "TICKET"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            value={dynamicIntake?.[field.name] || ""}
            onChange={updateDynamicField}
          />
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/65 p-3 text-xs leading-5 text-slate-400">
        {isBusinessInternal ? (
          <>
            For business-created tickets, this keeps intake fast when a customer
            calls in. Later, these answers can drive automations, quote templates,
            SMS follow-ups, and employee assignment rules.
          </>
        ) : (
          <>
            For customers, this keeps the marketplace experience simple. Behind
            the scenes, SyncWorks stores the structured answers inside the ticket
            intake payload for routing and automation.
          </>
        )}
      </div>
    </div>
  );
}