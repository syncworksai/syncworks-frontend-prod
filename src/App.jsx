import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PlatformRoute from "./components/PlatformRoute";
import SalesModeGate from "./components/SalesModeGate";

import Login from "./pages/Login";
import Register from "./pages/Register";

import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerNewRequest from "./pages/CustomerNewRequest";
import CustomerSettings from "./pages/CustomerSettings";
import CustomerFinance from "./pages/CustomerFinance";
import CustomerHealth from "./pages/CustomerHealth";
import CustomerTickets from "./pages/CustomerTickets";
import CustomerFavorites from "./pages/CustomerFavorites";
import CustomerBusinessCards from "./pages/CustomerBusinessCards";
import CustomerBusinessCardDetail from "./pages/CustomerBusinessCardDetail";

import SboDashboard from "./pages/SboDashboard";
import SboZipLeaderboard from "./pages/SboZipLeaderboard";

import PlatformDashboard from "./pages/PlatformDashboard";
import PlatformSupportRequests from "./pages/platform/PlatformSupportRequests";

import TeamInvites from "./pages/TeamInvites";
import Upgrade from "./pages/Upgrade";
import Connect from "./pages/Connect";
import UserProfile from "./pages/UserProfile";

import TicketsBoard from "./pages/TicketsBoard";
import TicketDetail from "./pages/TicketDetail";
import CalendarPage from "./pages/CalendarPage";
import InboxPage from "./pages/InboxPage";

// ✅ Property Manager
import PropertyManagerDashboard from "./pages/PropertyManagerDashboard";
import PropertyManagerCalendar from "./pages/PropertyManagerCalendar";
import PMEmployees from "./pages/PMEmployees";
import PMPropertyDetail from "./pages/PMPropertyDetail";

// ✅ Employee
import EmployeeInvite from "./pages/EmployeeInvite";

// ✅ Tenant
import TenantDashboard from "./pages/TenantDashboard";
import TenantAcceptInvite from "./pages/TenantAcceptInvite";

// ✅ Investor
import InvestorDashboard from "./pages/InvestorDashboard";
import InvestorAcceptInvite from "./pages/InvestorAcceptInvite";

// ✅ SALES OS
import SalesOsDashboard from "./pages/SalesOsDashboard";
import SalesOsPipelineBoard from "./pages/SalesOsPipelineBoard";
import SalesOsSeatManagement from "./pages/SalesOsSeatManagement";
import SalesOsCalendar from "./pages/SalesOsCalendar";
import SalesOsAgentDashboard from "./pages/SalesOsAgentDashboard";
import SalesOsSettings from "./pages/SalesOsSettings";
import SalesOsStagesManager from "./pages/SalesOsStagesManager";
import SalesOsProspectDetail from "./pages/SalesOsProspectDetail";

// Optional legacy home
import SalesOSHome from "./pages/SalesOSHome";

// ✅ Support + Newsfeed + PM Settings
import Support from "./pages/Support";
import Newsfeed from "./pages/Newsfeed";
import PmSettings from "./pages/PmSettings";

// ✅ NEW: Cash Fee Invoices (read-only while locked)
import CashFeeInvoices from "./pages/CashFeeInvoices";

// ✅ Unified Settings Hub
import SettingsHub from "./pages/SettingsHub";

