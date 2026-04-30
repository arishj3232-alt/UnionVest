import React, { useState, useEffect } from 'react';
import { Lock, TrendingUp, Clock, Coins, Calendar, Wrench } from 'lucide-react';
import { VIPPack } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Silver pack images
import packSilver1 from '@/assets/pack-silver-1.png';
import packSilver2 from '@/assets/pack-silver-2.png';
import packSilver3 from '@/assets/pack-silver-3.png';
import packSilver4 from '@/assets/pack-silver-4.png';
import packSilver5 from '@/assets/pack-silver-5.png';

// Gold pack images
import packGold1 from '@/assets/pack-gold-1.png';
import packGold2 from '@/assets/pack-gold-2.png';
import packGold3 from '@/assets/pack-gold-3.png';
import packGold4 from '@/assets/pack-gold-4.png';
import packGold5 from '@/assets/pack-gold-5.png';

// Activity pack images
import packActivity1 from '@/assets/pack-activity-1.png';

const packImages: Record<string, string> = {
  'silver-1': packSilver1,
  'silver-2': packSilver2,
  'silver-3': packSilver3,
  'silver-4': packSilver4,
  'silver-5': packSilver5,
  'gold-1': packGold1,
  'gold-2': packGold2,
  'gold-3': packGold3,
  'gold-4': packGold4,
  'gold-5': packGold5,
  'activity-1': packActivity1,
};

// Countdown to International Workers' Day (May 1, 2026)
const getHoliCountdown = () => {
  const holiDay = new Date('2026-05-01T00:00:00');
  const now = new Date();
  const diff = holiDay.getTime() - now.getTime();
  
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds };
};

interface PackCardProps {
  pack: VIPPack;
  userHighestSilverLevel?: number;
  onBuy: (pack: VIPPack) => void;
}

const PackCardImpl: React.FC<PackCardProps> = ({ pack, userHighestSilverLevel = 0, onBuy }) => {
  const [countdown, setCountdown] = useState(getHoliCountdown());
  const isGoldLocked = pack.category === 'gold' && pack.requiredLevel && pack.requiredLevel > userHighestSilverLevel;
  const isActivityLocked = pack.category === 'activity';
  const isPaused = !!pack.isPaused;
  const isLocked = isGoldLocked || isActivityLocked || isPaused;

  useEffect(() => {
    if (!isActivityLocked) return;
    const timer = setInterval(() => {
      setCountdown(getHoliCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, [isActivityLocked]);

  const categoryStyles = {
    silver: {
      gradient: 'from-card to-card',
      border: 'border-border',
      badge: 'bg-foreground text-background',
      label: 'Worker Plan',
    },
    gold: {
      gradient: 'from-card to-card',
      border: 'border-primary/60',
      badge: 'bg-primary text-primary-foreground',
      label: 'Leadership Plan',
    },
    activity: {
      gradient: 'from-card to-card',
      border: 'border-foreground/40',
      badge: 'bg-foreground text-background',
      label: 'Solidarity Fund',
    },
  };

  const style = categoryStyles[pack.category];
  const packImage = packImages[pack.id] || packSilver1;

  const CardContent = (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 bg-card",
      `bg-gradient-to-br ${style.gradient} ${style.border}`,
      isLocked ? "" : "hover:shadow-valentine hover:scale-[1.02]"
    )}>
      {isLocked && <div className="shimmer-overlay" />}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <img 
            src={packImage} 
            alt={pack.name}
            className="w-14 h-14 rounded-xl object-cover shadow-md"
          />
          <div>
            <p className="font-semibold text-sm text-foreground">{pack.name}</p>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              style.badge
            )}>
              {style.label} - Level {pack.level}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-display text-foreground">₹{pack.price.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-valentine-rose" />
            Daily Earning
          </span>
          <span className="font-semibold text-valentine-rose-dark">₹{pack.dailyEarning.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4 text-valentine-blush-dark" />
            Duration
          </span>
          <span className="font-semibold text-foreground">{pack.duration} Days</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Coins className="w-4 h-4 text-valentine-rose" />
            Total Revenue
          </span>
          <span className="font-bold text-valentine-rose">₹{pack.totalRevenue.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Max Quantity</span>
          <span className="font-semibold text-foreground">
            {pack.maxQuantity ?? 50}
          </span>
        </div>
      </div>

      {isActivityLocked && (
        <div className="mb-4 p-3 bg-primary/5 rounded-md border border-primary/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Labour Day Countdown</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-card rounded-lg p-2 shadow-sm">
              <p className="text-xl font-bold font-display text-valentine-rose">{countdown.days}</p>
              <p className="text-[10px] text-muted-foreground">Days</p>
            </div>
            <div className="bg-card rounded-lg p-2 shadow-sm">
              <p className="text-xl font-bold font-display text-valentine-rose">{countdown.hours}</p>
              <p className="text-[10px] text-muted-foreground">Hours</p>
            </div>
            <div className="bg-card rounded-lg p-2 shadow-sm">
              <p className="text-xl font-bold font-display text-valentine-rose">{countdown.minutes}</p>
              <p className="text-[10px] text-muted-foreground">Mins</p>
            </div>
            <div className="bg-card rounded-lg p-2 shadow-sm">
              <p className="text-xl font-bold font-display text-valentine-rose">{countdown.seconds}</p>
              <p className="text-[10px] text-muted-foreground">Secs</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {isLocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 backdrop-blur-[1px] rounded-xl">
            <Lock className="w-5 h-5 text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground text-center px-2 font-medium uppercase tracking-wider">
              {isActivityLocked
                ? "Unlocks May 1st"
                : isPaused
                ? "Paused by admin"
                : `Unlock at Worker Level ${pack.requiredLevel}`
              }
            </p>
          </div>
        )}
        <Button
          onClick={() => onBuy(pack)}
          disabled={isLocked}
          variant={pack.category === 'gold' ? 'valentine' : 'valentine'}
          className="w-full uppercase tracking-wider"
        >
          {isLocked ? 'Locked' : 'Activate Plan'}
        </Button>
      </div>
    </div>
  );

  if (isActivityLocked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-pointer">
            {CardContent}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-foreground text-background border-foreground max-w-xs"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <p className="font-bold uppercase tracking-wider">Opens May 1st, 2026</p>
          </div>
          <p className="text-sm mt-1">The Solidarity Fund opens on International Workers' Day.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return CardContent;
};

/**
 * Memoized to avoid re-rendering every card when an unrelated piece of
 * Dashboard state (e.g. modal open/close) changes. The card only depends
 * on `pack`, `userHighestSilverLevel`, and the stable `onBuy` callback.
 */
const PackCard = React.memo(PackCardImpl);
export default PackCard;
