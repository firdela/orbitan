import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BackBar — reusable navigation bar for standalone pages that are
 * NOT inside the AppShell (AccountSettings, Notifications, KnowledgeHub,
 * AuditCentre, etc.). Provides a consistent back button + optional
 * breadcrumb so users are never trapped inside a page.
 *
 * Props:
 *  - to: back destination (default '/workspace')
 *  - label: back button text (default 'Back')
 *  - breadcrumb: optional array of { label, to? } for parent trail
 *  - title: optional current-page title shown after breadcrumb
 */
export default function BackBar({ to = '/workspace', label = 'Back', breadcrumb = [], title, className }) {
  return (
    <div className={cn('flex items-center gap-2 mb-4 text-sm', className)}>
      <Link
        to={to}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <ArrowLeft className="w-4 h-4" />
        {label}
      </Link>
      {breadcrumb.length > 0 && (
        <>
          <span className="text-muted-foreground/40">/</span>
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {crumb.to ? (
                <Link to={crumb.to} className="text-muted-foreground hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-muted-foreground">{crumb.label}</span>
              )}
              {i < breadcrumb.length - 1 && <span className="text-muted-foreground/40">/</span>}
            </React.Fragment>
          ))}
        </>
      )}
      {title && (
        <>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-foreground">{title}</span>
        </>
      )}
    </div>
  );
}