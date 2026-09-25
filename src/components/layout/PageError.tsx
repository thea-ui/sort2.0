import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface PageErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: React.ReactNode;
}

/**
 * Page-level error block (SMART master handoff Part 4 §8): centered 256px-tall
 * block, 64px destructive/10 circle, 20px semibold title, muted message and an
 * outline retry button. Used as the whole page body when a page query fails;
 * table-level failures use the in-table ErrorState instead.
 */
export const PageError: React.FC<PageErrorProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  icon,
}) => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
      {icon ?? <AlertTriangle className="w-8 h-8 text-destructive" />}
    </div>
    <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
    <p className="text-muted-foreground mb-4">{message}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline">
        {retryLabel}
      </Button>
    )}
  </div>
);
