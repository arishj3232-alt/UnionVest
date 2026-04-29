import React, { useEffect, useRef } from 'react';
import { X, Wrench, Hammer, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VIPPack } from '@/types';
import { triggerValentineConfetti } from '@/utils/confetti';
import { playLevelUp, playUnlock, playClick } from '@/utils/soundEffects';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  unlockedPacks: VIPPack[];
  onViewPacks?: () => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  newLevel,
  unlockedPacks,
  onViewPacks,
}) => {
  const hasAnimatedRef = useRef(false);

  // Trigger confetti and sounds when modal opens
  useEffect(() => {
    if (!isOpen) {
      hasAnimatedRef.current = false;
      return;
    }
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    playLevelUp();
    const timers = unlockedPacks.map((_, index) =>
      window.setTimeout(() => playUnlock(), 400 + index * 300)
    );

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [isOpen, unlockedPacks.length]);

  if (!isOpen) return null;

  const handleViewPacks = () => {
    playClick();
    onViewPacks?.();
    onClose();
  };

  const handleClose = () => {
    playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "relative w-full max-w-sm bg-card rounded-md shadow-2xl overflow-hidden border border-border",
        "animate-scale-in"
      )}>
        {/* Solid header */}
        <div className="relative h-28 bg-foreground flex items-center justify-center overflow-hidden border-b-4 border-primary">
          <div className="relative">
            <div className="w-20 h-20 rounded-md bg-primary flex items-center justify-center">
              <Hammer className="w-10 h-10 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-background rounded-md flex items-center justify-center text-sm font-bold text-foreground shadow-lg border border-border">
              {newLevel}
            </div>
          </div>
        </div>
        
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 rounded-md bg-background/20 hover:bg-background/30 transition-colors"
        >
          <X className="w-5 h-5 text-background" />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <h2 className="font-display text-3xl font-bold text-foreground uppercase tracking-wider">
              Promoted
            </h2>
          </div>

          <p className="text-muted-foreground mb-4">
            You've reached <span className="font-bold text-primary uppercase tracking-wider">Worker Level {newLevel}</span>
          </p>

          {/* Unlocked packs preview */}
          {unlockedPacks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground uppercase tracking-widest">
                  {unlockedPacks.length} Leadership Plan{unlockedPacks.length > 1 ? 's' : ''} Unlocked
                </span>
              </div>

              <div className="space-y-2">
                {unlockedPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-md border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-primary" />
                      <div className="text-left">
                        <p className="font-bold text-sm text-foreground uppercase tracking-wider">{pack.name}</p>
                        <p className="text-xs text-muted-foreground">Leadership Level {pack.level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">₹{pack.dailyEarning?.toLocaleString()}/day</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button 
              onClick={handleViewPacks}
              variant="valentine"
              size="lg"
              className="w-full gap-2 uppercase tracking-wider"
            >
              View Leadership Plans
              <ArrowRight className="w-4 h-4" />
            </Button>
            
            <Button 
              onClick={handleClose}
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground uppercase tracking-wider"
            >
              Continue
            </Button>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-1 bg-primary" />
      </div>
    </div>
  );
};

export default LevelUpModal;
