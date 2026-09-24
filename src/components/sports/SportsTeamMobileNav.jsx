import React from "react";
import { ArrowLeft, BarChart3, BookOpen, CalendarDays, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const cx = (...values) => values.filter(Boolean).join(" ");

export default function SportsTeamMobileNav({
  groupId,
  gameId = null,
  nextGameId = null,
  activeTab = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const base = `/connect/groups/${groupId}/sports`;
  const bookId = gameId || nextGameId;

  function goTab(tab) {
    navigate(`${base}?tab=${encodeURIComponent(tab)}`);
  }

  const items = [
    {
      id: "back",
      label: "Back",
      Icon: ArrowLeft,
      onClick: () => navigate(location.pathname.includes("/games/") ? base : activeTab && activeTab !== "Overview" ? `${base}?tab=Overview` : `/connect/groups/${groupId}`),
      active: false,
    },
    {
      id: "schedule",
      label: "Schedule",
      Icon: CalendarDays,
      onClick: () => goTab("Schedule"),
      active: activeTab === "Schedule",
    },
    {
      id: "book",
      label: "Game Book",
      Icon: BookOpen,
      onClick: () => bookId ? navigate(`${base}/games/${bookId}`) : goTab("Schedule"),
      active: Boolean(gameId),
      center: true,
    },
    {
      id: "stats",
      label: "Stats",
      Icon: BarChart3,
      onClick: () => goTab("Stats"),
      active: activeTab === "Stats",
    },
    {
      id: "roster",
      label: "Roster",
      Icon: Users,
      onClick: () => goTab("Roster"),
      active: activeTab === "Roster",
    },
  ];

  return (
    <nav
      aria-label="Team quick navigation"
      className="fixed inset-x-0 bottom-0 z-[110] border-t border-cyan-300/15 bg-[#030914]/96 px-1.5 pb-[calc(.4rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-12px_36px_rgba(0,0,0,.38)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-5 items-end gap-1">
        {items.map(({ id, label, Icon, onClick, active, center }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative flex min-h-[3.45rem] min-w-0 flex-col items-center justify-center rounded-xl px-1 text-[8px] font-black transition active:scale-[.97]",
              center
                ? "-mt-3 border border-cyan-200/35 bg-gradient-to-br from-cyan-300 via-blue-400 to-violet-500 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.24)]"
                : active
                  ? "border border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                  : "border border-transparent text-slate-400",
            )}
          >
            <Icon className={cx("mb-1", center ? "h-5 w-5" : "h-4 w-4")} aria-hidden="true" />
            <span className="max-w-full truncate">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
