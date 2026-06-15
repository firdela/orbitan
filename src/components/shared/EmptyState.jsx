import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ICON_WRAPPER_STYLES = {
  blue: 'bg-orbitan-blue-light text-orbitan-blue',
  green: 'bg-orbitan-green-light text-orbitan-green',
  purple: 'bg-orbitan-purple-light text-orbitan-purple',
  amber: 'bg-orbitan-amber-light text-orbitan-amber',
  red: 'bg-orbitan-red-light text-orbitan-red',
  slate: 'bg-muted text-muted-foreground',
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  color = 'slate',
  size = 'default',
  className,
}) {
  const iconWrapper = ICON_WRAPPER_STYLES[color] || ICON_WRAPPER_STYLES.slate;
  const isLarge = size === 'large';

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in',
      isLarge && 'py-24',
      className
    )}>
      {Icon && (
        <div className={cn(
          'rounded-2xl flex items-center justify-center mb-5',
          isLarge ? 'w-20 h-20' : 'w-16 h-16',
          iconWrapper
        )}>
          <Icon className={cn(isLarge ? 'w-10 h-10' : 'w-8 h-8')} />
        </div>
      )}
      {title && (
        <h3 className={cn(
          'font-heading font-bold text-foreground mb-1.5',
          isLarge ? 'text-xl' : 'text-lg'
        )}>
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size={isLarge ? 'lg' : 'default'}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}