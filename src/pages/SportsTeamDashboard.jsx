import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { getMemberships } from "../api/social";
import SportsPlayerDashboard from "./SportsPlayerDashboard";
import SportsTeamManagerDashboard from "./SportsTeamManagerDashboard";

const MANAGEMENT_ROLES = new Set(["OWNER", "DIRECTOR", "MANAGER", "SCOREKEEPER"]);

export default function SportsTeamDashboard() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getMemberships()
      .then((rows) => { if (alive) setMemberships(Array.isArray(rows) ? rows : []); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [groupId, user?.id]);

  const membership = useMemo(
    () => memberships.find((row) =>
      Number(row.group) === Number(groupId)
      && Number(row.user) === Number(user?.id)
      && row.status === "ACTIVE"
    ),
    [memberships, groupId, user?.id],
  );

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#02060c] text-cyan-200"><Loader2 className="h-7 w-7 animate-spin" /></div>;
  }

  return MANAGEMENT_ROLES.has(membership?.role)
    ? <SportsTeamManagerDashboard initialMemberships={memberships} />
    : <SportsPlayerDashboard />;
}
