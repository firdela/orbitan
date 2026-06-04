import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { TenantProvider } from '@/lib/use-tenant.jsx';

// Page imports
import LeaderOrg from '@/pages/LeaderOrg';
import CompanyDashboard from '@/pages/CompanyDashboard';
import OutletDashboard from '@/pages/OutletDashboard';
import WorkerPortal from '@/pages/WorkerPortal';
import InventoryPage from '@/pages/outlet/InventoryPage';
import ProcurementPage from '@/pages/outlet/ProcurementPage';
import SchedulingPage from '@/pages/outlet/SchedulingPage';
import SalesPage from '@/pages/outlet/SalesPage';
import TasksPage from '@/pages/outlet/TasksPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl orbitan-gradient flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
              <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.9"/>
              <circle cx="16" cy="6.5" r="3" fill="white"/>
              <line x1="16" y1="9.5" x2="16" y2="22.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
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
      {/* Default: redirect to leader-org console */}
      <Route path="/" element={<Navigate to="/leader-org" replace />} />

      {/* Platform Owner Console */}
      <Route path="/leader-org" element={<LeaderOrg />} />

      {/* Tenant / Company */}
      <Route path="/company" element={<CompanyDashboard />} />

      {/* Outlet */}
      <Route path="/outlet" element={<OutletDashboard />} />
      <Route path="/outlet/inventory" element={<InventoryPage />} />
      <Route path="/outlet/procurement" element={<ProcurementPage />} />
      <Route path="/outlet/scheduling" element={<SchedulingPage />} />
      <Route path="/outlet/sales" element={<SalesPage />} />
      <Route path="/outlet/tasks" element={<TasksPage />} />

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
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </TenantProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;