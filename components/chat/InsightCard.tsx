'use client';

import { ReactNode, Children, isValidElement } from 'react';
import { Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react';

type InsightType = 'insight' | 'recommendation' | 'risk' | 'default';

interface InsightCardProps {
  children: ReactNode;
}

/**
 * Detects the insight type from blockquote content by checking for
 * bold prefix patterns: **Insight:**, **Recommendation:**, **Risk:**
 *
 * Called from ReactMarkdown's custom blockquote component.
 */
function detectInsightType(children: ReactNode): { type: InsightType; cleanChildren: ReactNode } {
  const childArray = Children.toArray(children);

  // Walk through children to find the first <p> containing a <strong> prefix
  for (let i = 0; i < childArray.length; i++) {
    const child = childArray[i];
    if (!isValidElement(child)) continue;

    // ReactMarkdown wraps blockquote content in <p> elements
    const props = child.props as { children?: ReactNode };
    if (!props.children) continue;

    const innerChildren = Children.toArray(props.children);
    const firstChild = innerChildren[0];

    if (isValidElement(firstChild) && firstChild.type === 'strong') {
      const strongProps = firstChild.props as { children?: ReactNode };
      const strongText = String(strongProps.children || '').toLowerCase();

      if (strongText.startsWith('insight')) return { type: 'insight', cleanChildren: children };
      if (strongText.startsWith('recommendation')) return { type: 'recommendation', cleanChildren: children };
      if (strongText.startsWith('risk') || strongText.startsWith('warning')) return { type: 'risk', cleanChildren: children };
    }
  }

  return { type: 'default', cleanChildren: children };
}

const CARD_STYLES: Record<InsightType, {
  bg: string;
  border: string;
  iconColor: string;
  icon: typeof Lightbulb;
}> = {
  insight: {
    bg: 'bg-blue-50',
    border: 'border-l-blue-400',
    iconColor: 'text-blue-500',
    icon: Lightbulb,
  },
  recommendation: {
    bg: 'bg-emerald-50',
    border: 'border-l-emerald-400',
    iconColor: 'text-emerald-600',
    icon: TrendingUp,
  },
  risk: {
    bg: 'bg-red-50',
    border: 'border-l-red-400',
    iconColor: 'text-red-500',
    icon: AlertTriangle,
  },
  default: {
    bg: 'bg-gray-50',
    border: 'border-l-gray-300',
    iconColor: 'text-gray-400',
    icon: Lightbulb,
  },
};

export function InsightCard({ children }: InsightCardProps) {
  const { type } = detectInsightType(children);
  const style = CARD_STYLES[type];
  const Icon = style.icon;

  // Default blockquotes get minimal styling
  if (type === 'default') {
    return (
      <blockquote className="border-l-3 border-gray-200 pl-3 my-2 text-gray-600 italic">
        {children}
      </blockquote>
    );
  }

  return (
    <div className={`
      ${style.bg}
      border-l-3 ${style.border}
      rounded-r-lg
      px-3 py-2.5
      my-3
      flex gap-2.5
      items-start
    `}>
      <Icon size={15} className={`${style.iconColor} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 text-sm leading-relaxed text-gray-800">
        {children}
      </div>
    </div>
  );
}
