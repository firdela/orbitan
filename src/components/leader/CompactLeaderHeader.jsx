import React from 'react';
import { Cpu } from 'lucide-react';

/**
 * CompactLeaderHeader — replaces the oversized welcome hero.
 * Single compact row: greeting + name + role/context/date + version.
 * Saves ~40% vertical space vs the original hero block.
 */
export default function CompactLeaderHeader({ userName, platform, os, version }) {
  const today = new Date().toLocaleDateString('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight">
          Welcome back, <span className="text-orbitan-blue">{userName}</span>
        </h1>
        <span className="hidden sm:inline-flex items-center gap-1 bg-orbitan-blue-light text-orbitan-blue px-2 py-0.5 rounded-full text-[10px] font-semibold">
          <Cpu className="w-3 h-3" /> v{version}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">Platform Owner</span>
        <span className="mx-1.5">·</span>
        {platform} &amp; {os}
        <span className="mx-1.5">·</span>
        {today}
      </p>
    </div>
  );
}