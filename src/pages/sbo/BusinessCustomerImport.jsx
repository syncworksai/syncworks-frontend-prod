import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, RefreshCw, UploadCloud } from "lucide-react";
import DashboardShell from "../../components/dashboard/DashboardShell";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

const DEMO_HEADERS = ["name", "company_name", "email", "phone", "service_address", "unit", "city", "state", "service_zip", "notes", "external_customer_id"];
const cls = "min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-400";
const asList = (value) => Array.isArray(value) ? value : (value?.results || []);
const responseError = (err) => {
  const data = err?.response?.data;
  if (!data) return err?.message || "The request failed. Please try again.";
  if (typeof data.detail === "string") return data.detail;
  return Object.entries(data).map(([key, value]) => key + ": " + (Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value)).join(" · ");
};

function downloadSample() {
  const sample = [DEMO_HEADERS, ["Sample Customer", "", "sample@example.com", "555-0100", "100 Main St", "", "Montgomery", "AL", "36104", "Example only; remove this row", "sample-001"]];
  const csv = sample.map((row) => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "syncworks-customer-import-template.csv";
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

export default function BusinessCustomerImport() {
  const navigate = useNavigate();
  const { activeBusinessId } = useAuth();
  const [file, setFile] = useState(null);
  const [source, setSource] = useState("Other software / spreadsheet");
  const [preview, setPreview] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [importComplete, setImportComplete] = useState(false);

  useEffect(() => {
    setFile(null); setPreview(null); setAccepted(false); setImportComplete(false);
    if (!activeBusinessId) { setHistory([]); return; }
    let active = true;
    api.get("/business-data-imports/", { headers: { "X-Business-Id": String(activeBusinessId) } })
      .then(res => { if (active) setHistory(asList(res.data)); })
      .catch(() => { if (active) setHistoryError("History couldn't be loaded; new imports may still work."); });
    return () => { active = false; };
  }, [activeBusinessId]);

  function chooseFile(next) {
    setError(""); setPreview(null); setAccepted(false); setImportComplete(false);
    if (next && (!next.name.toLowerCase().endsWith(".csv") || next.size > 5 * 1024 * 1024)) {
      setError("Choose a .csv file no larger than 5 MB.");
      setFile(null); return;
    }
    setFile(next || null);
  }

  async function submitPreview(event) {
    event.preventDefault();
    if (!file || !activeBusinessId) { setError("Select a Business profile and a customer CSV file."); return; }
    setBusy("preview"); setError(""); setAccepted(false); setImportComplete(false); setPreview(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("import_type", "CUSTOMERS");
      body.append("source_system", source.trim().slice(0, 100));
      const res = await api.post("/business-data-imports/preview/", body, { headers: { "X-Business-Id": String(activeBusinessId) } });
      setPreview(res.data);
      setHistory(prev => [res.data, ...prev.filter(row => row.id !== res.data.id)]);
    } catch (e) { setError(responseError(e)); }
    finally { setBusy(""); }
  }

  async function executeImport() {
    if (!preview || preview.status !== "READY" || !accepted || !activeBusinessId) return;
    if (!window.confirm("Import the validated customer records into this Business? Existing matches may be updated. This cannot be automatically undone.")) return;
    setBusy("execute"); setError("");
    try {
      const res = await api.post(`/business-data-imports/${encodeURIComponent(preview.id)}/execute/`,
        { confirm: true }, { headers: { "X-Business-Id": String(activeBusinessId) } });
      setPreview(res.data);
      setHistory(prev => [res.data, ...prev.filter(row => row.id !== res.data.id)]);
      setImportComplete(["COMPLETED", "COMPLETED_WITH_ERRORS"].includes(res.data.status));
    } catch (e) { setError(responseError(e)); }
    finally { setBusy(""); }
  }

  const ready = preview?.status === "READY" && preview?.summary?.ready_to_import === true;
  const errors = Array.isArray(preview?.errors) ? preview.errors : [];
  const samples = Array.isArray(preview?.sample_rows) ? preview.sample_rows : [];

  return (
    <DashboardShell modeBarTitle="Business" modeBarSubtitle="Customer Import">
      <div className="mx-auto max-w-4xl space-y-4 pb-24 text-slate-100">
        <header className="rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-indigo-500/10 p-5">
          <button type="button" onClick={() => navigate("/sbo/customers")} className="inline-flex min-h-10 items-center gap-2 text-xs font-black text-cyan-200">
            <ArrowLeft size={16}/> Customer 360
          </button>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Bring your customers with you</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Export your existing customer list from your old CRM, spreadsheet or contact system as CSV. Preview it before saving anything to the shared SyncWorks customer database.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadSample} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 text-sm font-bold text-cyan-100">
              <Download size={16}/> Download CSV template
            </button>
            <span className="text-xs text-slate-400">Up to 5 MB / 5,000 customer rows per file</span>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-lg font-black"><FileSpreadsheet size={20} className="text-cyan-300"/> 1. Upload and preview</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Supported columns include name, company_name, email, phone, address, city, state, ZIP, notes and external_customer_id. The backend recognizes common column names automatically. It imports customer records only—not old invoices or open balances.</p>
          {!activeBusinessId ? <p role="alert" className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">Choose your business from the Business dashboard before importing.</p> : null}
          <form onSubmit={submitPreview} className="mt-4 space-y-3">
            <label className="block text-xs font-bold text-slate-300">
              Source (optional)
              <input className={cls+" mt-1"} maxLength={100} value={source} onChange={e => setSource(e.target.value)} placeholder="Jobber / Housecall Pro / Excel"/>
            </label>
            <label className="block rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-xs text-slate-300">
              <span className="flex items-center gap-2 font-black"><UploadCloud size={18} className="text-cyan-300"/> Choose customer CSV</span>
              <input type="file" accept=".csv,text/csv" onChange={e => chooseFile(e.target.files?.[0] || null)} className="mt-3 block w-full text-xs"/>
              {file ? <span className="mt-2 block text-cyan-200">{file.name} ({Math.ceil(file.size / 1024)} KB)</span> : null}
            </label>
            <button type="submit" disabled={!file || !activeBusinessId || !!busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-black text-slate-950 disabled:opacity-50">
              <RefreshCw size={16} className={busy==="preview"?"animate-spin":""}/> {busy==="preview"?"Validating…":"Preview customer import"}
            </button>
          </form>
        </section>

        {error ? <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p> : null}

        {preview ? <section className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
          <h2 className="text-lg font-black">2. Review before importing</h2>
          <p className="mt-1 text-xs text-slate-400">Validation only; customer records are not created until you confirm the import.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["Rows", preview.total_rows], ["Valid", preview.valid_rows], ["Errors", preview.error_count]
            ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-900 p-3 text-center"><div className="text-xl font-black text-white">{value ?? 0}</div><div className="text-xs text-slate-400">{label}</div></div>)}
          </div>
          <p className={ready ? "mt-3 flex items-start gap-2 text-sm text-emerald-200" : "mt-3 flex items-start gap-2 text-sm text-amber-200"}>
            {ready ? <CheckCircle2 size={18} className="shrink-0"/> : <AlertTriangle size={18} className="shrink-0"/>}
            {ready ? "The file passed validation. You can confirm the import." : "This file needs corrections. No customer rows have been imported."}
          </p>
          {errors.length ? <div className="mt-3 rounded-xl border border-amber-500/20 p-3">
            <h3 className="text-xs font-black text-amber-200">Validation errors (first {errors.length})</h3>
            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto text-xs text-slate-300">
              {errors.map((item,i)=><div key={i}>Row {item.row || "?"}: {(item.errors || []).join("; ")}</div>)}
            </div>
          </div> : null}
          {samples.length ? <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-[500px] w-full text-left text-xs">
              <thead className="bg-slate-900"><tr>{["Row","Name / company","Email","Phone"].map(v=><th className="p-2" key={v}>{v}</th>)}</tr></thead>
              <tbody>{samples.map((item,i)=><tr className="border-t border-slate-800" key={i}>
                <td className="p-2">{item.row}</td>
                <td className="p-2">{item.values?.name || item.values?.company_name || "—"}</td>
                <td className="p-2">{item.values?.email || "—"}</td>
                <td className="p-2">{item.values?.phone || "—"}</td>
              </tr>)}</tbody>
            </table>
          </div> : null}

          {ready && !importComplete ? <>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs leading-5 text-slate-300">
              <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400"/>
              <span>I've checked this preview, removed example rows, and have permission to move these customer records. Email, phone, or existing customer IDs may match and update existing records. This does not invite customers or send emails.</span>
            </label>
            <button type="button" disabled={!accepted || !!busy} onClick={executeImport} className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950 disabled:opacity-50">
              {busy==="execute"?"Importing…":"Confirm and import customers"}
            </button>
          </> : null}
          {importComplete ? <div role="status" className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <div className="font-black text-emerald-200">Import finished · {preview.status.replaceAll("_"," ")}</div>
            <p className="mt-1 text-xs text-slate-300">{preview.imported_rows ?? 0} rows processed, {preview.matched_rows ?? 0} matched existing customers, {preview.skipped_rows ?? 0} skipped. If any rows failed, review the error details above or recheck import history.</p>
            <button type="button" onClick={()=>navigate("/sbo/customers")} className="mt-3 min-h-11 rounded-xl bg-cyan-400 px-4 text-xs font-black text-slate-950">Open imported customers →</button>
          </div> : null}
        </section> : null}

        <section className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 sm:p-5">
          <h2 className="text-base font-black">Previous import batches</h2>
          <p className="mt-1 text-xs text-slate-400">Business-specific history. Previewed files do not create customer records.</p>
          {historyError ? <p className="mt-2 text-xs text-amber-200">{historyError}</p> : null}
          <div className="mt-3 space-y-2">
            {history.slice(0,10).map(item => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-slate-800 p-3 text-xs">
              <span className="min-w-0 break-all text-slate-200">{item.original_filename || "CSV upload"}</span>
              <span className="font-black text-cyan-200">{item.status} · {item.imported_rows || 0} imported</span>
            </div>)}
            {!history.length ? <p className="text-xs text-slate-500">No import batches found for this business.</p> : null}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
