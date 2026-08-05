import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import BackBar from '@/components/shared/BackBar';
import AIRequestStatus from '@/components/platform/AIRequestStatus';

export default function AIRequestStatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <BackBar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
        <PageHeader
          title="My AI Requests"
          subtitle="View your AI action requests, check approval status, execute approved requests, and cancel pending ones."
        />
        <div className="flex items-center gap-2 mb-6">
          <Link
            to="/platform/ai-governance"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View AI Governance Centre
          </Link>
        </div>
        <AIRequestStatus />
      </div>
    </div>
  );
}