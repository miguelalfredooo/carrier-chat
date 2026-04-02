'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({ suggestions, onSelect, disabled = false }: SuggestionChipsProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (suggestions.length === 0) return null;

  const handleSelect = (index: number, suggestion: string) => {
    setSelectedIndex(index);
    onSelect(suggestion);
  };

  return (
    <div
      className="mt-3 rounded-xl border border-white/10 overflow-hidden animate-fade-in"
      role="group"
      aria-label="Suggested next steps"
    >
      {suggestions.map((suggestion, index) => {
        const isSelected = selectedIndex === index;
        const isDimmed = selectedIndex !== null && !isSelected;
        const isLast = index === suggestions.length - 1;

        return (
          <Button
            key={index}
            variant="ghost"
            onClick={() => handleSelect(index, suggestion)}
            disabled={disabled || selectedIndex !== null}
            className={`
              w-full justify-between
              h-auto py-2.5 px-3.5
              rounded-none
              text-[13px] font-normal leading-snug
              ${!isLast ? 'border-b border-white/[0.08]' : ''}
              ${isSelected
                ? 'bg-white/15 text-white'
                : isDimmed
                  ? 'bg-transparent text-white/25'
                  : 'bg-transparent text-white/70 hover:bg-white/[0.08] hover:text-white'
              }
              disabled:opacity-100
            `}
          >
            <span className="text-left">{suggestion}</span>
            <ChevronRight
              size={14}
              className={`
                flex-shrink-0 ml-2
                transition-all duration-150
                ${isSelected
                  ? 'opacity-80 text-white'
                  : isDimmed
                    ? 'opacity-0'
                    : 'opacity-0 group-hover:opacity-50'
                }
              `}
            />
          </Button>
        );
      })}
    </div>
  );
}
