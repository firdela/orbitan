// OrbitanOS — Global Currency Dropdown
// Reach Principle: live multi-currency switching
// Minimalist enterprise design — sits in top header

import React from 'react';
import { useCurrency, SUPPORTED_CURRENCIES } from '@/lib/CurrencyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CurrencyDropdown({ className }) {
  const { activeCurrency, currencyConfig, switchCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-xs font-semibold border-border bg-background hover:bg-muted px-2.5 hidden",
            className
          )}>
          
          <span>{currencyConfig.flag}</span>
          <span>{activeCurrency}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          Display Currency
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_CURRENCIES.map((c) =>
        <DropdownMenuItem
          key={c.code}
          onClick={() => switchCurrency(c.code)}
          className={cn(
            'flex items-center justify-between text-sm cursor-pointer',
            activeCurrency === c.code && 'bg-orbitan-blue-light text-orbitan-blue font-semibold'
          )}>
          
            <span className="flex items-center gap-2">
              <span>{c.flag}</span>
              <span>{c.code}</span>
            </span>
            <span className="text-muted-foreground text-xs">{c.symbol}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <p className="text-[10px] text-muted-foreground px-2 py-1.5 leading-relaxed">
          Display only. Base values stored in SGD.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>);

}