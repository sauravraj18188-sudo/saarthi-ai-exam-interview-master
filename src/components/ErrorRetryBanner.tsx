import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorRetryBannerProps {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}

export const ErrorRetryBanner: React.FC<ErrorRetryBannerProps> = ({
  message,
  onRetry,
  retryLabel = 'Retry Generation',
}) => {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[#EF4444]/30 bg-red-50/90 dark:bg-red-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">
            Generation Interrupted
          </p>
          <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mt-0.5 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        <span>{retryLabel}</span>
      </button>
    </div>
  );
};
