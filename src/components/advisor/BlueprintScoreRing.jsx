// ============================================================
// ORBITAN — BlueprintScoreRing Component
// Circular progress indicator showing tenant configuration health.
// Exit-Ready: pure UI, consumes score from blueprint-registry.
// ============================================================

import React from 'react';
import { cn } from '@/lib/utils';

function getScoreColor(score) {
  if (score >= 80) return { ring: '#16A34A', bg: '#16A34A15', label: 'Excellent' };
  if (score >= 60) return { ring: '#2563EB', bg: '#2563EB15', label: 'Good' };
  if (score >= 40) return { ring: '#F59E0B', bg: '#F59E0B15', label: 'Needs Work' };
  return { ring: '#DC2626', bg: '#DC262615', label: 'Critical' };
}

export default function BlueprintScoreRing({ score, size = 120 }) {
  const { ring, bg, label } = getScoreColor(score);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ring}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-display font-bold text-foreground">{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ background: bg, color: ring }}
      >
        {label}
      </span>
    </div>
  );
}