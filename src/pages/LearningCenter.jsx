import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ModeBar from "../components/ModeBar";

const GUIDES = [
  {
    key: "business.setup",
    category: "Getting Started",
    title: "Set up your business workspace",
    summary:
      "Create the business, choose how work enters SyncWorks, and prepare the team for a test job.",
    steps: [
      "Confirm the business name, location, phone, and service area.",
      "Add owners, managers, dispatchers, technicians, or team members.",
      "Choose the services or products the business provides.",
      "Configure customer communication preferences.",
      "Create one test ticket and move it through the full process.",
    ],
  },
  {
    key: "workflow.setup",
    category: "Operations",
    title: "Create a workflow people can follow",
    summary:
      "Turn a complicated operation into clear stages, blockers, owners, and next actions.",
    steps: [
      "List the major stages from request through completion.",
      "Identify approvals, materials, resources, and payment dependencies.",
      "Define what makes a job blocked and who must resolve it.",
      "Set the customer updates that should fire at important changes.",
      "Run a real example and remove any stage that adds unnecessary work.",
    ],
  },
  {
    key: "assets.identifiers",
    category: "Tracking",
    title: "Prepare assets, barcodes, VINs, and QR codes",
    summary:
      "Plan how SyncWorks will recognize vehicles, equipment, inventory, products, orders, and customer assets.",
    steps: [
      "Choose the item or asset type to track.",
      "Use an existing VIN, barcode, SKU, serial number, or internal code when available.",
      "Generate a SyncWorks QR code when the item has no useful identifier.",
      "Link the item to its customer, business location, or active ticket.",
      "Test the phone scan and confirm it opens the correct record.",
    ],
  },
  {
    key: "resources.setup",
    category: "Operations",
    title: "Set up bays, trucks, crews, stations, and other resources",
    summary:
      "Resources represent anything with limited capacity that work must use.",
    steps: [
      "Create each resource and give it a clear name.",
      "Set its type, location, working hours, and capacity.",
      "Add required skills or restrictions.",
      "Assign a test ticket to the resource.",
      "Confirm SyncWorks can show what is available, occupied, or blocked.",
    ],
  },
  {
    key: "inventory.reorder",
    category: "Inventory",
    title: "Set inventory and reorder rules",
    summary:
      "Prevent work from stopping because a required part, ingredient, or product is missing.",
    steps: [
      "Add common items and their vendor or source.",
      "Set current quantity, storage location, and cost.",
      "Choose the minimum safe quantity.",
      "Set whether SyncWorks should alert or prepare a draft purchase order.",
      "Test receiving and reserving the item for a job or order.",
    ],
  },
  {
    key: "automation.customer_updates",
    category: "Automation",
    title: "Configure automatic customer updates",
    summary:
      "Keep customers informed when work changes without requiring employees to write every message.",
    steps: [
      "Choose which stage changes should notify the customer.",
      "Add approval, delay, part-arrival, ready, and payment messages.",
      "Set whether email, in-app, or paid SMS delivery is used.",
      "Preview the message with a realistic ticket.",
      "Confirm the business can pause automation for sensitive situations.",
    ],
  },
  {
    key: "inbox.controls",
    category: "Communication",
    title: "Use the inbox efficiently",
    summary:
      "Keep Personal, Business, and Employee conversations separated and actionable.",
    steps: [
      "Open a conversation to mark visible messages read.",
      "Pin priority conversations.",
      "Flag threads that need follow-up.",
      "Mute low-priority threads when appropriate.",
      "Open the related ticket for operational details.",
    ],
  },
];

const CHECKLISTS = [
  {
    title: "Universal business launch",
    items: [
      "Business profile completed",
      "Team and permissions added",
      "Services or products configured",
      "Workflow reviewed",
      "Customer updates configured",
      "First test ticket completed",
    ],
  },
  {
    title: "Tracking and scanning readiness",
    items: [
      "Trackable item types selected",
      "Existing barcodes or serials identified",
      "QR labels planned",
      "Locations or resources named",
      "Phone scanning tested",
    ],
  },
  {
    title: "Operational automation readiness",
    items: [
      "Blocked reasons defined",
      "Approval rules defined",
      "Inventory alerts defined",
      "ETA inputs identified",
      "Customer notification moments selected",
    ],
  },
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function LearningCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("article") || "";
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState(
    GUIDES.some((guide) => guide.key === requested)
      ? requested
      : GUIDES[0].key
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return GUIDES;
    return GUIDES.filter((guide) =>
      [guide.title, guide.summary, guide.category, guide.key]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [query]);

  const selected =
    GUIDES.find((guide) => guide.key === selectedKey) || filtered[0] || GUIDES[0];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <ModeBar
        title="Learning Center"
        subtitle="Step-by-step help for setup, tracking, workflows, and automation"
        rightActions={[
          {
            label: "Back",
            onClick: () => navigate(-1),
          },
        ]}
      />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 pb-28 md:py-7">
        <section className="overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/12 via-indigo-500/8 to-fuchsia-500/10 p-5 md:p-7">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">
              Learn while you work
            </div>
            <h1 className="mt-3 text-2xl font-black text-white md:text-4xl">
              SyncWorks should teach the next stepâ€”not require a training manual.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">
              Search a task, follow the walkthrough, then return directly to the
              workflow. Contextual â€œiâ€ buttons throughout the platform will link
              back to these guides.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-800 bg-slate-950/55 p-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search setup, scanning, inventoryâ€¦"
              className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
            />

            <div className="mt-3 space-y-2">
              {filtered.map((guide) => (
                <button
                  key={guide.key}
                  type="button"
                  onClick={() => setSelectedKey(guide.key)}
                  className={cx(
                    "w-full rounded-2xl border p-3 text-left transition",
                    selected?.key === guide.key
                      ? "border-cyan-400/40 bg-cyan-500/12"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  )}
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                    {guide.category}
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    {guide.title}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <article className="rounded-[2rem] border border-slate-800 bg-slate-950/55 p-5 md:p-7">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">
              {selected.category}
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">
              {selected.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {selected.summary}
            </p>

            <ol className="mt-6 space-y-3">
              {selected.steps.map((step, index) => (
                <li
                  key={`${selected.key}-${index}`}
                  className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xs font-black text-slate-950">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-6 text-slate-200">
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <div className="text-xs font-black uppercase tracking-wider text-emerald-200">
                SYNC coaching prompt
              </div>
              <p className="mt-2 text-sm leading-6 text-emerald-50">
                Ask: â€œWhat should I do next?â€ SYNC should use setup status,
                blockers, inventory, resource capacity, approvals, and customer
                communication to recommend the next action.
              </p>
            </div>
          </article>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-xl font-black text-white">Setup checklists</h2>
            <p className="mt-1 text-sm text-slate-400">
              These will become industry-aware as configuration packs are added.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {CHECKLISTS.map((checklist) => (
              <div
                key={checklist.title}
                className="rounded-[2rem] border border-slate-800 bg-slate-950/55 p-5"
              >
                <h3 className="font-black text-white">{checklist.title}</h3>
                <div className="mt-4 space-y-3">
                  {checklist.items.map((item) => (
                    <label
                      key={item}
                      className="flex items-start gap-3 text-sm text-slate-300"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-950"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
