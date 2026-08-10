import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/client";
import PMDocumentBuilder from "./PMDocumentBuilder";
import PMPropertyPaperwork from "./PMPropertyPaperwork";

const list = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

export default function PMPropertyPaperworkDock() {
  const location = useLocation();
  const match = location.pathname.match(/^\/pm\/properties\/(\d+)\/?$/);
  const propertyId = match?.[1];
  const [workspace, setWorkspace] = useState(null);
  const [property, setProperty] = useState(null);
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!propertyId) return;
      try {
        const workspaceResponse = await api.get("/pm-hub/workspaces/current/");
        const current = workspaceResponse.data;
        const headers = { "X-PM-Workspace-ID": String(current.id) };
        const [propertyResponse, tenantResponse] = await Promise.all([
          api.get(`/pm-hub/properties/${propertyId}/`, { headers }),
          api.get("/pm-hub/tenants/", { headers }),
        ]);
        if (!active) return;
        setWorkspace(current);
        setProperty(propertyResponse.data);
        setTenants(list(tenantResponse.data).filter((tenant) => Number(tenant.property_id) === Number(propertyId) || String(tenant.property_name || "").toLowerCase() === String(propertyResponse.data.name || "").toLowerCase()));
      } catch {
        if (active) { setWorkspace(null); setProperty(null); setTenants([]); }
      }
    }
    load();
    return () => { active = false; };
  }, [propertyId]);

  if (!propertyId || !workspace || !property) return null;
  return <section className="px-4 pb-8 sm:px-6">
    <div className="mb-4 mt-3"><div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Property Paperwork Profile</div><h2 className="mt-2 text-2xl font-black text-white">Documents, forms, and readiness</h2><p className="mt-2 text-sm text-slate-400">Build documents from saved data, upload the company’s actual paperwork, and track missing lease, owner, inspection, Section 8, deposit, and reporting records.</p></div>
    <PMDocumentBuilder workspace={workspace} property={property} tenants={tenants} />
    <PMPropertyPaperwork workspace={workspace} property={property} tenants={tenants} />
  </section>;
}
