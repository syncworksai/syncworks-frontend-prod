// src/pages/CustomerNewRequest.jsx
import React, { useState } from "react";
import api from "../api/client";

import RequestStepNav from "../components/requests/RequestStepNav";
import RequestDetailsCard from "../components/requests/RequestDetailsCard";
import RequestLocationCard from "../components/requests/RequestLocationCard";

export default function CustomerNewRequest() {
  const [step, setStep] = useState(0);

  const [details, setDetails] = useState("");
  const [address, setAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [accessNotes, setAccessNotes] = useState("");

  const [paymentPreference, setPaymentPreference] = useState("card");
  const [contactPreference, setContactPreference] = useState("either");
  const [bestPhone, setBestPhone] = useState("");

  const handleSubmit = async () => {
    try {
      await api.post("/requests/", {
        description: details,
        address,
        unit,
        access_notes: accessNotes,
        payment_preference: paymentPreference,
        contact_preference: contactPreference,
        best_phone: bestPhone,
        is_marketplace: true,
      });

      alert("Request submitted!");
    } catch (e) {
      console.error(e);
      alert("Error submitting request");
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <RequestStepNav step={step} setStep={setStep} />

      {step === 0 && (
        <div className="text-slate-400">
          Category selection coming next step (already working)
        </div>
      )}

      {step === 1 && (
        <div className="text-slate-400">
          Type selection (your existing logic stays)
        </div>
      )}

      {step === 2 && (
        <div className="text-slate-400">
          Exact job selection (your current UI stays)
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <RequestLocationCard
            address={address}
            setAddress={setAddress}
            unit={unit}
            setUnit={setUnit}
            accessNotes={accessNotes}
            setAccessNotes={setAccessNotes}
          />

          <RequestDetailsCard
            details={details}
            setDetails={setDetails}
            paymentPreference={paymentPreference}
            setPaymentPreference={setPaymentPreference}
            contactPreference={contactPreference}
            setContactPreference={setContactPreference}
            bestPhone={bestPhone}
            setBestPhone={setBestPhone}
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-cyan-500 text-black p-3 rounded-xl"
          >
            Submit Request
          </button>
        </div>
      )}
    </div>
  );
}