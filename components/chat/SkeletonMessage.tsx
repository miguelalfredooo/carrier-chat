'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonMessageProps {
  role: 'pm' | 'research' | 'designer';
}

export function SkeletonMessage({ role }: SkeletonMessageProps) {
  const roles = {
    pm: { icon: '🎯', label: 'PM', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    research: { icon: '🔍', label: 'Research', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    designer: { icon: '💡', label: 'Designer', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  };

  const config = roles[role];

  return (
    <div className="flex justify-start animate-slide-up">
      <div className={`max-w-lg rounded-lg border px-4 py-3 ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-center gap-2 mb-2 font-semibold text-xs">
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
      </div>
    </div>
  );
}
