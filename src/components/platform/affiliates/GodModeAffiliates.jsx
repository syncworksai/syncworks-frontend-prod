import React, { useEffect, useState } from "react";
import AffiliateAssignBusinessCard from "../../components/platform/affiliates/AffiliateAssignBusinessCard";
import AffiliateCreateCard from "../../components/platform/affiliates/AffiliateCreateCard";
import AffiliateDetailDrawer from "../../components/platform/affiliates/AffiliateDetailDrawer";
import AffiliateOpsOverviewCards from "../../components/platform/affiliates/AffiliateOpsOverviewCards";
import AffiliateTable from "../../components/platform/affiliates/AffiliateTable";
import {
  assignBusinessToAffiliate,
  createGodModeAffiliate,
  getGodModeAffiliateDetail,
  getGodModeAffiliateOverview,
  getGodModeAffiliates,
  getGodModePayoutBatches,
  updateGodModeAffiliate,
} from "../../api/platformAffiliates";

function safeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export default function GodModeAffiliates() {
  const [overview, setOverview] = useState({});
  const [affiliates, setAffiliates] = useState([]);
  const [payoutBatches, setPayoutBatches] = useState([]);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const [o, a, p] = await Promise.all([
        getGodModeAffiliateOverview(),
        getGodModeAffiliates(),
        getGodModePayoutBatches(),
      ]);

      setOverview(o || {});
      setAffiliates(safeList(a));
      setPayoutBatches(safeList(p));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateAffiliate(payload) {
    setErr("");
    try {
      await createGodModeAffiliate(payload);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Create failed");
    }
  }

  async function handleAssignBusiness(payload) {
    setErr("");
    try {
      await assignBusinessToAffiliate({
        business_id: Number(payload.business_id),
        affiliate_id: Number(payload.affiliate_id),
        reason: payload.reason,
        retroactive: !!payload.retroactive,
      });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.business_id || e?.response?.data?.detail || e?.message || "Assignment failed");
    }
  }

  async function setStatus(affiliate, status) {
    setErr("");
    try {
      await updateGodModeAffiliate(affiliate.id, { status });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Status update failed");
    }
  }

  async function openAffiliate(affiliate) {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setSelectedAffiliate(affiliate);

    try {
      const detail = await getGodModeAffiliateDetail(affiliate.id);
      setSelectedAffiliate(detail);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load affiliate detail");
    } finally {
      setDrawerLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {err ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200 text-sm">
          {String(err)}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-950/35 p-5 text-slate-400">
          Loading affiliate operations...
        </div>
      ) : null}

      <AffiliateOpsOverviewCards
        overview={overview}
        affiliates={affiliates}
        payoutBatches={payoutBatches}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <AffiliateCreateCard onSubmit={handleCreateAffiliate} />
        <AffiliateAssignBusinessCard affiliates={affiliates} onSubmit={handleAssignBusiness} />
      </div>

      <AffiliateTable
        affiliates={affiliates}
        onOpen={openAffiliate}
        onApprove={(a) => setStatus(a, "ACTIVE")}
        onSuspend={(a) => setStatus(a, "SUSPENDED")}
      />

      <AffiliateDetailDrawer
        open={drawerOpen}
        affiliate={selectedAffiliate}
        loading={drawerLoading}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedAffiliate(null);
        }}
      />
    </div>
  );
}