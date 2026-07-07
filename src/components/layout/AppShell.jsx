import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import OrbitanLogo from './OrbitanLogo';
import PlatformFooter from './PlatformFooter';
import EnterpriseIdentityBar from '@/components/shared/EnterpriseIdentityBar';
import ReportIssueModal from '@/components/shared/ReportIssueModal';
import { Menu, X } from 'lucide-react';

export default function AppShell({ navigation, manifestNav, children, headerRight, title, tenant }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar — Deep Titanium Rail ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-[220px] transition-transform duration-200 ease-out lg:relative lg:translate-x-0",
          "bg-sidebar",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 py-[18px] border-b border-sidebar-border/60">
          <OrbitanLogo size="sm" variant="light" showOS />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items — Manifest-driven (new) or legacy array (fallback) */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {manifestNav ? (
            <div onClick={() => setSidebarOpen(false)}>{manifestNav}</div>
          ) : (
            navigation.map((item) => {
              if (item.type === 'section') {
                return (
                  <p
                    key={item.label}
                    className="text-[9px] uppercase tracking-[0.12em] font-bold text-sidebar-foreground/30 px-3 pt-5 pb-1.5"
                  >
                    {item.label}
                  </p>
                );
              }

              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150",
                    isActive
                      ? "nav-active-stripe bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                  )}
                >
                  {item.icon && <item.icon className="w-[15px] h-[15px] flex-shrink-0" />}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>

        {/* Sidebar Footer — Enterprise Identity + Copyright */}
        <div className="px-4 py-4 border-t border-sidebar-border/40 space-y-3">
          {tenant && (
            <div className="py-1">
              <EnterpriseIdentityBar
                tenant={tenant}
                showPlan
                showOutlet={false}
                size="sm"
                className="[&_*]:!text-sidebar-foreground/70 [&_.font-heading]:!text-sidebar-foreground"
              />
            </div>
          )}
          <p className="text-[9px] text-sidebar-foreground/25 leading-relaxed tracking-wide uppercase">
            Orbitan & OrbitanOS<br />
            © 2026 Muhammad Firdaus Bin Ismail
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar — Titanium glass */}
        <header className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-border/60 bg-background/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {title && (
              <h1 className="font-heading font-semibold text-foreground text-sm sm:text-[15px] tracking-tight">
                {title}
              </h1>
            )}
          </div>
          {headerRight && (
            <div className="flex items-center gap-2">{headerRight}</div>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        <PlatformFooter variant="minimal" />
      </div>

      {/* Pilot Feedback Centre — floating button available on all workspace pages */}
      <ReportIssueModal />
    </div>
  );
}