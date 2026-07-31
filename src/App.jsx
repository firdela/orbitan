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


// Dynamic Workspace — scalable, tenant-agnostic routing
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout';
import WorkspaceDashboard from '@/pages/workspace/WorkspaceDashboard';

// Governance & Knowledge
import GovernanceLog from '@/pages/GovernanceLog';
import Suppliers from '@/pages/Suppliers';
import KnowledgeHub from '@/pages/KnowledgeHub';
import ArtifactRegistry from '@/pages/workspace/ArtifactRegistry';

// Enterprise — Compliance & Data
import AuditCentre from '@/pages/AuditCentre';
import UserRoles from '@/pages/UserRoles';
import DataImport from '@/pages/DataImport';
import DataExplorer from '@/pages/DataExplorer';

// Platform — Revenue Engine
import WalletPage from '@/pages/platform/WalletPage';
import MarketplacePage from '@/pages/platform/MarketplacePage';
import ShieldCommandCenter from '@/pages/platform/ShieldCommandCenter';
import IntegrationHubPage from '@/pages/platform/IntegrationHubPage';

import AccessControlPage from '@/pages/platform/AccessControlPage';
import CapabilityManager from '@/pages/platform/CapabilityManager';
import TaskTestSuite from '@/pages/dev/TaskTestSuite';
import AccessEngineValidation from '@/pages/dev/AccessEngineValidation';
import TimesheetManager from '@/pages/workforce/TimesheetManager';
import ProductionPage from '@/pages/outlet/ProductionPage';
import FinanceIntegrationPage from '@/pages/workspace/FinanceIntegrationPage';
import NexusIntelligencePage from '@/pages/workspace/NexusIntelligencePage';
import PilotReadinessDashboard from '@/pages/platform/PilotReadinessDashboard';
import SupportDiagnostics from '@/pages/platform/SupportDiagnostics';
import PilotAdminPage from '@/pages/platform/PilotAdminPage';
import OperationalHealthDashboard from '@/pages/platform/OperationalHealthDashboard';
import ExceptionCentrePage from '@/pages/platform/ExceptionCentrePage';
import PilotActivationPage from '@/pages/platform/PilotActivationPage';
import DataMigrationPage from '@/pages/workspace/DataMigrationPage';
import CustomerSuccessPage from '@/pages/platform/CustomerSuccessPage';
import GoLiveReadinessCentre from '@/pages/platform/GoLiveReadinessCentre';
import PilotDeploymentCentre from '@/pages/platform/PilotDeploymentCentre';

// Foundation — Public & Admin Pages
import AboutOrbitan from '@/pages/foundation/AboutOrbitan';
import LegalCentre from '@/pages/foundation/LegalCentre';
import SupportPortal from '@/pages/foundation/SupportPortal';
import PlatformStatus from '@/pages/foundation/PlatformStatus';
import GovernanceOverview from '@/pages/foundation/GovernanceOverview';
import SystemLogs from '@/pages/foundation/SystemLogs';
import DeploymentPipeline from '@/pages/foundation/DeploymentPipeline';
import TenantMetrics from '@/pages/foundation/TenantMetrics';
import SecurityDashboard from '@/pages/foundation/SecurityDashboard';
import FeatureFlagManager from '@/pages/foundation/FeatureFlagManager';
import ChangeLog from '@/pages/foundation/ChangeLog';
import RoadmapPage from '@/pages/foundation/RoadmapPage';

// Workspace — Canonical Route Pages (Build #27D)
import DataExportPage from '@/pages/workspace/DataExportPage';
import SystemActivityPage from '@/pages/workspace/SystemActivityPage';
import SubscriptionPage from '@/pages/workspace/SubscriptionPage';

