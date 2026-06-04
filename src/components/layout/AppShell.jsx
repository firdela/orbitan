import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import OrbitanLogo from './OrbitanLogo';
import PlatformFooter from './PlatformFooter';
import { Menu, X, ChevronRight } from 'lucide-react';

export default function AppShell({ navigation, children, headerRight, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar w-64 transition-transform duration-250 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <OrbitanLogo size="sm" variant="light" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navigation.map((item) => {
            if (item.type === 'section') {
              return (
                <p key={item.label} className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/40 px-3 pt-5 pb-2">
                  {item.label}
                </p>
              );
            }
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/30 leading-relaxed">
            Orbitan & OrbitanOS<br />
            Created by Muhammad Firdaus Bin Ismail
          </p>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            {title && <h1 className="font-heading font-semibold text-foreground text-base sm:text-lg">{title}</h1>}
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        <PlatformFooter variant="minimal" />
      </div>
    </div>
  );
}