import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import Button from "../components/ui/Button";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
const CSV_COLUMNS = ["name", "property_type", "address", "city", "state", "zip", "status", "notes"];

function propertyImage(property) {
  return property?.image_url || property?.photo_url || property?.cover_image_url || property?.logo_url || "";
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "_").replaceAll("-", "_");
}

function importErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") return Object.entries(data).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" · ");
  return "The row could not be imported.";
}

export default function PMProperties() {
  const nav = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [properties, setProperties] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const workspaceResponse = await api.get("/pm-hub/workspaces/current/");
      setWorkspace(workspaceResponse.data);
      const headers = { "X-PM-Workspace-ID": String(workspaceResponse.data.id) };
      const response = await api.get("/pm-hub/properties/", { headers });
      setProperties(list(response.data));
    } catch (e) {
      setProperties([]);
      setError(e?.response?.data?.detail || "Could not load the property portfolio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const occupancy = properties.map((item) => Number(item?.occupancy_rate || 0)).filter((value) => Number.isFinite(value));
    const average = occupancy.length ? Math.round((occupancy.reduce((sum, value) => sum + value, 0) / occupancy.length) * 100) : 0;
    const risk = properties.filter((item) => String(item?.status || "").toUpperCase() === "AT_RISK").length;
    return { total: properties.length, average, risk };
  }, [properties]);

  function exportProperties() {
    const rows = [CSV_COLUMNS, ...properties.map((property) => CSV_COLUMNS.map((column) => property?.[column] ?? ""))];
    downloadCsv(`${workspace?.name || "syncworks"}-properties.csv`, rows);
    setMessage(`${properties.length} properties exported. Open the CSV in Excel or Google Sheets.`);
  }

  function downloadTemplate() {
    downloadCsv("syncworks-property-import-template.csv", [CSV_COLUMNS, ["Example Property", "HOME", "123 Main Street", "Montgomery", "AL", "36104", "HEALTHY", "Optional notes"]]);
    setMessage("Template downloaded. Complete it in Excel or Google Sheets, then save or download it as CSV before importing.");
  }

  async function importSpreadsheet(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !workspace?.id) return;
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("The spreadsheet has no property rows.");
      const headers = rows[0].map(normalizeHeader);
      const missing = ["name", "address", "city", "state", "zip"].filter((column) => !headers.includes(column));
      if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}.`);
      const requestHeaders = { "X-PM-Workspace-ID": String(workspace.id) };
      const failures = [];
      let imported = 0;
      for (let index = 1; index < rows.length; index += 1) {
        const source = rows[index];
        const record = Object.fromEntries(headers.map((header, columnIndex) => [header, source[columnIndex] ?? ""]));
        const payload = {
          name: String(record.name || "").trim(),
          property_type: String(record.property_type || "HOME").trim().toUpperCase(),
          address: String(record.address || "").trim(),
          city: String(record.city || "").trim(),
          state: String(record.state || "").trim().toUpperCase().slice(0, 2),
          zip: String(record.zip || "").trim(),
          status: String(record.status || "HEALTHY").trim().toUpperCase(),
          notes: String(record.notes || "").trim(),
        };
        if (!payload.name && !payload.address) continue;
        try {
          await api.post("/pm-hub/properties/", payload, { headers: requestHeaders });
          imported += 1;
        } catch (rowError) {
          failures.push(`Row ${index + 1}: ${importErrorMessage(rowError)}`);
        }
      }
      await load();
      setMessage(`${imported} ${imported === 1 ? "property" : "properties"} imported successfully.${failures.length ? ` ${failures.length} row(s) need correction.` : ""}`);
      if (failures.length) setError(failures.slice(0, 5).join(" | "));
    } catch (importError) {
      setError(importError?.message || "Could not import the spreadsheet.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <main className="space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 via-[#07111f] to-fuchsia-500/10 p-5">
          <div><div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Portfolio Inventory</div><div className="mt-2 text-xl font-black text-white">Properties</div><p className="mt-1 text-sm text-slate-400">Open a property to manage units, occupancy, tenants, documents, and activity.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button tone="slate" onClick={load} disabled={loading}>Refresh</Button>
            <Button tone="slate" onClick={downloadTemplate}>Download Template</Button>
            <Button tone="slate" onClick={() => fileInputRef.current?.click()} disabled={importing}>{importing ? "Importing..." : "Import Spreadsheet"}</Button>
            <Button tone="slate" onClick={exportProperties} disabled={!properties.length}>Export CSV</Button>
            <Button tone="cyan" onClick={() => nav("/pm/properties/new")}>Add Property</Button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={importSpreadsheet} />
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-xs text-slate-400">
          Spreadsheet workflow: download the template, edit it in Excel or Google Sheets, then save or download it as a CSV file and import it here.
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[["Total Properties", stats.total, "Portfolio inventory"], ["Average Occupancy", `${stats.average}%`, "Across recorded properties"], ["At Risk", stats.risk, "Requires attention"]].map(([label, value, hint]) => <div key={label} className="rounded-3xl border border-cyan-500/15 bg-[#07111f]/95 p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div><div className="mt-3 text-3xl font-black text-white">{value}</div><div className="mt-2 text-xs text-slate-500">{hint}</div></div>)}
        </div>

        {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div> : null}
        {message ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{message}</div> : null}

        <section className="rounded-[28px] border border-cyan-500/15 bg-[#07111f]/90 p-4 sm:p-5">
          {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading properties...</div> : properties.length ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {properties.map((property, index) => {
                const image = propertyImage(property);
                const occupancy = Math.round(Number(property?.occupancy_rate || 0) * 100);
                return <button key={property.id} type="button" onClick={() => nav(`/pm/properties/${property.id}`)} className="group overflow-hidden rounded-3xl border border-slate-700/80 bg-black/25 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/45 hover:shadow-[0_18px_50px_rgba(34,211,238,0.08)]">
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-cyan-500/20 via-[#07111f] to-fuchsia-500/20">
                    {image ? <img src={image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><div className="text-5xl font-black text-cyan-200/25">{String(property.name || index + 1).slice(0, 1).toUpperCase()}</div></div>}
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#030814] to-transparent" />
                  </div>
                  <div className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black text-white">{property.name || "Unnamed Property"}</div><div className="mt-1 text-xs text-slate-500">{[property.address, property.city, property.state].filter(Boolean).join(", ") || "Address not entered"}</div></div><span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold text-cyan-200">{property.status || "OPEN"}</span></div><div className="mt-5"><div className="flex justify-between text-xs"><span className="text-slate-500">Occupancy</span><span className="font-bold text-white">{occupancy}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" style={{ width: `${Math.min(100, Math.max(0, occupancy))}%` }} /></div></div></div>
                </button>;
              })}
            </div>
          ) : <div className="rounded-3xl border border-dashed border-slate-700 py-16 text-center"><div className="text-sm text-slate-500">No properties have been added yet.</div><div className="mt-4"><Button tone="cyan" onClick={() => nav("/pm/properties/new")}>Add First Property</Button></div></div>}
        </section>
      </main>
    </div>
  );
}
