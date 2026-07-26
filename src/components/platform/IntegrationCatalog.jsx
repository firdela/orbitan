// ============================================================
// ORBITANOS — Integration Catalogue (Build #26A.1)
// Truthful status layer. No connector is labelled "Available"
// unless it is genuinely usable. Third-party connectors with no
// backend implementation are shown as Planned / Coming Soon with a
// muted treatment and a "Request Integration" action only.
//
// Xero and Stripe are managed by the dedicated cards above this
// catalogue on the Integration Hub — they are intentionally NOT
// duplicated here.
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Sparkles, MessageSquare } from 'lucide-react';

// Truthful statuses — validated against actual backend implementation.
// Only 'planned' and 'coming_soon' apply to the third-party catalogue;
// Xero (Configuration Required) and Stripe Platform Billing (Connected)
// are managed by the dedicated cards above.
const STATUS = {
  planned: { label: 'Planned', className: 'bg-muted text-muted-foreground border-border' },
  coming_soon: { label: 'Coming Soon', className: 'bg-orbitan-amber-light text-orbitan-amber-700 border-orbitan-amber/30' },
};

const CATALOG = [
  // ── Finance & Billing ──
  { key: 'quickbooks', name: 'QuickBooks', category: 'Finance & Billing', status: 'planned', color: '#2CA01C', letter: 'Q' },

  // ── Microsoft Ecosystem ──
  { key: 'microsoft_365', name: 'Microsoft 365', category: 'Microsoft', status: 'planned', color: '#D83B01', letter: 'M' },
  { key: 'outlook', name: 'Outlook', category: 'Microsoft', status: 'planned', color: '#0078D4', letter: 'O' },
  { key: 'teams', name: 'Microsoft Teams', category: 'Microsoft', status: 'planned', color: '#464EB8', letter: 'T' },
  { key: 'sharepoint', name: 'SharePoint', category: 'Microsoft', status: 'planned', color: '#0078D4', letter: 'P' },
  { key: 'word', name: 'Microsoft Word', category: 'Microsoft', status: 'planned', color: '#2B579A', letter: 'W' },
  { key: 'excel', name: 'Microsoft Excel', category: 'Microsoft', status: 'planned', color: '#217346', letter: 'E' },
  { key: 'powerpoint', name: 'PowerPoint', category: 'Microsoft', status: 'planned', color: '#D24726', letter: 'P' },
  { key: 'onenote', name: 'OneNote', category: 'Microsoft', status: 'planned', color: '#7719AA', letter: 'N' },

  // ── Google Ecosystem ──
  { key: 'google_workspace', name: 'Google Workspace', category: 'Google', status: 'planned', color: '#4285F4', letter: 'G' },
  { key: 'google_calendar', name: 'Google Calendar', category: 'Google', status: 'planned', color: '#4285F4', letter: 'C' },
  { key: 'google_drive', name: 'Google Drive', category: 'Google', status: 'planned', color: '#0F9D58', letter: 'D' },
  { key: 'google_meet', name: 'Google Meet', category: 'Google', status: 'planned', color: '#00897B', letter: 'M' },

  // ── Communication ──
  { key: 'whatsapp', name: 'WhatsApp', category: 'Communication', status: 'coming_soon', color: '#25D366', letter: 'W' },
  { key: 'slack', name: 'Slack', category: 'Communication', status: 'planned', color: '#4A154B', letter: 'S' },

  // ── Documents ──
  { key: 'docusign', name: 'DocuSign', category: 'Documents', status: 'planned', color: '#FFB200', letter: 'D' },
  { key: 'dropbox', name: 'Dropbox', category: 'Documents', status: 'planned', color: '#0061FF', letter: 'D' },
  { key: 'box', name: 'Box', category: 'Documents', status: 'planned', color: '#0061D5', letter: 'B' },

  // ── Productivity ──
  { key: 'todoist', name: 'Todoist', category: 'Productivity', status: 'planned', color: '#E44332', letter: 'T' },
  { key: 'wrike', name: 'Wrike', category: 'Productivity', status: 'planned', color: '#00A1E0', letter: 'W' },

  // ── Sales & Marketing ──
  { key: 'salesforce', name: 'Salesforce', category: 'Sales & Marketing', status: 'planned', color: '#00A1E0', letter: 'S' },
  { key: 'meta_ads', name: 'Meta Ads (Facebook)', category: 'Sales & Marketing', status: 'planned', color: '#1877F2', letter: 'F' },
  { key: 'shopify', name: 'Shopify', category: 'Sales & Marketing', status: 'coming_soon', color: '#95BF47', letter: 'S' },
];

export default function IntegrationCatalog() {
  const categories = [...new Set(CATALOG.map((s) => s.category))];

  return (
    <div className="mt-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          Integration Catalogue
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Connect the tools your organisation already uses. Production-ready connectors appear first on
          this page, while the integrations below are a preview of what is coming to OrbitanOS — they
          are not yet usable and will never start a setup flow until they are genuinely ready.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Xero and Stripe are managed in the dedicated cards above. The connectors below are on the roadmap.
        </p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            {category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATALOG.filter((s) => s.category === category).map((service) => {
              const badge = STATUS[service.status] || STATUS.planned;
              const isPlanned = service.status === 'planned' || service.status === 'coming_soon';
              return (
                <div
                  key={service.key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border bg-card transition-colors',
                    isPlanned ? 'border-dashed border-border opacity-80' : 'border-border hover:bg-muted/50'
                  )}
                  aria-label={`${service.name} — ${badge.label}`}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-lg',
                      isPlanned && 'opacity-60 grayscale'
                    )}
                    style={{ backgroundColor: service.color }}
                    aria-hidden="true"
                  >
                    {service.letter}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{service.name}</p>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', badge.className)}>
                      {badge.label}
                    </span>
                  </div>
                  <Link
                    to="/feedback"
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 flex-shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 py-0.5"
                    aria-label={`Request ${service.name} integration`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    Request
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 flex items-start gap-3">
        <ArrowUpRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Don&rsquo;t see your tool? Every connector here is on the OrbitanOS roadmap. Use
          <Link to="/feedback" className="text-foreground underline-offset-2 hover:underline mx-1">Send Feedback</Link>
          to request an integration — we prioritise connectors our pilot tenants actually need.
        </p>
      </div>
    </div>
  );
}