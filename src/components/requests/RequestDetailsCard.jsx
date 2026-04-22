// src/components/requests/RequestDetailsCard.jsx
import React from "react";

export default function RequestDetailsCard({
  details,
  setDetails,
  paymentPreference,
  setPaymentPreference,
  contactPreference,
  setContactPreference,
  bestPhone,
  setBestPhone,
}) {
  return (
    <div className="space-y-4">
      {/* Description */}
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Describe the issue..."
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3"
      />

      {/* Phone */}
      <input
        value={bestPhone}
        onChange={(e) => setBestPhone(e.target.value)}
        placeholder="Best phone number"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3"
      />

      {/* Contact Preference */}
      <div className="flex gap-2 flex-wrap">
        {["call", "text", "either"].map((opt) => (
          <button
            key={opt}
            onClick={() => setContactPreference(opt)}
            className={`px-3 py-1 rounded-xl ${
              contactPreference === opt
                ? "bg-cyan-500 text-black"
                : "bg-slate-800"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Payment */}
      <div className="flex gap-2 flex-wrap">
        {["card", "cash", "invoice"].map((opt) => (
          <button
            key={opt}
            onClick={() => setPaymentPreference(opt)}
            className={`px-3 py-1 rounded-xl ${
              paymentPreference === opt
                ? "bg-green-500 text-black"
                : "bg-slate-800"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}