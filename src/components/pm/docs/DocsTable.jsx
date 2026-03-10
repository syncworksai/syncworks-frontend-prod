// src/components/pm/docs/DocsTable.jsx
import React from "react";
import { Pill, IconBtn, fmtDateTime, extFromName, docToneByType } from "./docsUi";

export default function DocsTable({ filteredDocs, propertyById, unitById, tenantById, onOpen, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-950/60">
          <tr className="text-slate-300">
            <th className="px-4 py-3 font-semibold">Doc</th>
            <th className="px-4 py-3 font-semibold">Scope</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">File</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800">
          {filteredDocs.map((d) => {
            const p = d.property ? propertyById.get(String(d.property)) : null;
            const u = d.unit ? unitById.get(String(d.unit)) : null;
            const t = d.tenant ? tenantById.get(String(d.tenant)) : null;

            const propName = p?.name || (d.property ? `#${d.property}` : "—");
            const unitLabel = u?.label || u?.unit_number || u?.name || (d.unit ? `#${d.unit}` : "");
            const tenantName = t ? ([t.first_name, t.last_name].filter(Boolean).join(" ").trim() || t.full_name || `#${t.id}`) : "";

            const type = String(d.doc_type || "GENERAL").toUpperCase();
            const fileName = d.file_name || d.filename || d.original_name || d.file || "—";
            const ext = extFromName(fileName);
            const title = d.title || fileName;

            return (
              <tr key={d.id} className="bg-slate-950/20 hover:bg-slate-950/35">
                <td className="px-4 py-3">
                  <div className="text-slate-100 font-semibold">{title}</div>
                  <div className="text-[11px] text-slate-500">#{d.id}</div>
                </td>

                <td className="px-4 py-3 text-slate-200">
                  <div className="text-slate-100">{propName}</div>
                  <div className="text-[11px] text-slate-500">
                    {unitLabel ? `Unit: ${unitLabel}` : ""}
                    {tenantName ? (unitLabel ? ` • Tenant: ${tenantName}` : `Tenant: ${tenantName}`) : ""}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <Pill tone={docToneByType(type)}>{type}</Pill>
                </td>

                <td className="px-4 py-3 text-slate-300">
                  <div className="flex items-center gap-2">
                    <Pill tone="slate">{ext ? ext.toUpperCase() : "FILE"}</Pill>
                    <span className="truncate max-w-[320px]">{fileName}</span>
                  </div>
                </td>

                <td className="px-4 py-3 text-slate-400">{fmtDateTime(d.updated_at || d.created_at)}</td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <IconBtn tone="cyan" title="Open" onClick={() => onOpen?.(d)}>
                      🔗
                    </IconBtn>
                    <IconBtn tone="rose" title="Delete" onClick={() => onDelete?.(d)}>
                      ✖
                    </IconBtn>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
