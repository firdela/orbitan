import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import OrbitanLoader from '@/components/brand/OrbitanLoader'
import PWAUpdateListener from '@/components/PWAUpdateListener'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { TenantProvider } from '@/lib/use-tenant.jsx';
import { GlobalOutletProvider } from '@/lib/GlobalOutletContext';
import { WorkspaceProvider } from '@/lib/workspace';
import { CurrencyProvider } from '@/lib/CurrencyContext';
import SystemGuard from '@/components/layout/SystemGuard';
import RoleGateway from '@/components/auth/RoleGateway';
import AuthGateway from '@/components/auth/AuthGateway';

// Page imports
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Checkout from '@/pages/Checkout';
import CheckoutSuccess from '@/pages/CheckoutSuccess';
import CheckoutCancelled from '@/pages/CheckoutCancelled';
import Landing from '@/pages/Landing';
import JoinGateway from '@/components/auth/JoinGateway';
import RequestAccessPage from '@/pages/RequestAccess';
import Onboarding from '@/pages/Onboarding';
import LeaderOrg from '@/pages/LeaderOrg';
import CompanyDashboard from '@/pages/CompanyDashboard';
import OutletDashboard from '@/pages/OutletDashboard';
import WorkerPortal from '@/pages/WorkerPortal';
import AccountSettings from '@/pages/workspace/AccountSettings';
import InventoryPage from '@/pages/outlet/InventoryPage';
import ProcurementPage from '@/pages/outlet/ProcurementPage';
import HBBPage from '@/pages/outlet/HBBPage';
import SchedulingPage from '@/pages/outlet/SchedulingPage';
import SalesPage from '@/pages/outlet/SalesPage';
import RecipesPage from '@/pages/outlet/RecipesPage';
import TasksPage from '@/pages/outlet/TasksPage';
import WorkforcePage from '@/pages/outlet/WorkforcePage';
import StaffDirectoryPage from '@/pages/outlet/StaffDirectoryPage';
import CompliancePage from '@/pages/outlet/CompliancePage';
import ReportsPage from '@/pages/outlet/ReportsPage';
import ExpensePage from '@/pages/outlet/ExpensePage';
import ShiftTradesPage from '@/pages/outlet/ShiftTradesPage';
import ClientsPage from '@/pages/outlet/ClientsPage';
import SustainabilityPage from '@/pages/outlet/SustainabilityPage';
import FacilitySettings from '@/pages/outlet/FacilitySettings';
import FeedbackCentre from '@/pages/FeedbackCentre';
import AccessRequests from '@/pages/workspace/AccessRequests';
import NotificationsPage from '@/pages/Notifications';
import AnalyticsPage from '@/pages/Analytics';

// Dynamic Workspace — scalable, tenant-agnostic routing
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout';
import WorkspaceDashboard from '@/pages/workspace/WorkspaceDashboard';

// Governance & Knowledge
import GovernanceLog from '@/pages/GovernanceLog';
import Suppliers from '@/pages/Suppliers';
import KnowledgeHub from '@/pages/KnowledgeHub';
import ArtifactRegistry from '@/pages/workspace/ArtifactRegistry';

// Enterprise — Compliance & Data
import AuditTrail from '@/pages/AuditTrail';
import UserRoles from '@/pages/UserRoles';
import DataImport from '@/pages/DataImport';
import DataExplorer from '@/pages/DataExplorer';

