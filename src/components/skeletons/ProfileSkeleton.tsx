import React from 'react';
import { cn } from '@/lib/utils';

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("skeleton-valentine rounded-lg", className)} />
);

const ProfileSkeleton: React.FC = () => {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-8">
        <Skeleton className="w-24 h-24 rounded-full mb-4" />
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className="bg-valentine-blush/10 rounded-xl p-4 text-center skeleton-card"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <Skeleton className="h-4 w-16 mx-auto mb-2" />
            <Skeleton className="h-6 w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className="flex items-center justify-between p-4 bg-card rounded-xl skeleton-card"
            style={{ animationDelay: `${0.4 + i * 0.08}s` }}
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="w-5 h-5" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileSkeleton;
