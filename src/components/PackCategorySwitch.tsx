import React from 'react';
import { Wrench, Hammer, Lock, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PackCategory = 'silver' | 'gold' | 'activity';

interface PackCategorySwitchProps {
  activeCategory: PackCategory;
  onChange: (category: PackCategory) => void;
  userLevel?: number;
  previousLevel?: number;
}

const categories = [
  {
    id: 'silver' as PackCategory,
    label: 'Worker',
    Icon: Wrench,
    activeBg: 'bg-foreground',
    activeText: 'text-background',
    description: 'Build steady',
  },
  {
    id: 'gold' as PackCategory,
    label: 'Leadership',
    Icon: Hammer,
    activeBg: 'bg-primary',
    activeText: 'text-primary-foreground',
    description: 'High returns',
  },
  {
    id: 'activity' as PackCategory,
    label: 'Solidarity',
    Icon: Cog,
    activeBg: 'bg-muted',
    activeText: 'text-foreground',
    description: 'Coming Soon',
    locked: true,
  },
];

const PackCategorySwitch: React.FC<PackCategorySwitchProps> = ({ 
  activeCategory, 
  onChange, 
  userLevel = 0,
  previousLevel = 0 
}) => {
  void userLevel;
  void previousLevel;

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2 p-2 bg-card rounded-md shadow-card border border-border">
        {categories.map((category, index) => {
          const isActive = activeCategory === category.id;
          const isLocked = category.locked;
          const Icon = category.Icon;
          
          return (
            <button
              key={category.id}
              onClick={() => !isLocked && onChange(category.id)}
              disabled={isLocked}
              className={cn(
                "relative flex flex-col items-center justify-center p-3 rounded-md transition-colors duration-200 border",
                "min-h-[80px]",
                isActive && !isLocked && `${category.activeBg} border-transparent shadow-md`,
                !isActive && !isLocked && "bg-card border-border hover:bg-secondary",
                isLocked && "opacity-70 cursor-not-allowed bg-muted border-dashed border-border"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Icon
                className={cn(
                  "w-6 h-6 mb-1",
                  isActive && !isLocked ? category.activeText : isLocked ? "text-muted-foreground" : "text-foreground"
                )}
                strokeWidth={2.25}
              />
              
              <span className={cn(
                "text-xs font-bold text-center leading-tight uppercase tracking-wider",
                isActive && !isLocked ? category.activeText : isLocked ? "text-muted-foreground" : "text-foreground"
              )}>
                {category.label}
              </span>
              
              {isLocked ? (
                <span className="flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Lock className="w-2.5 h-2.5" />
                  Coming Soon
                </span>
              ) : (
                <span className={cn(
                  "text-[10px] mt-0.5",
                  isActive ? `${category.activeText} opacity-70` : "text-muted-foreground"
                )}>
                  {category.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PackCategorySwitch;
