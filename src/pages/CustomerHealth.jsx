// src/pages/CustomerHealth.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import ModeBar from "../components/ModeBar";
import PaidGate from "../components/paid/PaidGate";

const STRIPE_HEALTH_CHECKOUT_URL = "https://buy.stripe.com/4gMfZh0Y2ar5aT70Kn2Nq0b";

// ✅ Put your logo here:
// Place the image in: syncworks_v7_1_frontend/public/brands/health.jpg
// Then this URL will work without imports (no build break).
const HEALTH_LOGO_URL = "/brands/health.jpg";

export default function CustomerHealth() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Health & Fitness"
        subtitle="Daily readiness • Workout builder • Nutrition basics"
        rightActions={
          <button
            onClick={() => nav("/customer")}
            className="text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
          >
            Back
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <PaidGate
          entitlementKey="health"
          title="Health & Fitness (Paid Add-On)"
          subtitle="Unlock daily readiness, workout planning, and nutrition tools. No gimmicks — just a clean system you can reuse forever."
          checkoutUrl={STRIPE_HEALTH_CHECKOUT_URL}
          ctaTo="/upgrade"
          ctaLabel="View plans / Upgrade"
          iconUrl={HEALTH_LOGO_URL}
        >
          {/* Unlocked content (we’ll build the real module next) */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">You’re unlocked ✅</div>
                <div className="text-sm text-slate-300 mt-1">
                  Next we’ll build the real Health module screens: Readiness → Workout of the Day → Weekly Program →
                  Nutrition → History.
                </div>
              </div>

              <button
                onClick={() => nav("/customer/settings")}
                className="shrink-0 text-xs rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900"
              >
                Settings
              </button>
            </div>

            <div className="mt-5 grid lg:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Daily Readiness</div>
                <div className="mt-2 text-sm text-slate-200">
                  Sleep • soreness • pain flags • time available • equipment. Generates a smart workout suggestion.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Workout of the Day</div>
                <div className="mt-2 text-sm text-slate-200">
                  A structured plan with substitutions + stop/continue signals + an Add-to-Calendar (ICS) download.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="text-xs text-slate-400">Nutrition Basics</div>
                <div className="mt-2 text-sm text-slate-200">
                  Protein target calculator • meal templates • simple habit tracking (no weird diet cult stuff).
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="font-semibold">Coming next</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-300 list-disc pl-5">
                <li>Questionnaire (goal, frequency, equipment, experience, limitations) → stored in CustomerSettings.fitness_profile</li>
                <li>Readiness log + workout history tables (backend CRUD endpoints)</li>
                <li>Workout calendar event export (ICS) per session</li>
                <li>Weekly structure templates (beginner/intermediate/advanced)</li>
              </ul>
            </div>
          </div>
        </PaidGate>
      </main>
    </div>
  );
}