// Legacy route redirects — all consolidated module routes redirect to the
// dynamic workspace resolver. Data-driven to keep App.jsx maintainable.
const LEGACY_REDIRECTS = [
  '/outlet/inventory', '/outlet/procurement', '/outlet/hbb', '/outlet/scheduling',
  '/outlet/sales', '/outlet/tasks', '/outlet/workforce', '/outlet/compliance',
  '/outlet/reports', '/outlet/feedback', '/outlet/expenses', '/outlet/shift-trades',
  '/outlet/clients', '/outlet/sustainability',
  '/expenses', '/shift-trades', '/clients', '/sustainability-impact',
];

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

      {/* Foundation — Public Pages */}
      <Route path="/about-orbitan" element={<AboutOrbitan />} />
      <Route path="/legal" element={<LegalCentre />} />
      <Route path="/support" element={<SupportPortal />} />
      <Route path="/status" element={<PlatformStatus />} />
      <Route path="/governance" element={<GovernanceOverview />} />
      <Route path="/roadmap" element={<RoadmapPage />} />

      {/* Canonical Route Aliases — Build #27D (safe redirects to canonical implementations) */}
      <Route path="/help-center" element={<Navigate to="/knowledge-hub" replace />} />
      <Route path="/module-config" element={<Navigate to="/platform/feature-flags" replace />} />
      <Route path="/integration-health" element={<Navigate to="/platform/integrations" replace />} />
      <Route path="/incident-response" element={<Navigate to="/platform/exception-centre" replace />} />
      <Route path="/security-settings" element={<Navigate to="/settings#security" replace />} />
      <Route path="/compliance-dashboard" element={<Navigate to="/workspace" replace />} />
      {/* Consolidated canonical route aliases — Build #27E */}
      <Route path="/platform/release-readiness" element={<Navigate to="/platform/go-live-readiness" replace />} />
      <Route path="/platform/security-centre" element={<Navigate to="/platform/security-dashboard" replace />} />
      <Route path="/platform/activity-logs" element={<Navigate to="/platform/system-logs" replace />} />
      <Route path="/platform/pilot-management" element={<Navigate to="/platform/pilot-admin" replace />} />
      <Route path="/platform/tenant-insights" element={<Navigate to="/platform/tenant-metrics" replace />} />
      <Route path="/data-export" element={<DataExportPage />} />
      <Route path="/system-activity" element={<SystemActivityPage />} />
      <Route path="/subscription" element={<SubscriptionPage />} />

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
        <Route path="timesheets" element={<TimesheetManager />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="finance-integration" element={<FinanceIntegrationPage />} />
        <Route path="nexus-intelligence" element={<NexusIntelligencePage />} />
        <Route path="data-migration" element={<DataMigrationPage />} />
      </Route>

      {/* Self-Serve Business Installation Wizard — Create Organisation */}
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Governed Onboarding — Workplace Discovery & Access Request */}
      <Route path="/request-access" element={<RequestAccessPage />} />

      {/* Platform Owner Console */}
      <Route path="/leader-org" element={<LeaderOrg />} />

      {/* Tenant / Company */}
      <Route path="/company" element={<Navigate to="/workspace" replace />} />

      {/* Outlet (legacy standalone dashboard — kept for direct access) */}
      <Route path="/outlet" element={<OutletDashboard />} />

      {/* Legacy route redirects — consolidated, all redirect to the dynamic workspace */}
      {LEGACY_REDIRECTS.map((from) => (
        <Route key={from} path={from} element={<Navigate to="/workspace" replace />} />
      ))}

      {/* Governance & Knowledge */}
      <Route path="/governance-log" element={<GovernanceLog />} />
      <Route path="/suppliers" element={<Suppliers />} />
      <Route path="/knowledge-hub" element={<KnowledgeHub />} />
      <Route path="/artifacts" element={<Navigate to="/workspace" replace />} />

      {/* Enterprise — Compliance & Data */}
      <Route path="/audit-centre" element={<AuditCentre />} />
      <Route path="/audit-trail" element={<Navigate to="/audit-centre" replace />} />
      <Route path="/user-roles" element={<UserRoles />} />
      <Route path="/data-import" element={<DataImport />} />
      <Route path="/data-explorer" element={<DataExplorer />} />

      {/* Platform — Revenue Engine */}
      <Route path="/platform/wallet" element={<WalletPage />} />
      <Route path="/platform/marketplace" element={<MarketplacePage />} />
      <Route path="/platform/shield" element={<ShieldCommandCenter />} />
      <Route path="/platform/integrations" element={<IntegrationHubPage />} />
      <Route path="/platform/audit-logs" element={<Navigate to="/audit-centre" replace />} />
      <Route path="/platform/access-control" element={<AccessControlPage />} />
      <Route path="/platform/capabilities" element={<CapabilityManager />} />
      <Route path="/platform/pilot-readiness" element={<PilotReadinessDashboard />} />
      <Route path="/platform/diagnostics" element={<SupportDiagnostics />} />
      <Route path="/platform/pilot-admin" element={<PilotAdminPage />} />
      <Route path="/platform/operational-health" element={<OperationalHealthDashboard />} />
      <Route path="/platform/exception-centre" element={<ExceptionCentrePage />} />
      <Route path="/platform/pilot-activation" element={<PilotActivationPage />} />
      <Route path="/platform/customer-success" element={<CustomerSuccessPage />} />
      <Route path="/platform/go-live-readiness" element={<GoLiveReadinessCentre />} />
      <Route path="/platform/pilot-deployment" element={<PilotDeploymentCentre />} />

      {/* Foundation — Platform Admin Pages */}
      <Route path="/platform/system-logs" element={<SystemLogs />} />
      <Route path="/platform/deployment-pipeline" element={<DeploymentPipeline />} />
      <Route path="/platform/tenant-metrics" element={<TenantMetrics />} />
      <Route path="/platform/security-dashboard" element={<SecurityDashboard />} />
      <Route path="/platform/feature-flags" element={<FeatureFlagManager />} />
      <Route path="/platform/change-log" element={<ChangeLog />} />

      {/* Dev — Automated Test Suites */}
      <Route path="/dev/task-tests" element={<TaskTestSuite />} />
      <Route path="/dev/access-validation" element={<AccessEngineValidation />} />

      {/* Worker Portal */}
      <Route path="/worker" element={<WorkerPortal />} />

      {/* Notifications & Analytics — Cross-outlet intelligence */}
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/analytics" element={<Navigate to="/workspace" replace />} />

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