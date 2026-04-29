import React from 'react';
import { cn } from '@/lib/utils';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("skeleton-valentine rounded-lg", className)} />
);

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Wallet Card Skeleton */}
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-valentine-blush/40 to-valentine-rose/20 p-6 skeleton-card">
          {/* User Info */}
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className="bg-white/20 rounded-xl p-3"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>

      {/* Category Switch Skeleton */}
      <div className="mb-6 space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      {/* Pack Cards Skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div 
            key={i} 
            className="rounded-2xl border-2 border-valentine-blush/30 p-4 skeleton-card"
            style={{ animationDelay: `${0.3 + i * 0.1}s` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-14 h-14 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-8 w-20" />
            </div>

            {/* Stats */}
            <div className="space-y-2 mb-4">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>

            {/* Button */}
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardSkeleton;
