'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ErrorMessage({ message, onRetry, isRetrying = false }: ErrorMessageProps) {
  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-lg rounded-lg border px-4 py-3 bg-red-50 border-red-300 text-red-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Message failed to send</h3>
            <p className="text-xs mt-1 text-red-800">{message}</p>
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              size="sm"
              variant="outline"
              className="mt-3 gap-1.5 bg-white text-red-900 border-red-300 hover:bg-red-50"
            >
              <RotateCcw className="w-3 h-3" />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
