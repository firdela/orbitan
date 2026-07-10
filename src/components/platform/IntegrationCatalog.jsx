import React from "react";

const CATALOG = [
  // ── Finance & Billing ──
  { key: 'xero', name: 'Xero', category: 'Finance & Billing', status: 'available', color: '#13B5EA', letter: 'X' },
  { key: 'stripe', name: 'Stripe', category: 'Finance & Billing', status: 'active', color: '#635BFF', letter: 'S' },
  { key: 'quickbooks', name: 'QuickBooks', category: 'Finance & Billing', status: 'available', color: '#2CA01C', letter: 'Q' },

  // ── Microsoft Ecosystem ──
  { key: 'microsoft_365', name: 'Microsoft 365', category: 'Microsoft', status: 'available', color: '#D83B01', letter: 'M' },
  { key: 'outlook', name: 'Outlook', category: 'Microsoft', status: 'available', color: '#0078D4', letter: 'O' },
  { key: 'teams', name: 'Microsoft Teams', category: 'Microsoft', status: 'available', color: '#464EB8', letter: 'T' },
  { key: 'sharepoint', name: 'SharePoint', category: 'Microsoft', status: 'available', color: '#0078D4', letter: 'P' },
  { key: 'word', name: 'Microsoft Word', category: 'Microsoft', status: 'available', color: '#2B579A', letter: 'W' },
  { key: 'excel', name: 'Microsoft Excel', category: 'Microsoft', status: 'available', color: '#217346', letter: 'E' },
  { key: 'powerpoint', name: 'PowerPoint', category: 'Microsoft', status: 'available', color: '#D24726', letter: 'P' },
  { key: 'onenote', name: 'OneNote', category: 'Microsoft', status: 'available', color: '#7719AA', letter: 'N' },

  // ── Google Ecosystem ──
  { key: 'google_workspace', name: 'Google Workspace', category: 'Google', status: 'available', color: '#4285F4', letter: 'G' },
  { key: 'google_calendar', name: 'Google Calendar', category: 'Google', status: 'available', color: '#4285F4', letter: 'C' },
  { key: 'google_drive', name: 'Google Drive', category: 'Google', status: 'available', color: '#0F9D58', letter: 'D' },
  { key: 'google_meet', name: 'Google Meet', category: 'Google', status: 'available', color: '#00897B', letter: 'M' },

  // ── Communication ──
  { key: 'whatsapp', name: 'WhatsApp', category: 'Communication', status: 'coming_soon', color: '#25D366', letter: 'W' },
  { key: 'slack', name: 'Slack', category: 'Communication', status: 'available', color: '#4A154B', letter: 'S' },

  // ── Document & E-Signature ──
  { key: 'docusign', name: 'DocuSign', category: 'Documents', status: 'available', color: '#FFB200', letter: 'D' },
  { key: 'dropbox', name: 'Dropbox', category: 'Documents', status: 'available', color: '#0061FF', letter: 'D' },
  { key: 'box', name: 'Box', category: 'Documents', status: 'available', color: '#0061D5', letter: 'B' },

  // ── Productivity & Project Management ──
  { key: 'todoist', name: 'Todoist', category: 'Productivity', status: 'available', color: '#E44332', letter: 'T' },
  { key: 'wrike', name: 'Wrike', category: 'Productivity', status: 'available', color: '#00A1E0', letter: 'W' },

  // ── Sales & Marketing ──
  { key: 'salesforce', name: 'Salesforce', category: 'Sales & Marketing', status: 'available', color: '#00A1E0', letter: 'S' },
  { key: 'meta_ads', name: 'Meta Ads (Facebook)', category: 'Sales & Marketing', status: 'available', color: '#1877F2', letter: 'F' },
  { key: 'shopify', name: 'Shopify', category: 'Sales & Marketing', status: 'coming_soon', color: '#95BF47', letter: 'S' },
];

const STATUS_BADGE = {
  available: { label: 'Available', className: 'bg-blue-50 text-blue-600 border border-blue-200' },
  active: { label: 'Active', className: 'bg-green-50 text-green-600 border border-green-200' },
  coming_soon: { label: 'Coming Soon', className: 'bg-amber-50 text-amber-600 border border-amber-200' },
};

export default function IntegrationCatalog() {
  const categories = [...new Set(CATALOG.map((s) => s.category))];

  return (
    <div className="mt-8 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Available Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your favourite tools. New connectors are added regularly.
        </p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            {category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATALOG.filter((s) => s.category === category).map((service) => {
              const badge = STATUS_BADGE[service.status] || STATUS_BADGE.available;
              return (
                <div
                  key={service.key}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-lg"
                    style={{ backgroundColor: service.color }}
                  >
                    {service.letter}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{service.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}