import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIX_R_PRINCIPLES, LOGO_ASSETS, SHIELD_BRAND } from '@/lib/orbitan-identity';

// ── SVG: 6-segment ring — each segment is 52° with 8° gap ──
const SEGMENT_ANGLE = 52;
const GAP_ANGLE = 8;
const TOTAL = 360;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, endAngle);
  const e = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

function SixRRing({ phase, currentIndex = 0, size = 120 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const strokeW = 3;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeW} />
      {SIX_R_PRINCIPLES.map((principle, i) => {
        const start = i * (SEGMENT_ANGLE + GAP_ANGLE);
        const end = start + SEGMENT_ANGLE;
        const visible = phase === 'complete' || (phase === 'building' && i < currentIndex);
        const isCurrent = phase === 'building' && i === currentIndex;
        return (
          <motion.path
            key={principle.key}
            d={describeArc(cx, cy, r, start, end)}
            fill="none"
            stroke={principle.color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{
              opacity: visible || isCurrent ? 1 : 0.08,
              pathLength: visible ? 1 : isCurrent ? [0, 1] : 0,
            }}
            transition={{
              opacity: { duration: 0.3 },
              pathLength: isCurrent ? { duration: 0.8, ease: 'easeInOut' } : { duration: 0.1 },
            }}
          />
        );
      })}
    </svg>
  );
}

export default function SixRSequence({ onComplete, tenantBrand }) {
  const [phase, setPhase] = useState('building');
  const [step, setStep] = useState(0); // 0-5 = segments, 6 = pause, 7 = logo reveal
  const accent = tenantBrand?.accent || '#3B82F6';

  useEffect(() => {
    if (step < 6) {
      const t = setTimeout(() => setStep(s => s + 1), 280);
      return () => clearTimeout(t);
    } else if (step === 6) {
      const t = setTimeout(() => {
        setPhase('complete');
        setStep(7);
      }, 600);
      return () => clearTimeout(t);
    } else if (step === 7) {
      const t = setTimeout(() => onComplete?.(), 500);
      return () => clearTimeout(t);
    }
  }, [step, onComplete]);

  return (
    <AnimatePresence mode="wait">
      {phase === 'building' && (
        <motion.div
          key="building"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-6"
        >
          <SixRRing phase="building" currentIndex={step} size={120} />
          <div className="flex flex-col items-center gap-1">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] tracking-[0.2em] uppercase text-slate-500 font-medium"
            >
              {step < 6 ? SIX_R_PRINCIPLES[step]?.label : 'Initialising'}
            </motion.p>
            {step < 6 && (
              <motion.div
                className="h-[1px] rounded-full"
                style={{ background: SIX_R_PRINCIPLES[step]?.color, width: '40%' }}
                initial={{ width: '0%' }}
                animate={{ width: '40%' }}
                transition={{ duration: 0.25 }}
              />
            )}
          </div>
        </motion.div>
      )}

      {phase === 'complete' && (
        <motion.div
          key="complete"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center gap-5"
        >
          {/* Logo mark with 6R ring */}
          <div className="relative">
            <SixRRing phase="complete" size={120} />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.img
                src={LOGO_ASSETS.mark3D}
                alt="Orbitan"
                className="w-12 h-12"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
              />
            </div>
          </div>

          {/* Wordmark */}
          <div className="text-center space-y-1">
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="font-display font-bold text-white text-lg tracking-tight"
            >
              Orbitan
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="text-[10px] text-slate-500 tracking-wide"
            >
              The Operating System
            </motion.p>
          </div>

          {/* Tenant brand indicator — if resolved */}
          {tenantBrand && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
              <span className="text-[10px] text-slate-600 font-medium tracking-wide">
                {tenantBrand.brand}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}