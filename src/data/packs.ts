import { VIPPack } from '@/types';

export const silverPacks: VIPPack[] = [
  { id: 'silver-1', name: 'Apprentice Tier', category: 'silver', level: 1, price: 1099, dailyEarning: 560, duration: 28, totalRevenue: 15680, isLocked: false },
  { id: 'silver-2', name: 'Worker Tier',     category: 'silver', level: 2, price: 1499, dailyEarning: 700, duration: 28, totalRevenue: 19600, isLocked: false },
  { id: 'silver-3', name: 'Craftsman Tier',  category: 'silver', level: 3, price: 2700, dailyEarning: 1000, duration: 28, totalRevenue: 28000, isLocked: false },
  { id: 'silver-4', name: 'Foreman Tier',    category: 'silver', level: 4, price: 3500, dailyEarning: 1500, duration: 28, totalRevenue: 42000, isLocked: false },
  { id: 'silver-5', name: 'Union Tier',      category: 'silver', level: 5, price: 3700, dailyEarning: 2200, duration: 28, totalRevenue: 61600, isLocked: false },
];

export const goldPacks: VIPPack[] = [
  { id: 'gold-1', name: 'Engineer Plan',  category: 'gold', level: 1, price: 5201, dailyEarning: 3500,  duration: 7, totalRevenue: 24500, isLocked: true, requiredLevel: 1 },
  { id: 'gold-2', name: 'Operator Plan',  category: 'gold', level: 2, price: 6001, dailyEarning: 4500,  duration: 7, totalRevenue: 31500, isLocked: true, requiredLevel: 2 },
  { id: 'gold-3', name: 'Supervisor Plan',category: 'gold', level: 3, price: 6800, dailyEarning: 7000,  duration: 7, totalRevenue: 49000, isLocked: true, requiredLevel: 3 },
  { id: 'gold-4', name: 'Director Plan',  category: 'gold', level: 4, price: 11500, dailyEarning: 15000, duration: 4, totalRevenue: 60000, isLocked: true, requiredLevel: 4 },
  { id: 'gold-5', name: 'Executive Plan', category: 'gold', level: 5, price: 14300, dailyEarning: 20000, duration: 4, totalRevenue: 80000, isLocked: true, requiredLevel: 5 },
];

export const activityPacks: VIPPack[] = [
  { id: 'activity-1', name: 'Solidarity Fund', category: 'activity', level: 1, price: 1300, dailyEarning: 3000, duration: 1, totalRevenue: 3000, isLocked: true },
];

export const getAllPacks = () => [...silverPacks, ...goldPacks, ...activityPacks];

export const getPacksByCategory = (category: 'silver' | 'gold' | 'activity') => {
  switch (category) {
    case 'silver': return silverPacks;
    case 'gold': return goldPacks;
    case 'activity': return activityPacks;
    default: return [];
  }
};

export const getPackById = (id: string) => getAllPacks().find(p => p.id === id);

export interface PackControlLite {
  pack_id: string;
  is_paused: boolean;
  daily_earning_override: number | null;
  duration_override?: number | null;
  price_override?: number | null;
  total_revenue_override?: number | null;
}

export const applyPackControls = (packs: VIPPack[], controls: PackControlLite[] = []): VIPPack[] => {
  const controlMap = new Map(controls.map((c) => [c.pack_id, c]));
  return packs.map((pack) => {
    const control = controlMap.get(pack.id);
    if (!control) return pack;
    const dailyEarning =
      control.daily_earning_override == null ? pack.dailyEarning : control.daily_earning_override;
    const duration =
      control.duration_override == null ? pack.duration : control.duration_override;
    const price =
      control.price_override == null ? pack.price : control.price_override;
    const totalRevenue =
      control.total_revenue_override == null ? dailyEarning * duration : control.total_revenue_override;
    return {
      ...pack,
      price,
      dailyEarning,
      duration,
      totalRevenue,
      isPaused: control.is_paused,
      isLocked: pack.isLocked || control.is_paused,
    };
  });
};
