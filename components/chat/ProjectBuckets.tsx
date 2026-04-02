'use client';

import { useState } from 'react';
import { X, ArrowRight, Search, Lightbulb, Palette, Users, Target, Layers, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectBucket } from '@/lib/chat-types';

interface ProjectBucketsProps {
  buckets: ProjectBucket[];
  onDiveIn: (prompt: string) => void;
  disabled?: boolean;
}

const ICON_MAP: Record<string, typeof Lightbulb> = {
  'user-research': Users,
  'research': Users,
  'usability': Search,
  'strategy': Target,
  'visual-design': Palette,
  'design-system': Layers,
  'interaction': Layers,
  'validation': FlaskConical,
  'testing': FlaskConical,
  'insights': Lightbulb,
};

function getIcon(bucketId: string) {
  if (ICON_MAP[bucketId]) return ICON_MAP[bucketId];
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (bucketId.includes(key)) return icon;
  }
  return Layers;
}

export function ProjectBuckets({ buckets, onDiveIn, disabled = false }: ProjectBucketsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (buckets.length === 0) return null;

  const expandedBucket = buckets.find((b) => b.id === expandedId);

  return (
    <div className="flex flex-col gap-0 px-4 pb-2">
      {/* Bucket strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pt-2 pb-1">
        {buckets.map((bucket) => {
          const Icon = getIcon(bucket.id);
          const isExpanded = expandedId === bucket.id;

          return (
            <button
              key={bucket.id}
              onClick={() => setExpandedId(isExpanded ? null : bucket.id)}
              className={`
                flex items-center gap-1.5
                px-2.5 py-1.5
                rounded-md
                text-xs font-medium
                whitespace-nowrap
                border
                transition-all duration-150
                ${isExpanded
                  ? 'bg-white/15 border-white/25 text-white'
                  : 'bg-white/[0.06] border-white/10 text-white/60 hover:bg-white/[0.10] hover:text-white/80 hover:border-white/20'
                }
              `}
            >
              <Icon size={12} className="flex-shrink-0" />
              <span>{bucket.label}</span>
              <span className={`
                text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                ${isExpanded
                  ? 'bg-white/20 text-white'
                  : 'bg-white/10 text-white/40'
                }
              `}>
                {bucket.insights.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded panel */}
      {expandedBucket && (
        <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              {(() => { const Icon = getIcon(expandedBucket.id); return <Icon size={14} className="text-white/60" />; })()}
              <span className="text-[13px] font-semibold text-white">{expandedBucket.label}</span>
              <span className="text-[10px] text-white/40">{expandedBucket.insights.length} insight{expandedBucket.insights.length !== 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={() => setExpandedId(null)}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Insights list */}
          <div className="px-3.5 py-2 max-h-36 overflow-y-auto">
            <ul className="flex flex-col gap-1.5">
              {expandedBucket.insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-white/70">
                  <span className="text-white/25 mt-0.5 flex-shrink-0">-</span>
                  <span>{insight.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dive in action */}
          <div className="px-3.5 py-2.5 border-t border-white/[0.08]">
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                onDiveIn(`Let's dive deeper into ${expandedBucket.label.toLowerCase()}. Based on what we've covered so far, walk me through the key decisions and next steps here.`);
                setExpandedId(null);
              }}
              className="w-full justify-between text-[12px] text-white/60 hover:text-white hover:bg-white/[0.08] h-8"
            >
              <span>Dive into {expandedBucket.label.toLowerCase()}</span>
              <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
