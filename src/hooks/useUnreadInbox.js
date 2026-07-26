import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// ============================================================
// useUnreadInbox — realtime unread actionable count for the
// OrbitInboxBadge (sidebar + topnav). Subscribes to entity
// changes and refreshes the count. Reuses base44 realtime.
// ============================================================

export function useUnreadInbox() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const items = await base44.entities.OrbitInbox.filter(
        { is_actionable: true, action_state: 'pending' },
        '-created_date', 100
      );
      const unread = items.filter((i) => !i.archived_at && !i.read_at);
      setCount(unread.length);
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = base44.entities.OrbitInbox.subscribe(() => {
      refresh();
    });
    return unsub;
  }, [refresh]);

  return { unreadCount: count, loading, refresh };
}