import React, { useEffect, useMemo, useState } from "react";
import "../styles/personalMidnight.css";
import { Activity, Home, Inbox, LayoutGrid, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { getIdentityProfile } from "../api/identity";
import { getBrowserCurrentLocation } from "../api/locationContext";
import { getLiveWeather } from "../api/liveContext";
import { useAuth } from "../auth/AuthContext";
import {readPokerResume} from "../games/pokerResume.mjs";
import {readFeatureResumes} from "../utils/featureResume.mjs";
import CustomerDashboard from "./CustomerDashboard.jsx";
import MobileCustomerCommandCenter from "../components/customer/MobileCustomerCommandCenter";
import CustomerWorkspace, { useWorkspaceAppearance } from "../components/customer/CustomerWorkspace";
import SyncAssistantStickyDock from "../components/sync/SyncAssistantStickyDock";

const DAY_TRADING_EMAIL = "jacoblord7@outlook.com";
const PHONE_UA = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|IEMobile|Opera Mini/i;

function safeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function firstName(user) {
  const name = String(user?.first_name || user?.name || "").trim();
  if (name) return name.split(/\s+/)[0];
  const email = String(user?.email || "").trim();
  return email ? email.split("@")[0] : "there";
}

function readViewportMode() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "landscape";
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const height = window.innerHeight || document.documentElement.clientHeight || 0;
  const phoneUa = PHONE_UA.test(String(navigator.userAgent || ""));
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const narrow = width < 768;
  const portraitPhone = (phoneUa || coarse) && width < 900 && height >= width;
  return narrow || portraitPhone ? "portrait" : "landscape";
}

function useViewportMode() {
  const [mode, setMode] = useState(readViewportMode);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setMode(readViewportMode()));
    };
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return mode;
}

