// src/App.jsx
import React from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import PlatformRoute from "./components/PlatformRoute";

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
import BusinessInternalTicketCreator from "./pages/BusinessInternalTicketCreator";

import SboCustomers from "./pages/sbo/SboCustomers";
import SboLeads from "./pages/sbo/SboLeads";
import SboReports from "./pages/sbo/SboReports";
import SboFinance from "./pages/sbo/SboFinance";
import SboPartners from "./pages/sbo/SboPartners";

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
import EmployeeTechnicianDashboard from "./pages/EmployeeTechnicianDashboard";

import TenantDashboard from "./pages/TenantDashboard";
import TenantAcceptInvite from "./pages/TenantAcceptInvite";
import TenantSettings from "./pages/TenantSettings";

import InvestorDashboard from "./pages/InvestorDashboard";
import InvestorAcceptInvite from "./pages/InvestorAcceptInvite";
import InvestorSettings from "./pages/InvestorSettings";

import Support from "./pages/Support";
import Newsfeed from "./pages/Newsfeed";
import PmSettings from "./pages/PmSettings";
import EmployeeSettings from "./pages/EmployeeSettings";

import CashFeeInvoices from "./pages/CashFeeInvoices";
import SettingsHub from "./pages/SettingsHub";
import LearningCenter from "./pages/LearningCenter";

export default function App() {
  return (
    <div className="sw-autoglow">
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/employee/invite"
          element={<EmployeeInvite />}
        />

        <Route
          path="/accept-invite"
          element={<EmployeeInvite />}
        />

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
          path="/learn"
          element={
            <ProtectedRoute>
              <LearningCenter />
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
          path="/sbo/new-ticket"
          element={
            <ProtectedRoute>
              <BusinessInternalTicketCreator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sbo/customers"
          element={
            <ProtectedRoute>
              <SboCustomers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sbo/leads"
          element={
            <ProtectedRoute>
              <SboLeads />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sbo/reports"
          element={
            <ProtectedRoute>
              <SboReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sbo/finance"
          element={
            <ProtectedRoute>
              <SboFinance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sbo/partners"
          element={
            <ProtectedRoute>
              <SboPartners />
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

        <Route
          path="/sales/*"
          element={
            <Navigate
              to="/customer"
              replace
            />
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
          path="/customer/inbox"
          element={
            <ProtectedRoute>
              <InboxPage />
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
          path="/sbo/inbox"
          element={
            <ProtectedRoute>
              <InboxPage />
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

        <Route
          path="/dashboard"
          element={
            <Navigate
              to="/sbo"
              replace
            />
          }
        />

        <Route
          path="/employee/inbox"
          element={
            <ProtectedRoute>
              <InboxPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee"
          element={
            <ProtectedRoute>
              <EmployeeTechnicianDashboard />
            </ProtectedRoute>
          }
        />

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
              <Navigate
                to="/customer/new-request"
                replace
              />
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

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />
      </Routes>
    </div>
  );
}