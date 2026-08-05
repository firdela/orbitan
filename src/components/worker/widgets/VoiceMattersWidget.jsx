// ============================================================
// Widget: Your Voice Matters
// Feedback CTA — suggestions, praise, escalations.
// ============================================================
import React from 'react';
import { MessageSquarePlus, ChevronRight } from 'lucide-react';

export default function VoiceMattersWidget({ onNavigate }) {
  return (
    <button
      onClick={() => onNavigate?.('profile')}
      className="w-full bg-gradient-to-r from-orbitan-blue/10 to-purple-500/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm active:scale-[0.99] transition-all text-left min-h-[44px]"
    >
      <div className="w-10 h-10 rounded-xl orbitan-gradient flex items-center justify-center flex-shrink-0">
        <MessageSquarePlus className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-foreground">Your Voice Matters</p>
        <p className="text-xs text-muted-foreground">Send feedback to your manager, leaders, or Orbitan</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}