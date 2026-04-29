import React from 'react';
import { cn } from '@/lib/utils';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("skeleton-valentine rounded-lg", className)} />
);

const OrdersSkeleton: React.FC = () => {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Tabs Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Order Cards Skeleton */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="rounded-2xl border-2 border-valentine-blush/30 p-4 skeleton-card"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            {/* Progress */}
            <div className="mb-3">
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="text-center space-y-1">
                  <Skeleton className="h-3 w-full mx-auto" />
                  <Skeleton className="h-5 w-16 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrdersSkeleton;
