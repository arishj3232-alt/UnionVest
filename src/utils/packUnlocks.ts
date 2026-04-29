import { goldPacks } from '@/data/packs';

/**
 * Calculate the number of newly unlocked gold packs based on the user's silver level
 */
export const getUnlockedPacksCount = (userLevel: number): number => {
  return goldPacks.filter(pack => pack.requiredLevel && pack.requiredLevel <= userLevel).length;
};

/**
 * Get the count of packs that would be unlocked if user reaches a specific level
 */
export const getNewUnlocksAtLevel = (currentLevel: number, targetLevel: number): number => {
  const currentUnlocks = getUnlockedPacksCount(currentLevel);
  const targetUnlocks = getUnlockedPacksCount(targetLevel);
  return targetUnlocks - currentUnlocks;
};

/**
 * Get the names of newly unlocked packs at a specific level
 */
export const getNewlyUnlockedPacks = (previousLevel: number, newLevel: number) => {
  return goldPacks.filter(
    pack => pack.requiredLevel && 
    pack.requiredLevel > previousLevel && 
    pack.requiredLevel <= newLevel
  );
};
