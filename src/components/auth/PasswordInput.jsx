// ============================================================
// ORBITAN — Password Input Component
//
// Reusable password field with:
//   - Show/hide visibility toggle (Eye / EyeOff)
//   - Optional password requirements hint
//   - Optional live strength indicator
//   - Proper autocomplete attributes
//   - Accessible label, description, and error association
//   - Focus-visible ring (WCAG 2.2 AA)
//
// Used by Login, Register, and ResetPassword to eliminate
// duplicated password-field logic.
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const STRENGTH_CONFIG = [
  { score: 0, label: 'Too short', color: 'bg-muted-foreground', textColor: 'text-muted-foreground' },
  { score: 1, label: 'Weak', color: 'bg-destructive', textColor: 'text-destructive' },
  { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-500' },
  { score: 3, label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500' },
];

function calculateStrength(password) {
  if (!password || password.length === 0) return 0;
  if (password.length < 8) return 0;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  return Math.min(score, 4);
}

export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  autoFocus = false,
  required = true,
  showRequirements = false,
  showStrength = false,
  error = '',
  description = '',
  onStrengthChange,
  className,
}) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const strength = showStrength ? calculateStrength(value) : 0;
  const strengthInfo = STRENGTH_CONFIG[strength] || STRENGTH_CONFIG[0];

  useEffect(() => {
    if (onStrengthChange && showStrength) {
      onStrengthChange(strength);
    }
  }, [strength, showStrength, onStrengthChange]);

  // Focus the input on mount if autoFocus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const strengthId = showStrength ? `${id}-strength` : undefined;
  const describedBy = [descriptionId, errorId, strengthId].filter(Boolean).join(' ') || undefined;

  const requirements = [
    { label: '8+ characters', met: value.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(value) },
    { label: 'Number', met: /\d/.test(value) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(value) },
  ];

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={inputRef}
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn('pl-10 pr-10 h-12', error && 'border-destructive', className)}
          required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}

      {showStrength && value.length > 0 && (
        <div id={strengthId} className="space-y-1.5" role="status" aria-live="polite">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= strength ? strengthInfo.color : 'bg-muted'
                )}
              />
            ))}
          </div>
          <p className={cn('text-xs font-medium', strengthInfo.textColor)}>
            {strengthInfo.label}
          </p>
        </div>
      )}

      {showRequirements && (focused || value.length > 0) && (
        <ul className="space-y-1" aria-label="Password requirements">
          {requirements.map((req) => (
            <li
              key={req.label}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                req.met ? 'text-emerald-500' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-bold',
                  req.met ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'
                )}
                aria-hidden="true"
              >
                {req.met ? '✓' : '○'}
              </span>
              {req.label}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}