import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, ArrowUpCircle, Settings, Hammer, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchHighestSilverLevel, purchasePack } from '@/services/ordersService';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import ParallaxWalletCard from '@/components/ParallaxWalletCard';
import PackCategorySwitch, { PackCategory } from '@/components/PackCategorySwitch';
import PackCard from '@/components/PackCard';
import ScrollReveal from '@/components/ScrollReveal';
import FloatingActionButton from '@/components/FloatingActionButton';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import PurchaseQuantityModal from '@/components/PurchaseQuantityModal';
import LevelUpModal from '@/components/LevelUpModal';
import UnlockProgress from '@/components/UnlockProgress';
import { DashboardSkeleton } from '@/components/skeletons';
import { getPacksByCategory } from '@/data/packs';
import { applyPackControls } from '@/data/packs';
import { VIPPack } from '@/types';
import { triggerValentineConfetti } from '@/utils/confetti';
import { getNewlyUnlockedPacks } from '@/utils/packUnlocks';
import { playSuccess, playError, playCoin } from '@/utils/soundEffects';
import { fetchPackControls } from '@/services/adminService';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshProfile, lastRealtimeEvent } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<PackCategory>('silver');
  const [purchaseModal, setPurchaseModal] = useState<{ isOpen: boolean; pack?: VIPPack }>({ isOpen: false });
  const [levelUpModal, setLevelUpModal] = useState<{ isOpen: boolean; newLevel: number; unlockedPacks: VIPPack[] }>({ isOpen: false, newLevel: 0, unlockedPacks: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [levelOverride, setLevelOverride] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  // Single, deduped, StrictMode-safe fetch of the user's highest silver
  // pack level. Module-level cache in useAsyncResource ensures the same
  // userId never hits the network twice on a given page load.
  const userId = user?.authId ?? null;
  const fetchLevel = useCallback(
    () => fetchHighestSilverLevel(userId!),
    [userId]
  );
  const { data: fetchedLevel, isLoading: isLevelLoading } = useAsyncResource<number>(
    fetchLevel,
    { key: userId ? `dashboard:silver-level:${userId}` : null }
  );
  const userHighestSilverLevel =
    levelOverride ?? fetchedLevel ?? 0;
  const isLoading = isLevelLoading;
  const { data: packControls } = useAsyncResource(
    useCallback(() => fetchPackControls(), []),
    { key: 'pack-controls:public' }
  );

  // Stable identity so memoized PackCard children don't re-render on every
  // Dashboard re-render. MUST be declared before any early return to keep
  // hook order stable (React error #310).
  const handleBuyPack = useCallback(
    (pack: VIPPack) => {
      if (!user) return;
      // Always open quantity modal — it handles insufficient-balance UI.
      setPurchaseModal({ isOpen: true, pack });
    },
    [user]
  );

  // React to realtime wallet credits (e.g. admin approved a recharge).
  // De-dupe by event timestamp so the toast only fires once per event.
  const lastEventAtRef = useRef<number>(0);
  useEffect(() => {
    if (!lastRealtimeEvent || lastRealtimeEvent.at === lastEventAtRef.current) return;
    lastEventAtRef.current = lastRealtimeEvent.at;
    if (lastRealtimeEvent.kind === 'wallet_credited') {
      playCoin();
      toast({
        title: 'Wallet credited',
        description: `+₹${lastRealtimeEvent.delta.toLocaleString('en-IN')} added to your wallet.`,
      });
    } else if (lastRealtimeEvent.kind === 'recharge_approved') {
      toast({
        title: 'Recharge approved',
        description: `Your ₹${lastRealtimeEvent.amount.toLocaleString('en-IN')} recharge was approved.`,
      });
    } else if (lastRealtimeEvent.kind === 'recharge_rejected') {
      toast({
        title: 'Recharge rejected',
        description: `Your ₹${lastRealtimeEvent.amount.toLocaleString('en-IN')} recharge was rejected.`,
        variant: 'destructive',
      });
    }
  }, [lastRealtimeEvent, toast]);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24 relative">
        <RosePetals />
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b-2 border-primary/40 px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
              <Hammer className="w-5 h-5 text-primary" strokeWidth={2.5} />
              UnionVest
            </h1>
          </div>
        </header>
        <DashboardSkeleton />
        <BottomNav />
      </div>
    );
  }

  const packs = applyPackControls(getPacksByCategory(activeCategory), packControls ?? []);

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <RosePetals />
      
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b-2 border-primary/40 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
            <Hammer className="w-5 h-5 text-primary" strokeWidth={2.5} />
            UnionVest
          </h1>
          <button onClick={() => navigate('/profile')} className="p-2 rounded-full hover:bg-muted transition-colors">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        <div className="mb-6"><ParallaxWalletCard /></div>

        <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Button variant="outline-rose" size="lg" onClick={() => navigate('/recharge')} className="flex-col h-auto py-4 uppercase tracking-wider">
            <ArrowDownCircle className="w-6 h-6 mb-1" /><span>Deposit</span>
          </Button>
          <Button variant="valentine" size="lg" onClick={() => navigate('/withdraw')} className="flex-col h-auto py-4 uppercase tracking-wider">
            <ArrowUpCircle className="w-6 h-6 mb-1" /><span>Withdraw</span>
          </Button>
        </div>

        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Wrench className="w-5 h-5 text-primary" />
            Worker Plans
          </h2>
          <PackCategorySwitch activeCategory={activeCategory} onChange={setActiveCategory} userLevel={userHighestSilverLevel} previousLevel={0} />
        </div>

        {activeCategory === 'silver' && (
          <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <UnlockProgress currentLevel={userHighestSilverLevel} />
          </div>
        )}

        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
          {activeCategory === 'activity' ? (
            <ScrollReveal variant="valentine">
              <div className="text-center py-12 bg-muted/50 rounded-md border border-border">
                <Wrench className="w-12 h-12 text-primary mx-auto mb-4" strokeWidth={2.5} />
                <h3 className="font-display text-xl font-bold text-foreground uppercase tracking-wider">Coming Soon</h3>
                <p className="text-muted-foreground text-sm mt-2">Solidarity Fund opens May 1st.</p>
              </div>
            </ScrollReveal>
          ) : (
            packs.map((pack, index) => (
              <ScrollReveal key={pack.id} index={index} variant="valentine" className="reveal-card">
                <PackCard pack={pack} userHighestSilverLevel={userHighestSilverLevel} onBuy={handleBuyPack} />
              </ScrollReveal>
            ))
          )}
        </div>
      </main>

      <FloatingActionButton />
      <BottomNav />

      <PurchaseQuantityModal
        isOpen={purchaseModal.isOpen}
        pack={purchaseModal.pack}
        walletBalance={user.balance}
        isProcessing={isProcessing}
        onClose={() => !isProcessing && setPurchaseModal({ isOpen: false })}
        onRecharge={() => { playError(); setPurchaseModal({ isOpen: false }); navigate('/recharge'); }}
        onConfirm={async (quantity) => {
          const purchasedPack = purchaseModal.pack;
          if (!purchasedPack) return;
          setIsProcessing(true);
          try {
            await purchasePack(purchasedPack.id, quantity);
            playCoin();
            if (purchasedPack.category === 'silver') {
              const newLevel = purchasedPack.level;
              const previousLevel = userHighestSilverLevel;
              const newlyUnlocked = getNewlyUnlockedPacks(previousLevel, newLevel);
              setLevelOverride(Math.max(userHighestSilverLevel, newLevel));
              if (newlyUnlocked.length > 0) {
                setLevelUpModal({ isOpen: true, newLevel, unlockedPacks: newlyUnlocked });
              } else { playSuccess(); triggerValentineConfetti(); }
            } else { playSuccess(); triggerValentineConfetti(); }
            await refreshProfile();
            toast({
              title: "Purchase Successful",
              description: quantity > 1
                ? `Activated ${quantity} × ${purchasedPack.name}.`
                : `You've activated ${purchasedPack.name}.`,
            });
            setPurchaseModal({ isOpen: false });
          } catch (err: unknown) {
            console.error('Purchase error:', err);
            playError();
            const message = err instanceof Error ? err.message : 'Something went wrong.';
            toast({ title: "Purchase Failed", description: message, variant: "destructive" });
          } finally { setIsProcessing(false); }
        }}
      />

      <LevelUpModal
        isOpen={levelUpModal.isOpen}
        onClose={() => setLevelUpModal({ isOpen: false, newLevel: 0, unlockedPacks: [] })}
        newLevel={levelUpModal.newLevel}
        unlockedPacks={levelUpModal.unlockedPacks}
        onViewPacks={() => setActiveCategory('gold')}
      />
    </div>
  );
};

export default Dashboard;