// Platform — Revenue Engine
import WalletPage from '@/pages/platform/WalletPage';
import MarketplacePage from '@/pages/platform/MarketplacePage';
import ShieldCommandCenter from '@/pages/platform/ShieldCommandCenter';
import IntegrationHubPage from '@/pages/platform/IntegrationHubPage';
import AuditLogPage from '@/pages/platform/AuditLogPage';
import AccessControlPage from '@/pages/platform/AccessControlPage';
import CapabilityManager from '@/pages/platform/CapabilityManager';
import TaskTestSuite from '@/pages/dev/TaskTestSuite';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <OrbitanLoader size="fullscreen" message="Loading OrbitanOS..." />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Orbitan Public Landing — Brand & Marketing Hub */}
      <Route path="/" element={<Landing />} />

      {/* Stripe Checkout — Subscription Billing */}
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/checkout/success" element={<CheckoutSuccess />} />
      <Route path="/checkout/cancelled" element={<CheckoutCancelled />} />

      {/* Auth Pages — Login, Register, Forgot Password, Reset Password */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Orbitan Auth Gateway — Intelligent Entry Hub */}
      <Route path="/auth/gateway" element={<AuthGateway />} />

      {/* Orbitan Brand Gateway — Invitation Entry */}
      <Route path="/join" element={<JoinGateway />} />
      <Route path="/welcome" element={<Navigate to="/join" replace />} />

      {/* RoleGateway resolves workspace dynamically for authenticated users */}
      <Route path="/workspace" element={<RoleGateway />} />

      {/* Dynamic Workspace — /workspace/:tenantId/* (scales to any customer) */}
      <Route path="/workspace/:tenantId" element={<WorkspaceLayout />}>
        <Route index element={<WorkspaceDashboard />} />
        <Route path="dashboard" element={<WorkspaceDashboard />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="procurement" element={<ProcurementPage />} />
        <Route path="hbb" element={<HBBPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="workforce" element={<WorkforcePage />} />
        <Route path="staff-directory" element={<StaffDirectoryPage />} />
        <Route path="scheduling" element={<SchedulingPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="feedback" element={<FeedbackCentre />} />
        <Route path="access-requests" element={<AccessRequests />} />
        <Route path="expenses" element={<ExpensePage />} />
        <Route path="shift-trades" element={<ShiftTradesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="sustainability" element={<SustainabilityPage />} />
        <Route path="facility-settings" element={<FacilitySettings />} />
        <Route path="artifacts" element={<ArtifactRegistry />} />
      </Route>

      {/* Self-Serve Business Installation Wizard — Create Organisation */}
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Governed Onboarding — Workplace Discovery & Access Request */}
      <Route path="/request-access" element={<RequestAccessPage />} />

      {/* Platform Owner Console */}
      <Route path="/leader-org" element={<LeaderOrg />} />

      {/* Tenant / Company */}
      <Route path="/company" element={<CompanyDashboard />} />

      {/* Outlet (legacy standalone dashboard — kept for direct access) */}
      <Route path="/outlet" element={<OutletDashboard />} />

      {/* Legacy route redirects — all module routes consolidated to workspace-scoped paths */}
      <Route path="/outlet/inventory" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/procurement" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/hbb" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/scheduling" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/sales" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/tasks" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/workforce" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/compliance" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/reports" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/feedback" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/expenses" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/shift-trades" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/clients" element={<Navigate to="/workspace" replace />} />
      <Route path="/outlet/sustainability" element={<Navigate to="/workspace" replace />} />
      <Route path="/expenses" element={<Navigate to="/workspace" replace />} />
      <Route path="/shift-trades" element={<Navigate to="/workspace" replace />} />
      <Route path="/clients" element={<Navigate to="/workspace" replace />} />
      <Route path="/sustainability-impact" element={<Navigate to="/workspace" replace />} />

      {/* Governance & Knowledge */}
      <Route path="/governance-log" element={<GovernanceLog />} />
      <Route path="/suppliers" element={<Suppliers />} />
      <Route path="/knowledge-hub" element={<KnowledgeHub />} />
      <Route path="/artifacts" element={<ArtifactRegistry />} />

      {/* Enterprise — Compliance & Data */}
      <Route path="/audit-trail" element={<AuditTrail />} />
      <Route path="/user-roles" element={<UserRoles />} />
      <Route path="/data-import" element={<DataImport />} />
      <Route path="/data-explorer" element={<DataExplorer />} />

      {/* Platform — Revenue Engine */}
      <Route path="/platform/wallet" element={<WalletPage />} />
      <Route path="/platform/marketplace" element={<MarketplacePage />} />
      <Route path="/platform/shield" element={<ShieldCommandCenter />} />
      <Route path="/platform/integrations" element={<IntegrationHubPage />} />
      <Route path="/platform/audit-logs" element={<AuditLogPage />} />
      <Route path="/platform/access-control" element={<AccessControlPage />} />
      <Route path="/platform/capabilities" element={<CapabilityManager />} />

      {/* Dev — Automated Test Suites */}
      <Route path="/dev/task-tests" element={<TaskTestSuite />} />

      {/* Worker Portal */}
      <Route path="/worker" element={<WorkerPortal />} />

      {/* Notifications & Analytics — Cross-outlet intelligence */}
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />

      {/* Account Settings */}
      <Route path="/settings" element={<AccountSettings />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <WorkspaceProvider>
        <TenantProvider>
        <CurrencyProvider tenantDefaultCurrency="SGD">
        <GlobalOutletProvider>
        <PWAUpdateListener />
        <Router>
            <SystemGuard>
              <AuthenticatedApp />
            </SystemGuard>
          </Router>
          </GlobalOutletProvider>
          <Toaster />
        </CurrencyProvider>
        </TenantProvider>
        </WorkspaceProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;