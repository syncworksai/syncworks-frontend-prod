import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  Home,
  LayoutGrid,
  MapPinned,
  MessageSquareText,
  Settings,
  Users,
  Wrench,
} from "lucide-react";

import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import "./RoleAwareMobileNav.css";

const STORAGE_PREFIX = "sw_mobile_nav_v1";

const ITEM_LIBRARY = {
  home: { label: "Home", icon: Home, routes: { CUSTOMER: "/customer", SBO: "/sbo", EMPLOYEE: "/employee", PM: "/pm" } },
  requests: { label: "Requests", icon: ClipboardList, routes: { CUSTOMER: "/customer/tickets", SBO: "/tickets", EMPLOYEE: "/tickets", PM: "/tickets" } },
  schedule: { label: "Schedule", icon: CalendarDays, routes: { CUSTOMER: "/customer?tab=calendar", SBO: "/calendar", EMPLOYEE: "/calendar", PM: "/pm/calendar" } },
  inbox: { label: "Messages", icon: MessageSquareText, routes: { CUSTOMER: "/customer/inbox", SBO: "/sbo/inbox", EMPLOYEE: "/employee/inbox", PM: "/inbox" } },
  customers: { label: "Customers", icon: Users, routes: { SBO: "/sbo/customers", EMPLOYEE: "/tickets", PM: "/pm" } },
  marketplace: { label: "Marketplace", icon: LayoutGrid, routes: { CUSTOMER: "/customer", SBO: "/tickets", EMPLOYEE: "/tickets", PM: "/tickets" } },
  map: { label: "Map", icon: MapPinned, routes: { CUSTOMER: "/customer?tab=calendar", SBO: "/calendar", EMPLOYEE: "/calendar", PM: "/pm/calendar" } },
  tools: { label: "Tools", icon: Wrench, routes: { CUSTOMER: "/settings", SBO: "/sbo/settings", EMPLOYEE: "/employee/settings", PM: "/pm/settings" } },
  more: { label: "More", icon: Settings, routes: { CUSTOMER: "/settings", SBO: "/sbo/settings", EMPLOYEE: "/employee/settings", PM: "/pm/settings" } },
};

const DEFAULTS = {
  CUSTOMER: ["home", "requests", "schedule", "more"],
  SBO: ["home", "requests", "inbox", "more"],
  EMPLOYEE: ["home", "schedule", "inbox", "requests"],
  PM: ["home", "schedule", "inbox", "more"],
};

const ALLOWED = {
  CUSTOMER: ["home", "requests", "schedule", "inbox", "marketplace", "map", "tools", "more"],
  SBO: ["home", "requests", "schedule", "inbox", "customers", "marketplace", "map", "tools", "more"],
  EMPLOYEE: ["home", "requests", "schedule", "inbox", "customers", "map", "tools", "more"],
  PM: ["home", "requests", "schedule", "inbox", "customers", "map", "tools", "more"],
};

function storageKey(mode, user) {
  const identity = user?.id || user?.pk || user?.email || "anon";
  return `${STORAGE_PREFIX}:${identity}:${mode}`;
}

function readPreference(mode, user) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(mode, user)) || "null");
    if (!Array.isArray(parsed) || parsed.length !== 4) return DEFAULTS[mode];
    const allowed = new Set(ALLOWED[mode] || []);
    const unique = [...new Set(parsed.filter((item) => allowed.has(item)))];
    return unique.length === 4 ? unique : DEFAULTS[mode];
  } catch {
    return DEFAULTS[mode];
  }
}

function writePreference(mode, user, items) {
  try {
    localStorage.setItem(storageKey(mode, user), JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("sw:mobileNavChanged", { detail: { mode } }));
  } catch {
    // no-op
  }
}

function routeFor(itemId, mode) {
  return ITEM_LIBRARY[itemId]?.routes?.[mode] || "/";
}

function routeMatches(pathname, target) {
  const cleanTarget = String(target || "").split("?")[0];
  if (["/customer", "/sbo", "/employee", "/pm"].includes(cleanTarget)) {
    return pathname === cleanTarget;
  }
  return pathname.startsWith(cleanTarget);
}

function navModeFromPath(pathname, fallbackMode) {
  if (pathname.startsWith("/customer")) return "CUSTOMER";
  if (pathname.startsWith("/sbo")) return "SBO";
  if (pathname.startsWith("/employee")) return "EMPLOYEE";
  if (pathname.startsWith("/pm")) return "PM";
  return ["CUSTOMER", "SBO", "EMPLOYEE", "PM"].includes(fallbackMode) ? fallbackMode : "";
}

function centerConfig(mode) {
  if (mode === "CUSTOMER") return { label: "Request", route: "/customer/new-request" };
  if (mode === "SBO") return { label: "Ticket", route: "/sbo/new-ticket" };
  if (mode === "EMPLOYEE") return { label: "Ticket", route: "/tickets" };
  if (mode === "PM") return { label: "Request", route: "/tickets" };
  return null;
}

function PreviewItem({ itemId }) {
  const item = ITEM_LIBRARY[itemId];
  const Icon = item?.icon || Home;
  return (
    <div className="sw-nav-settings-preview-item">
      <Icon aria-hidden="true" />
      <span>{item?.label || itemId}</span>
    </div>
  );
}