export default function CustomerDashboardResponsive() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [workspaceAppearance, updateWorkspaceAppearance] = useWorkspaceAppearance();
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [identity, setIdentity] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [liveWeather, setLiveWeather] = useState(null);
  const [weatherState, setWeatherState] = useState("loading");
  const [loading, setLoading] = useState(true);
  const viewportMode = useViewportMode();
  const phoneMode = viewportMode === "portrait";
  const dayTradingEnabled = String(user?.email || "").trim().toLowerCase() === DAY_TRADING_EMAIL;

  // Preserve one-screen command center on desktop as well. Only its three
  // dashboard rails may scroll internally; other application routes are free.
  useEffect(() => {
    if (phoneMode) return undefined;
    document.documentElement.classList.add("sw-customer-desktop-home-locked");
    document.body.classList.add("sw-customer-desktop-home-locked");
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove("sw-customer-desktop-home-locked");
      document.body.classList.remove("sw-customer-desktop-home-locked");
    };
  }, [phoneMode]);

  // Customer phone home is a fixed-height cockpit. Lock only this route's document
  // scroll; drawers/sheets keep their own scrolling and other pages are unaffected.
  useEffect(() => {
    if (!phoneMode) return undefined;
    document.documentElement.classList.add("sw-customer-home-scroll-locked");
    document.body.classList.add("sw-customer-home-scroll-locked");
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove("sw-customer-home-scroll-locked");
      document.body.classList.remove("sw-customer-home-scroll-locked");
    };
  }, [phoneMode]);


  async function load() {
    setLoading(true);
    const [ticketResult, invoiceResult, identityResult, calendarResult] = await Promise.allSettled([
      api.get("/tickets/"),
      api.get("/sync-ai/customer/invoices/"),
      getIdentityProfile(),
      api.get("/personal-calendar/events/", { params: { status: "ACTIVE" } }),
    ]);
    setTickets(ticketResult.status === "fulfilled" ? safeList(ticketResult.value?.data) : []);
    setInvoices(invoiceResult.status === "fulfilled" ? safeList(invoiceResult.value?.data) : []);
    setIdentity(identityResult.status === "fulfilled" ? identityResult.value : null);
    setCalendarEvents(calendarResult.status === "fulfilled" ? safeList(calendarResult.value?.data) : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!phoneMode) return undefined;
    let active = true;
    // Browser permission governs whether the dashboard can show location weather.
    // If denied or unavailable, show an honest fallback rather than invented values.
    getBrowserCurrentLocation({ enableHighAccuracy:false, timeout:9000, maximumAge:300000 })
      .then((position) => getLiveWeather(position))
      .then((data) => { if (active) { setLiveWeather(data || null); setWeatherState(data ? "ready" : "unavailable"); } })
      .catch(() => { if (active) { setLiveWeather(null); setWeatherState("unavailable"); } });
    return () => { active = false; };
  }, [phoneMode]);

  const openTickets = useMemo(() => tickets.filter((item) => !["COMPLETED", "CLOSED", "CANCELLED", "PAID"].includes(String(item?.status || "").toUpperCase())), [tickets]);
  const dueInvoices = useMemo(() => invoices.filter((item) => !["PAID", "VOID"].includes(String(item?.derived_state || item?.status || "").toUpperCase())), [invoices]);
  const totalDue = useMemo(() => dueInvoices.reduce((sum, item) => sum + Number(item?.balance_due ?? item?.total ?? 0), 0), [dueInvoices]);
  const profilePhotoUrl = String(identity?.identity?.profile_photo_url || "").trim();
  const todayEvents = calendarEvents.filter(item => item?.start_at && new Date(item.start_at).toDateString() === new Date().toDateString());
  const overdueCount = dueInvoices.filter(item => ["OVERDUE", "PAST_DUE"].includes(String(item?.derived_state || item?.status || "").toUpperCase())).length;
  const weatherAlerts = Array.isArray(liveWeather?.alerts) ? liveWeather.alerts : [];
  const notificationItems = [
    ...(overdueCount ? [{ id: "overdue", label: `${overdueCount} overdue payment${overdueCount === 1 ? "" : "s"}`, route: "/customer/finance" }] : []),
    ...(dueInvoices.length > overdueCount ? [{ id: "payments", label: `${dueInvoices.length - overdueCount} payment${dueInvoices.length - overdueCount === 1 ? "" : "s"} to review`, route: "/customer/finance" }] : []),
    ...weatherAlerts.slice(0, 1).map((item) => ({ id: "weather-alert", label: String(item?.event || item?.headline || "Weather advisory"), route: "/customer/weather" })),
  ];
  const mobileBrief = [todayEvents.length ? `${todayEvents.length} event${todayEvents.length === 1 ? "" : "s"} scheduled today.` : "Your calendar is clear today.", overdueCount ? `${overdueCount} overdue payment${overdueCount === 1 ? "" : "s"} need attention.` : dueInvoices.length ? `${dueInvoices.length} payment item${dueInvoices.length === 1 ? "" : "s"} to review.` : "No urgent payment alerts.", openTickets.length ? `${openTickets.length} active service request${openTickets.length === 1 ? "" : "s"}.` : ""].filter(Boolean).join(" ");

  if (!phoneMode) {
    return (
      <div className="sw-workspace-root sw-desktop-customer-cockpit" data-workspace-theme={workspaceAppearance.theme} data-workspace-motion={workspaceAppearance.motion} data-workspace-compact={workspaceAppearance.compact} data-sw-layout="landscape" data-sw-visual="midnight">
        <CustomerWorkspace settings={workspaceAppearance} update={updateWorkspaceAppearance} dayTradingEnabled={dayTradingEnabled} />
        <CustomerDashboard workspaceTheme={workspaceAppearance.theme} />
        {workspaceAppearance.theme === "legacy" ? <SyncAssistantStickyDock displayName={firstName(user)} defaultMinimized /> : null}
      </div>
    );
  }

  return (
    <div className="sw-workspace-root sw-customer-mobile-viewport px-3 text-slate-100" data-workspace-theme={workspaceAppearance.theme} data-workspace-motion={workspaceAppearance.motion} data-workspace-compact={workspaceAppearance.compact} data-sw-layout="portrait" data-sw-visual="midnight">
      <CustomerWorkspace settings={workspaceAppearance} update={updateWorkspaceAppearance} phoneMode dayTradingEnabled={dayTradingEnabled} />
      <MobileCustomerCommandCenter
        name={firstName(user)}
        theme={workspaceAppearance.theme}
        brief={mobileBrief}
        attentionCount={overdueCount}
        todayEvents={todayEvents.length}
        calendarEvents={calendarEvents}
        openTickets={openTickets.length}
        weatherValue="Weather"
        weather={liveWeather}
        weatherState={weatherState}
        notifications={notificationItems}
        workout={null}
        minimums={totalDue.toLocaleString("en-US", { style: "currency", currency: "USD" })}
        businessConnected={false}
        pmConnected={false}
        tenantConnected={false}
        onNavigate={nav}
        onOpenWorkspace={area => window.dispatchEvent(new CustomEvent("sw:workspace-open", { detail: area }))}
      />

      {/* App-level RoleAwareMobileNav owns the single bottom bar and its SYNC action.
           Do not render a second sticky nav here. */}
    </div>
  );
}
