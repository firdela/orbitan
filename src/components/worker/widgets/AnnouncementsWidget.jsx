// ============================================================
// Widget: Announcements
// Shows recent/unread workplace announcements.
// Reuses AnnouncementFeed (existing component with its own query).
// ============================================================
import React from 'react';
import AnnouncementFeed from '@/components/announcements/AnnouncementFeed';

export default function AnnouncementsWidget({ tenantId, workerId }) {
  if (!tenantId || !workerId) return null;

  return (
    <div>
      <AnnouncementFeed
        tenantId={tenantId}
        workerId={workerId}
        maxItems={3}
      />
    </div>
  );
}