export function MobileNavSettings() {
  const { user, mode } = useAuth();
  const [scope, setScope] = useState(
    ["CUSTOMER", "SBO", "EMPLOYEE", "PM"].includes(mode) ? mode : "CUSTOMER"
  );
  const [items, setItems] = useState(() => readPreference(scope, user));
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setItems(readPreference(scope, user));
  }, [scope, user]);

  function changeSlot(index, nextValue) {
    setSaved("");
    setItems((current) => {
      if (current.includes(nextValue)) return current;
      return current.map((item, itemIndex) => (itemIndex === index ? nextValue : item));
    });
  }

  function save() {
    writePreference(scope, user, items);
    setSaved("Navigation saved.");
  }

  function reset() {
    const defaults = [...DEFAULTS[scope]];
    setItems(defaults);
    writePreference(scope, user, defaults);
    setSaved("Reset to role defaults.");
  }

  return (
    <section className="sw-nav-settings-card">
      <div className="sw-nav-settings-head">
        <span>Mobile quick access</span>
        <h3>Customize your sticky buttons</h3>
        <p>The glowing center action stays fixed. Choose the four surrounding shortcuts.</p>
      </div>

      <div className="sw-nav-settings-scopes">
        {["CUSTOMER", "SBO", "EMPLOYEE", "PM"].map((item) => (
          <button key={item} type="button" className={scope === item ? "active" : ""} onClick={() => setScope(item)}>
            {item === "CUSTOMER" ? "Personal" : item === "SBO" ? "Business" : item === "PM" ? "Property" : "Employee"}
          </button>
        ))}
      </div>

      <div className="sw-nav-settings-preview">
        {items.slice(0, 2).map((itemId) => <PreviewItem key={`left-${itemId}`} itemId={itemId} />)}
        <div className="sw-nav-settings-center-preview">
          <img src="/brand/syncworks-start-logo.png" alt="" />
          <span>{centerConfig(scope)?.label || "Action"}</span>
        </div>
        {items.slice(2, 4).map((itemId) => <PreviewItem key={`right-${itemId}`} itemId={itemId} />)}
      </div>

      <div className="sw-nav-settings-grid">
        {items.map((itemId, index) => (
          <label key={`${scope}-${index}`}>
            <span>Button {index + 1}</span>
            <select value={itemId} onChange={(event) => changeSlot(index, event.target.value)}>
              {(ALLOWED[scope] || []).map((optionId) => (
                <option key={optionId} value={optionId}>
                  {ITEM_LIBRARY[optionId]?.label || optionId}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {saved ? <div className="sw-nav-settings-saved">{saved}</div> : null}

      <div className="sw-nav-settings-actions">
        <button type="button" onClick={reset}>Reset defaults</button>
        <button type="button" className="primary" onClick={save}>Save navigation</button>
      </div>
    </section>
  );
}

export default function RoleAwareMobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, mode } = useAuth();
  const pathname = String(location.pathname || "").toLowerCase();
  const navMode = navModeFromPath(pathname, mode);
  const [items, setItems] = useState(() => (navMode ? readPreference(navMode, user) : []));
  const [unread, setUnread] = useState(0);

  const hidden = useMemo(() => {
    if (!navMode) return true;
    return [
      "/login",
      "/register",
      "/upgrade",
      "/connect",
      "/sync/voice",
      "/customer/health",
      "/health",
    ].some((prefix) => pathname.startsWith(prefix));
  }, [navMode, pathname]);

  useEffect(() => {
    if (!navMode) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      setItems(readPreference(navMode, user));
    });

    function handleChanged(event) {
      if (event?.detail?.mode === navMode) {
        setItems(readPreference(navMode, user));
      }
    }

    window.addEventListener("sw:mobileNavChanged", handleChanged);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("sw:mobileNavChanged", handleChanged);
    };
  }, [navMode, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadUnread() {
      if (!navMode || hidden) return;
      const scope = ["SBO", "EMPLOYEE"].includes(navMode) ? "BUSINESS" : "PERSONAL";
      try {
        const response = await api.get(`/ticket-conversations/?scope=${scope}&archived=false`);
        if (!cancelled) setUnread(Number(response?.data?.unread_total || 0));
      } catch {
        if (!cancelled) setUnread(0);
      }
    }

    loadUnread();
    const timer = window.setInterval(loadUnread, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hidden, navMode, pathname]);

  if (hidden) return null;

  const center = centerConfig(navMode);
  const renderedItems = items.map((itemId) => {
    const item = ITEM_LIBRARY[itemId];
    const target = routeFor(itemId, navMode);
    return {
      id: itemId,
      label: item?.label || itemId,
      Icon: item?.icon || Home,
      target,
      active: routeMatches(pathname, target),
      badge: itemId === "inbox" ? unread : 0,
    };
  });

  return (
    <nav className="sw-role-mobile-nav lg:hidden" aria-label="Mobile quick navigation">
      <div className="sw-role-mobile-nav-grid">
        {renderedItems.slice(0, 2).map((item) => (
          <NavButton key={item.id} item={item} onClick={() => navigate(item.target)} />
        ))}

        <button type="button" className="sw-role-mobile-nav-center" onClick={() => navigate(center.route)} aria-label={`New ${center.label}`}>
          <span className="sw-role-mobile-nav-center-orb">
            <img src="/brand/syncworks-start-logo.png" alt="" />
          </span>
          <span>{center.label}</span>
        </button>

        {renderedItems.slice(2, 4).map((item) => (
          <NavButton key={item.id} item={item} onClick={() => navigate(item.target)} />
        ))}
      </div>
    </nav>
  );
}

function NavButton({ item, onClick }) {
  const Icon = item.Icon;
  return (
    <button type="button" onClick={onClick} className={item.active ? "active" : ""} aria-current={item.active ? "page" : undefined}>
      <span className="icon">
        <Icon aria-hidden="true" />
        {item.badge > 0 ? <i>{item.badge > 99 ? "99+" : item.badge}</i> : null}
      </span>
      <span>{item.label}</span>
    </button>
  );
}
