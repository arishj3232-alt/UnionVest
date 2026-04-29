import React from 'react';
import { Lock, Gift, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { silverPacks, goldPacks } from '@/data/packs';

interface UnlockProgressProps {
  currentLevel: number;
  className?: string;
}

const UnlockProgress: React.FC<UnlockProgressProps> = ({ currentLevel, className }) => {
  const maxSilverLevel = silverPacks.length;
  const nextLevel = currentLevel + 1;
  
  // Find the next gold pack that would be unlocked
  const nextUnlockablePack = goldPacks.find(
    pack => pack.requiredLevel && pack.requiredLevel > currentLevel
  );
  
  // Calculate how many silver levels until next unlock
  const levelsUntilNextUnlock = nextUnlockablePack 
    ? nextUnlockablePack.requiredLevel! - currentLevel 
    : 0;
  
  // Calculate progress percentage (within current -> next unlock range)
  const progressToNextUnlock = nextUnlockablePack && nextUnlockablePack.requiredLevel
    ? ((currentLevel % nextUnlockablePack.requiredLevel) / nextUnlockablePack.requiredLevel) * 100
    : 100;

  // If user has maxed out all silver levels
  if (currentLevel >= maxSilverLevel || !nextUnlockablePack) {
    return (
      <div className={cn(
        "p-4 bg-gradient-to-r from-valentine-rose/10 to-valentine-blush/10 rounded-2xl border border-valentine-rose/20",
        className
      )}>
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-valentine-rose animate-sparkle" />
          <span className="font-display text-lg font-bold text-valentine-rose">All Premium Packs Unlocked!</span>
          <Sparkles className="w-5 h-5 text-valentine-rose animate-sparkle" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 bg-card rounded-2xl shadow-card border border-border",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-valentine-rose/10 flex items-center justify-center">
            <Gift className="w-4 h-4 text-valentine-rose" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Next Premium Unlock</p>
            <p className="font-semibold text-sm text-foreground">{nextUnlockablePack.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Requires</p>
          <p className="font-semibold text-sm text-valentine-rose">Level {nextUnlockablePack.requiredLevel}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mb-3">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-valentine-blush to-valentine-rose rounded-full transition-all duration-500 relative"
            style={{ width: `${(currentLevel / nextUnlockablePack.requiredLevel!) * 100}%` }}
          >
            {/* Shimmer effect on progress */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
        
        {/* Level markers */}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">Level {currentLevel}</span>
          <span className="text-[10px] font-semibold text-valentine-rose">Level {nextUnlockablePack.requiredLevel}</span>
        </div>
      </div>

      {/* Status message */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {levelsUntilNextUnlock === 1 ? (
            <>
              <Sparkles className="w-4 h-4 text-valentine-rose animate-sparkle" />
              <span className="text-xs font-medium text-valentine-rose">Almost there!</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {levelsUntilNextUnlock} more level{levelsUntilNextUnlock > 1 ? 's' : ''} to unlock
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-xs text-valentine-rose">
          <span>₹{nextUnlockablePack.dailyEarning?.toLocaleString()}/day</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};

export default UnlockProgress;
