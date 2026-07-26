import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Pin, Archive, Check, X, Eye } from 'lucide-react';
import { getCategoryConfig, getPriorityConfig } from './inboxConfig';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// OrbitInboxItem — single inbox row. Actions: mark read, pin, complete,
// dismiss, archive. Keyboard accessible (Enter to open link).
export default function OrbitInboxItem({ item, onAction }) {
  const cat = getCategoryConfig(item.category);
  const pri = getPriorityConfig(item.priority);
  const Icon = cat.Icon;
  const isUnread = !item.read_at;
  const isPinned = item.pinned;
  const isActionDone = item.action_state !== 'pending';

  const handleAction = (action) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAction(item, action);
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-4 border-b border-border last:border-0 transition-colors',
        isUnread ? 'bg-primary/[0.03]' : 'bg-card',
        isActionDone && 'opacity-60',
        'hover:bg-muted/30'
      )}
    >
      {/* Category icon */}
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cat.bg)}>
        <Icon className={cn('w-4 h-4', cat.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h4 className={cn('text-sm leading-tight', isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
            {item.title}
          </h4>
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0', pri.classes)}>
            {pri.label}
          </span>
        </div>
        {item.body && <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">{item.body}</p>}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className={cn('font-medium', cat.color)}>{cat.label}</span>
          {isPinned && <span className="flex items-center gap-1 text-orbitan-amber"><Pin className="w-3 h-3" />Pinned</span>}
          {item.action_state === 'completed' && <span className="flex items-center gap-1 text-orbitan-green"><Check className="w-3 h-3" />Done</span>}
          {item.action_state === 'dismissed' && <span className="flex items-center gap-1 text-muted-foreground"><X className="w-3 h-3" />Dismissed</span>}
          <span>{timeAgo(item.created_date)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUnread && (
          <button
            onClick={handleAction('read')}
            title="Mark as read"
            aria-label="Mark as read"
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        {item.is_actionable && item.action_state === 'pending' && (
          <>
            <button
              onClick={handleAction('complete')}
              title="Mark completed"
              aria-label="Mark completed"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-orbitan-green hover:bg-orbitan-green-light transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleAction('dismiss')}
              title="Dismiss"
              aria-label="Dismiss"
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <button
          onClick={handleAction('pin')}
          title={isPinned ? 'Unpin' : 'Pin'}
          aria-label={isPinned ? 'Unpin' : 'Pin'}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
            isPinned ? 'text-orbitan-amber' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleAction('archive')}
          title="Archive"
          aria-label="Archive"
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}