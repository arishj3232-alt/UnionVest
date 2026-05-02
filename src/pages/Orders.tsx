import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, TrendingUp, Clock, CircleDollarSign, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { fetchPackEarningsDisplayTotal, fetchUserOrders, type OrderRow } from '@/services/ordersService';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useCallback } from 'react';
import { getAllPacks } from '@/data/packs';

type Order = OrderRow;
const PACK_NAME_BY_ID = new Map(getAllPacks().map((p) => [p.id, p.name]));

const getOrderDisplayEarned = (order: Order): number => {
  const settled = Number(order.earned_amount ?? 0);
  const maxRevenue = Number(order.max_revenue ?? 0);
  const daily = Number(order.daily_earning ?? 0);
  const purchasedAtMs = new Date(order.purchased_at).getTime();

  if (!Number.isFinite(purchasedAtMs) || maxRevenue <= 0 || daily <= 0) {
    return settled;
  }

  const elapsedSeconds = Math.max((Date.now() - purchasedAtMs) / 1000, 0);
  const accrued =
    elapsedSeconds < 86400
      ? daily
      : (elapsedSeconds / 86400) * daily;

  // Show the same live-accrual model as Dashboard, while never showing
  // less than already-settled order earnings.
  return Math.min(maxRevenue, Math.max(settled, accrued));
};

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const userId = isAuthenticated ? user?.authId ?? null : null;

  const { data: ordersData, isLoading } = useAsyncResource<Order[]>(
    useCallback(() => fetchUserOrders(userId!), [userId]),
    { key: userId ? `orders:${userId}` : null }
  );
  const { data: displayEarnings } = useAsyncResource<number>(
    useCallback(() => fetchPackEarningsDisplayTotal(userId!), [userId]),
    { key: userId ? `orders:display-earnings:${userId}` : null }
  );
  const orders = ordersData ?? [];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const normalizeStatus = (status: string) => {
    const s = status?.toLowerCase?.() ?? '';
    return s === 'completed' ? 'completed' : 'running';
  };
  const runningOrders = orders.filter(o => normalizeStatus(o.status) === 'running');
  const completedOrders = orders.filter(o => normalizeStatus(o.status) === 'completed');
  const liveOrdersEarned = orders.reduce((sum, o) => sum + getOrderDisplayEarned(o), 0);
  const totalEarned = displayEarnings ?? liveOrdersEarned;

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <RosePetals />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold uppercase tracking-wider">My Orders</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-valentine-warm/20 rounded-xl p-4 border border-valentine-warm/30 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-valentine-warm-dark" />
              <span className="text-sm text-muted-foreground">Active Plans</span>
            </div>
            <p className="text-2xl font-bold text-valentine-warm-dark">{runningOrders.length}</p>
          </div>
          <div className="bg-valentine-rose/10 rounded-xl p-4 border border-valentine-rose/30 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-1">
              <CircleDollarSign className="w-4 h-4 text-valentine-rose" />
              <span className="text-sm text-muted-foreground">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-valentine-rose">
              ₹{totalEarned.toLocaleString()}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-valentine-rose mx-auto mb-4 animate-sparkle" />
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : (
          <>
            {/* Running Orders */}
            {runningOrders.length > 0 && (
              <div className="mb-8">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="text-valentine-warm-dark">●</span>
                  Running Plans
                </h2>
                <div className="space-y-4">
                  {runningOrders.map((order, i) => (
                    <OrderCard key={order.id} order={order} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <div>
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="text-muted-foreground">●</span>
                  Completed Plans
                </h2>
                <div className="space-y-4">
                  {completedOrders.map((order, i) => (
                    <OrderCard key={order.id} order={order} index={i} completed />
                  ))}
                </div>
              </div>
            )}

            {orders.length === 0 && (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-muted-foreground">No Orders Yet</h3>
                <p className="text-muted-foreground mt-2">Start investing to see your orders here!</p>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

interface OrderCardProps {
  order: Order;
  index: number;
  completed?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, index, completed }) => {
  const displayEarned = getOrderDisplayEarned(order);
  const progress = (displayEarned / Number(order.max_revenue)) * 100;
  const displayPackName = PACK_NAME_BY_ID.get(order.pack_id) ?? order.pack_name;
  const categoryLabel =
    order.pack_category === 'silver'
      ? 'Worker Plan'
      : order.pack_category === 'gold'
        ? 'Leadership Plan'
        : 'Activity Plan';
  
  return (
    <div 
      className={cn(
        "bg-card rounded-2xl border p-4 transition-all duration-300 animate-fade-in",
        completed ? "border-border opacity-80" : "border-valentine-rose/30 shadow-valentine"
      )}
      style={{ animationDelay: `${0.2 + index * 0.1}s` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl text-primary">{order.pack_category === 'silver' ? '⚙' : '⚒'}</span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">{displayPackName}</p>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              order.pack_category === 'silver' 
                ? "bg-valentine-warm/20 text-valentine-warm-dark"
                : "bg-valentine-rose/10 text-valentine-rose"
            )}>
              {categoryLabel} - Level {order.pack_level}
            </span>
          </div>
        </div>
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          completed 
            ? "bg-muted text-muted-foreground"
            : "bg-valentine-warm/20 text-valentine-warm-dark"
        )}>
          {completed ? 'Completed' : 'Running'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Invested</p>
          <p className="font-semibold">₹{Number(order.invested_amount).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Earned</p>
          <p className="font-semibold text-valentine-warm-dark">₹{displayEarned.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Max Revenue</p>
          <p className="font-semibold text-valentine-rose">₹{Number(order.max_revenue).toLocaleString()}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress.toFixed(1)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Time remaining */}
      {!completed && (
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{order.days_remaining} days remaining</span>
        </div>
      )}
    </div>
  );
};

export default Orders;
