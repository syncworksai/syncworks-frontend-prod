// src/components/upgrade/categories/CategoryWizard.jsx
import React from "react";
import WizardHeader from "./WizardHeader";
import GridCards from "./GridCards";
import ServicesPicker from "./ServicesPicker";
import SearchResults from "./SearchResults";
import SelectedTray from "./SelectedTray";
import SelectedList from "./SelectedList";
import { ROOT_EMOJI } from "../constants";

function isLeaf(cat) {
  return !!cat?.is_leaf;
}

export default function CategoryWizard({
  businessSelected,
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
  selectedLeafObjects,
  setSelectedLeafObjects,
  onPickRoot,
  onPickGroup,
  onDrill,
  onToggleLeaf,
  onRemoveLeaf,
  onGoReview,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
      <div className="mt-1">
        <SelectedTray ids={servicesPick} map={selectedLeafObjects} onRemove={onRemoveLeaf} />
      </div>

      <div className="mt-3">
        <WizardHeader step={wizardStep} onStep={setWizardStep} />
      </div>

      <div className="mt-3">
        <input
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm"
          placeholder="🔎 Search services (taxes, legal, plumbing, dog grooming...)"
          value={catSearch}
          onChange={(e) => setCatSearch(e.target.value)}
          disabled={!businessSelected}
        />

        {catSearch.trim() ? (
          <div className="mt-3">
            <div className="text-xs text-slate-400 mb-2">Search results</div>
            <SearchResults
              items={catSearchResults}
              selected={servicesPick}
              onToggle={(id, obj) => onToggleLeaf(id, obj)}
              disabled={!businessSelected}
              onDrill={(parent) => {
                if (!isLeaf(parent)) {
                  onDrill(parent);
                  setWizardStep(2);
                }
              }}
              setSelectedLeafObjects={setSelectedLeafObjects}
            />
          </div>
        ) : (
          <>
            {wizardStep === 0 ? (
              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-2">1) Pick an Industry</div>
                <GridCards
                  items={roots}
                  loading={catLoading}
                  onPick={(r) => onPickRoot(r)}
                  selectedId={rootPick?.id}
                  disabled={!businessSelected}
                  emojiMap={ROOT_EMOJI}
                />
              </div>
            ) : null}

            {wizardStep === 1 ? (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs text-slate-400">
                    2) Pick a Group {rootPick ? `— in ${rootPick.name}` : ""}
                  </div>
                  <button
                    className="text-xs px-3 py-1 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900"
                    onClick={() => setWizardStep(0)}
                    type="button"
                  >
                    ← Back
                  </button>
                </div>

                <GridCards
                  items={groups}
                  loading={catLoading}
                  onPick={(g) => onPickGroup(g)}
                  selectedId={groupPick?.id}
                  disabled={!businessSelected}
                />
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs text-slate-400">
                    3) Pick Services ✅ {groupPick ? `— in ${groupPick.name}` : ""}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs px-3 py-1 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900"
                      onClick={() => setWizardStep(1)}
                      type="button"
                    >
                      ← Back
                    </button>
                    <button
                      className="text-xs px-3 py-1 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25"
                      onClick={onGoReview}
                      type="button"
                    >
                      Review →
                    </button>
                  </div>
                </div>

                <ServicesPicker
                  items={services}
                  selected={servicesPick}
                  onToggle={(id, obj) => onToggleLeaf(id, obj)}
                  onDrill={(parent) => onDrill(parent)}
                  disabled={!businessSelected}
                  setSelectedLeafObjects={setSelectedLeafObjects}
                />
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs text-slate-400">4) Review 🎯</div>
                  <button
                    className="text-xs px-3 py-1 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900"
                    onClick={() => setWizardStep(2)}
                    type="button"
                  >
                    ← Back
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                  <div className="mt-3">
                    <div className="text-xs text-slate-400 mb-2">Selected services</div>
                    <SelectedList ids={servicesPick} map={selectedLeafObjects} />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}