function EmployeeHome() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#020617] text-slate-100 p-6">
        <h1 className="text-xl font-semibold">Employee Dashboard</h1>
        <p className="text-slate-400 mt-2">
          Your access is based on permissions set by your Property Manager.
        </p>

        <div className="mt-6 flex gap-3 flex-wrap">
          <a
            href="/customer"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
          >
            Go to Customer (optional)
          </a>
          <a
            href="/connect"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
          >
            Connect with Code
          </a>
          <a
            href="/upgrade"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/15"
          >
            Upgrade Hub
          </a>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function SalesWrap({ children }) {
  return (
    <ProtectedRoute>
      <SalesModeGate>{children}</SalesModeGate>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <div className="sw-autoglow">
      <Routes>
        {/* ✅ Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ✅ Invite entry */}
        <Route path="/employee/invite" element={<EmployeeInvite />} />

        {/* ✅ Platform Console */}
        <Route
          path="/platform"
          element={
            <PlatformRoute>
              <PlatformDashboard />
            </PlatformRoute>
          }
        />
        <Route
          path="/platform/support"
          element={
            <PlatformRoute>
              <PlatformSupportRequests />
            </PlatformRoute>
          }
        />

        {/* ✅ Global authed pages */}
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <Support />
            </ProtectedRoute>
          }
        />
        <Route
          path="/newsfeed"
          element={
            <ProtectedRoute>
              <Newsfeed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsHub />
            </ProtectedRoute>
          }
        />

        {/* ✅ Back-compat settings routes */}
        <Route
          path="/sbo/settings"
          element={
            <ProtectedRoute>
              <SettingsHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pm/settings"
          element={
            <ProtectedRoute>
              <PmSettings />
            </ProtectedRoute>
          }
        />

        {/* ✅ Billing */}
        <Route
          path="/billing/cash-fee-invoices"
          element={
            <ProtectedRoute>
              <CashFeeInvoices />
            </ProtectedRoute>
          }
        />

        {/* ✅ SALES OS */}
        <Route path="/sales" element={<Navigate to="/sales/dashboard" replace />} />

        <Route
          path="/sales/dashboard"
          element={
            <SalesWrap>
              <SalesOsDashboard />
            </SalesWrap>
          }
        />
        <Route
          path="/sales/board"
          element={
            <SalesWrap>
              <SalesOsPipelineBoard />
            </SalesWrap>
          }
        />
        <Route
          path="/sales/seats"
          element={
            <SalesWrap>
              <SalesOsSeatManagement />
            </SalesWrap>
          }
        />
        <Route
          path="/sales/calendar"
          element={
            <SalesWrap>
              <SalesOsCalendar />
            </SalesWrap>
          }
        />
        <Route
          path="/sales/agent"
          element={
            <SalesWrap>
              <SalesOsAgentDashboard />
            </SalesWrap>
          }
        />
        <Route
          path="/sales/settings"
          element={
            <SalesWrap>
              <SalesOsSettings />
            </SalesWrap>
          }
        />
        <Route
          path="/sales/stages"
          element={
            <SalesWrap>
              <SalesOsStagesManager />
            </SalesWrap>
          }
        />
        <Route
          path="/sales/prospects/:id"
          element={
            <SalesWrap>
              <SalesOsProspectDetail />
            </SalesWrap>
          }
        />
        <Route
          path="/sales/home"
          element={
            <SalesWrap>
              <SalesOSHome />
            </SalesWrap>
          }
        />

        {/* ✅ CUSTOMER */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/favorites"
          element={
            <ProtectedRoute>
              <CustomerFavorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/business-cards"
          element={
            <ProtectedRoute>
              <CustomerBusinessCards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/business-cards/:favoriteId"
          element={
            <ProtectedRoute>
              <CustomerBusinessCardDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/new-request"
          element={
            <ProtectedRoute>
              <CustomerNewRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/tickets"
          element={
            <ProtectedRoute>
              <CustomerTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/settings"
          element={
            <ProtectedRoute>
              <CustomerSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/finance"
          element={
            <ProtectedRoute>
              <CustomerFinance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/health"
          element={
            <ProtectedRoute>
              <CustomerHealth />
            </ProtectedRoute>
          }
        />

        {/* ✅ SBO */}
        <Route
          path="/sbo"
          element={
            <ProtectedRoute>
              <SboDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sbo/metrics/zip"
          element={
            <ProtectedRoute>
              <SboZipLeaderboard />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/sbo" replace />} />

        {/* ✅ Employee */}
        <Route path="/employee" element={<EmployeeHome />} />

        {/* ✅ PM */}
        <Route
          path="/pm"
          element={
            <ProtectedRoute>
              <PropertyManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pm/calendar"
          element={
            <ProtectedRoute>
              <PropertyManagerCalendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pm/employees"
          element={
            <ProtectedRoute>
              <PMEmployees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pm/properties/:propertyId"
          element={
            <ProtectedRoute>
              <PMPropertyDetail />
            </ProtectedRoute>
          }
        />

        {/* ✅ Tenant */}
        <Route
          path="/tenant"
          element={
            <ProtectedRoute>
              <TenantDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tenant/accept"
          element={
            <ProtectedRoute>
              <TenantAcceptInvite />
            </ProtectedRoute>
          }
        />

        {/* ✅ Investor */}
        <Route
          path="/investor"
          element={
            <ProtectedRoute>
              <InvestorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investor/accept"
          element={
            <ProtectedRoute>
              <InvestorAcceptInvite />
            </ProtectedRoute>
          }
        />

        {/* ✅ Tickets */}
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <TicketsBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/new"
          element={
            <ProtectedRoute>
              <Navigate to="/customer/new-request" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <TicketDetail />
            </ProtectedRoute>
          }
        />

        {/* ✅ Calendar */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />

        {/* ✅ Inbox */}
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <InboxPage />
            </ProtectedRoute>
          }
        />

        {/* ✅ Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />

        {/* ✅ Upgrade */}
        <Route
          path="/upgrade"
          element={
            <ProtectedRoute>
              <Upgrade />
            </ProtectedRoute>
          }
        />

        {/* ✅ Connect */}
        <Route
          path="/connect"
          element={
            <ProtectedRoute>
              <Connect />
            </ProtectedRoute>
          }
        />

        {/* ✅ Team */}
        <Route
          path="/team/invites"
          element={
            <ProtectedRoute>
              <TeamInvites />
            </ProtectedRoute>
          }
        />

        {/* ✅ Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
