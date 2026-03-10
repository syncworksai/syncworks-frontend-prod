// src/components/upgrade/steps/Step2Setup.jsx
import React from "react";
import UpgradeCard from "../ui/UpgradeCard";
import UpgradeField from "../ui/UpgradeField";
import CategoryWizard from "../categories/CategoryWizard";
import { DEFAULT_RADIUS, QUICK_RADII } from "../constants";

export default function Step2Setup({
  businessSelected,
  hasBasics,
  hasServices,
  baseZip,
  setBaseZip,
  radius,
  setRadius,
  acceptsMarketplace,
  setAcceptsMarketplace,
  savingSetup,
  saveBusinessSetup,
  loadRoots,
  catLoading,
  roots,
  groups,
  services,
  rootPick,
  groupPick,
  wizardStep,
  setWizardStep,
  catSearch,
  setCatSearch,
  catSearchResults,
  servicesPick,
  setServicesPick,
  selectedLeafObjects,
  setSelectedLeafObjects,
  pickRoot,
  pickGroup,
  drillDownParent,
  toggleLeaf,
  removeLeaf,
  resetWizard,
  goReview,
}) {
  return (
    <UpgradeCard
      title="Step 2 — Business setup 🧠"
      subtitle="ZIP + radius + services (leaf). Marketplace setting is inside the Services box."
      badge={hasBasics && hasServices ? "Setup ready ✅" : "Complete setup"}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <UpgradeField label="Base ZIP 📍">
          <input
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
            placeholder="e.g., 30318"
            value={baseZip}
            onChange={(e) => setBaseZip(e.target.value)}
            disabled={!businessSelected}
          />
          <div className="text-[11px] text-slate-500 mt-1">Required for routing + matching.</div>
        </UpgradeField>

        <UpgradeField label="Service radius (miles) 🧭">
          <div className="flex gap-2 flex-wrap">
            <input
              type="number"
              min={1}
              max={300}
              className="flex-1 min-w-[120px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              disabled={!businessSelected}
            />
            <div className="flex gap-1 flex-wrap">
              {QUICK_RADII.map((r) => (
                <button
                  key={r}
                  className={
                    "px-3 py-2 rounded-xl text-xs border " +
                    (Number(radius) === r
                      ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-100"
                      : "bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-900")
                  }
                  onClick={() => setRadius(r)}
                  disabled={!businessSelected}
                  type="button"
                >
                  {r}mi
                </button>
              ))}
            </div>
          </div>
        </UpgradeField>

        <div className="sm:col-span-2">
          <UpgradeField label="Services & Marketplace Settings ✅">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Marketplace tickets 🌎</div>
                  <div className="text-[11px] text-slate-500 mt-1">ON = you can receive matching marketplace tickets.</div>
                </div>

                <label className="flex items-center gap-3 text-sm">
                  <span className="text-slate-400 text-xs">OFF</span>
                  <input
                    type="checkbox"
                    checked={acceptsMarketplace}
                    onChange={(e) => setAcceptsMarketplace(e.target.checked)}
                    disabled={!businessSelected}
                    className="scale-110"
                  />
                  <span className="text-slate-200 text-xs">ON</span>
                  <span className="text-[11px] px-2 py-1 rounded-full border border-slate-700 bg-slate-950">
                    {acceptsMarketplace ? "Enabled ✅" : "Disabled"}
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                className="rounded-xl px-3 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs"
                onClick={loadRoots}
                disabled={!businessSelected}
                type="button"
              >
                Reload categories
              </button>
              <button
                className="rounded-xl px-3 py-2 bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/20 text-xs"
                onClick={() => setServicesPick([])}
                disabled={!businessSelected || !servicesPick.length}
                type="button"
              >
                Clear selected
              </button>
              <button
                className="rounded-xl px-3 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-xs"
                onClick={resetWizard}
                disabled={!businessSelected}
                type="button"
              >
                Restart wizard
              </button>
            </div>

            <div className="mt-3 text-[12px] text-slate-400 leading-relaxed">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="font-semibold text-slate-200 mb-1">How to select multiple services</div>
                <ul className="list-disc ml-5 space-y-1">
                  <li>
                    ✅ Click any <span className="text-slate-200">leaf service</span> to select it. Click again to unselect.
                  </li>
                  <li>Your selections stay saved while you browse other groups/industries.</li>
                  <li>Use search to quickly find services (then tap to add to your selected tray).</li>
                  <li>📁 Parent categories are not selectable — click them to drill down to leaf services.</li>
                </ul>
              </div>
            </div>

            <div className="mt-3">
              <CategoryWizard
                businessSelected={businessSelected}
                catLoading={catLoading}
                roots={roots}
                groups={groups}
                services={services}
                rootPick={rootPick}
                groupPick={groupPick}
                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
                catSearch={catSearch}
                setCatSearch={setCatSearch}
                catSearchResults={catSearchResults}
                servicesPick={servicesPick}
                selectedLeafObjects={selectedLeafObjects}
                setSelectedLeafObjects={setSelectedLeafObjects}
                onPickRoot={pickRoot}
                onPickGroup={pickGroup}
                onDrill={drillDownParent}
                onToggleLeaf={toggleLeaf}
                onRemoveLeaf={removeLeaf}
                onGoReview={goReview}
                onResetWizard={resetWizard}
              />
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                className="rounded-xl px-4 py-2 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500/30 text-sm disabled:opacity-60"
                onClick={saveBusinessSetup}
                disabled={!businessSelected || savingSetup}
                type="button"
              >
                {savingSetup ? "Saving..." : "Save Setup"}
              </button>

              <span className="text-xs text-slate-500">Save to start receiving matching tickets in your queue.</span>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Defaults: radius {DEFAULT_RADIUS}mi — adjust anytime.
            </div>
          </UpgradeField>
        </div>
      </div>
    </UpgradeCard>
  );
}