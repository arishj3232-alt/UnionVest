import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchMyWalletHistory } from '@/services/walletHistoryService';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import { cn } from '@/lib/utils';

const WalletHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.authId ?? null : null;

  React.useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const { data: rows, isLoading, error } = useAsyncResource(
    React.useCallback(() => fetchMyWalletHistory(userId!, 100), [userId]),
    { key: userId ? `wallet-history:${userId}` : null }
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <RosePetals />

      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold uppercase tracking-wider">Wallet History</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading wallet history...</div>
        ) : error ? (
          <div className="text-sm text-destructive">{error.message}</div>
        ) : (rows ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No wallet history yet.
          </div>
        ) : (
          <div className="space-y-3">
            {(rows ?? []).map((row) => (
              <div key={row.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={cn("font-semibold", row.delta >= 0 ? "text-green-600" : "text-destructive")}>
                      {row.delta >= 0 ? '+' : ''}₹{row.delta.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ₹{row.balance_before.toLocaleString('en-IN')} → ₹{row.balance_after.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="inline-flex items-center gap-1">
                      <Clock3 className="w-3 h-3" />
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                {(row.note ?? '').trim() && (
                  <p className="mt-2 text-xs text-muted-foreground break-words">
                    Note: <span className="font-medium">{row.note}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default WalletHistory;
