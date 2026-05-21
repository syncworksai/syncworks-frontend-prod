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
import AffiliateDashboard from "./pages/AffiliateDashboard";

import SboDashboard from "./pages/SboDashboard";
import SboGrowth from "./pages/SboGrowth";
import SboZipLeaderboard from "./pages/SboZipLeaderboard";
import SboSettings from "./pages/SboSettings";
import SboCatalog from "./pages/SboCatalog";

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

import PropertyManagerDashboard from "./pages/PropertyManagerDashboard";
import PropertyManagerCalendar from "./pages/PropertyManagerCalendar";
import PMEmployees from "./pages/PMEmployees";
import PMPropertyDetail from "./pages/PMPropertyDetail";

import EmployeeInvite from "./pages/EmployeeInvite";

import TenantDashboard from "./pages/TenantDashboard";
import TenantAcceptInvite from "./pages/TenantAcceptInvite";
import TenantSettings from "./pages/TenantSettings";

import InvestorDashboard from "./pages/InvestorDashboard";
import InvestorAcceptInvite from "./pages/InvestorAcceptInvite";
import InvestorSettings from "./pages/InvestorSettings";

import SalesOsDashboard from "./pages/SalesOsDashboard";
import SalesOsPipelineBoard from "./pages/SalesOsPipelineBoard";
import SalesOsSeatManagement from "./pages/SalesOsSeatManagement";
import SalesOsCalendar from "./pages/SalesOsCalendar";
import SalesOsAgentDashboard from "./pages/SalesOsAgentDashboard";
import SalesOsSettings from "./pages/SalesOsSettings";
import SalesOsStagesManager from "./pages/SalesOsStagesManager";
import SalesOsProspectDetail from "./pages/SalesOsProspectDetail";

import SalesOSHome from "./pages/SalesOSHome";

import Support from "./pages/Support";
import Newsfeed from "./pages/Newsfeed";
import PmSettings from "./pages/PmSettings";
import EmployeeSettings from "./pages/EmployeeSettings";

import CashFeeInvoices from "./pages/CashFeeInvoices";
import SettingsHub from "./pages/SettingsHub";

function EmployeeHome() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#020617] text-slate-100 p-6">
        <h1 className="text-xl font-semibold">Employee Dashboard</h1>
        <p className="text-slate-400 mt-2">
          Your access is based on permissions set by your manager.
        </p>

        <div className="mt-6 flex gap-3 flex-wrap">
          <a
            href="/customer"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900/40"
          >
            Go to Customer
          </a>
          <a
            href="/employee/settings"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
          >
            Employee Settings
          </a>
          <a
            href="/connect"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
          >
            Connect with Code
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
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/employee/invite" element={<EmployeeInvite />} />
        <Route path="/accept-invite" element={<EmployeeInvite />} />

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

        <Route
          path="/sbo/settings"
          element={
            <ProtectedRoute>
              <SboSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sbo/catalog"
          element={
            <ProtectedRoute>
              <SboCatalog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sbo/growth"
          element={
            <ProtectedRoute>
              <SboGrowth />
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
        <Route
          path="/tenant/settings"
          element={
            <ProtectedRoute>
              <TenantSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investor/settings"
          element={
            <ProtectedRoute>
              <InvestorSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/settings"
          element={
            <ProtectedRoute>
              <EmployeeSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/billing/cash-fee-invoices"
          element={
            <ProtectedRoute>
              <CashFeeInvoices />
            </ProtectedRoute>
          }
        />

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

        <Route
          path="/customer"
          element={
            <ProtectedRoute>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/affiliate"
          element={
            <ProtectedRoute>
              <AffiliateDashboard />
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

        <Route path="/employee" element={<EmployeeHome />} />

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

        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <InboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upgrade"
          element={
            <ProtectedRoute>
              <Upgrade />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connect"
          element={
            <ProtectedRoute>
              <Connect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team/invites"
          element={
            <ProtectedRoute>
              <TeamInvites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <TeamInvites />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}