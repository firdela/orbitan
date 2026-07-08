import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import OrbitanLoader from '@/components/brand/OrbitanLoader'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { TenantProvider } from '@/lib/use-tenant.jsx';
import { GlobalOutletProvider } from '@/lib/GlobalOutletContext';
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
import InventoryPage from '@/pages/outlet/InventoryPage';
import ProcurementPage from '@/pages/outlet/ProcurementPage';
import HBBPage from '@/pages/outlet/HBBPage';
import SchedulingPage from '@/pages/outlet/SchedulingPage';
import SalesPage from '@/pages/outlet/SalesPage';
import TasksPage from '@/pages/outlet/TasksPage';
import WorkforcePage from '@/pages/outlet/WorkforcePage';
import CompliancePage from '@/pages/outlet/CompliancePage';
import ReportsPage from '@/pages/outlet/ReportsPage';

// Dynamic Workspace — scalable, tenant-agnostic routing
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout';
import WorkspaceDashboard from '@/pages/workspace/WorkspaceDashboard';

// Platform — Revenue Engine
import WalletPage from '@/pages/platform/WalletPage';
import MarketplacePage from '@/pages/platform/MarketplacePage';
import ShieldCommandCenter from '@/pages/platform/ShieldCommandCenter';
import IntegrationHubPage from '@/pages/platform/IntegrationHubPage';

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
        <Route path="tasks" element={<TasksPage />} />
        <Route path="workforce" element={<WorkforcePage />} />
        <Route path="scheduling" element={<SchedulingPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      {/* Self-Serve Business Installation Wizard — Create Organisation */}
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Governed Onboarding — Workplace Discovery & Access Request */}
      <Route path="/request-access" element={<RequestAccessPage />} />

      {/* Platform Owner Console */}
      <Route path="/leader-org" element={<LeaderOrg />} />

      {/* Tenant / Company */}
      <Route path="/company" element={<CompanyDashboard />} />

      {/* Outlet */}
      <Route path="/outlet" element={<OutletDashboard />} />
      <Route path="/outlet/inventory" element={<InventoryPage />} />
      <Route path="/outlet/procurement" element={<ProcurementPage />} />
      <Route path="/outlet/hbb" element={<HBBPage />} />
      <Route path="/outlet/scheduling" element={<SchedulingPage />} />
      <Route path="/outlet/sales" element={<SalesPage />} />
      <Route path="/outlet/tasks" element={<TasksPage />} />
      <Route path="/outlet/workforce" element={<WorkforcePage />} />
      <Route path="/outlet/compliance" element={<CompliancePage />} />
      <Route path="/outlet/reports" element={<ReportsPage />} />

      {/* Platform — Revenue Engine */}
      <Route path="/platform/wallet" element={<WalletPage />} />
      <Route path="/platform/marketplace" element={<MarketplacePage />} />
      <Route path="/platform/shield" element={<ShieldCommandCenter />} />
      <Route path="/platform/integrations" element={<IntegrationHubPage />} />

      {/* Worker Portal */}
      <Route path="/worker" element={<WorkerPortal />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <TenantProvider>
        <CurrencyProvider tenantDefaultCurrency="SGD">
        <GlobalOutletProvider>
        <Router>
            <SystemGuard>
              <AuthenticatedApp />
            </SystemGuard>
          </Router>
          </GlobalOutletProvider>
          <Toaster />
        </CurrencyProvider>
        </TenantProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;