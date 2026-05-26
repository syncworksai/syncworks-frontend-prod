import React from "react";

export default function AffiliateTaxDocuments({
  documents = [],
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/45 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-black text-slate-100">
            Tax Documents
          </div>

          <div className="mt-1 text-sm text-slate-400">
            Year-end payout and tax reporting documents.
          </div>
        </div>

        <div className="px-3 py-1 rounded-full border border-slate-700 bg-slate-900/60 text-slate-300 text-[11px] font-semibold">
          1099 CENTER
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {documents.length ? (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-100">
                    {doc.label}
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    {doc.description}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!doc.url}
                  className={`h-10 px-4 rounded-2xl text-sm font-semibold border ${
                    doc.url
                      ? "border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/18 text-cyan-100"
                      : "border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {doc.url ? "Download" : "Coming Soon"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-slate-500">
            No tax documents available yet.
          </div>
        )}
      </div>
    </div>
  );
}