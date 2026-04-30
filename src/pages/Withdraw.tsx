import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, CreditCard, Building, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchPublicAppSettings } from '@/services/appSettingsService';
import { createWithdrawRequest, fetchWithdrawHistory } from '@/services/withdrawService';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';

const TAX_RATE = 0.05; // 5% tax
const MIN_WITHDRAWAL = 800;

type WithdrawHistoryRow = {
  id: string;
  amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
};

const Withdraw: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: appSettings } = useAsyncResource(fetchPublicAppSettings, { key: 'withdraw:public-app-settings' });
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountName: '',
  });
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const userId = isAuthenticated ? user?.authId ?? null : null;
  const { data: withdrawHistoryData } = useAsyncResource<WithdrawHistoryRow[]>(
    React.useCallback(() => fetchWithdrawHistory(userId!), [userId]),
    { key: userId ? `withdraw-history:${userId}` : null }
  );
  const withdrawHistory = withdrawHistoryData ?? [];

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const taxAmount = parsedAmount * TAX_RATE;
  const netAmount = parsedAmount - taxAmount;

  const timeWindow = useMemo(() => {
    const start = appSettings?.withdrawStartTime ?? '10:00';
    const end = appSettings?.withdrawEndTime ?? '16:00';
    return { start, end };
  }, [appSettings?.withdrawEndTime, appSettings?.withdrawStartTime]);

  const parseHHMM = (hhmm: string) => {
    const m = hhmm.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  };

  const getIstMinutes = () => {
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return hour * 60 + minute;
  };

  const [istNowMinutes, setIstNowMinutes] = useState(() => getIstMinutes());
  useEffect(() => {
    const t = setInterval(() => setIstNowMinutes(getIstMinutes()), 30_000);
    return () => clearInterval(t);
  }, []);

  const startMin = parseHHMM(timeWindow.start);
  const endMin = parseHHMM(timeWindow.end);
  const isWithinWithdrawHours = startMin < endMin ? istNowMinutes >= startMin && istNowMinutes <= endMin : true;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const details =
        paymentMethod === 'upi'
          ? { upiId: upiId.trim() }
          : {
              accountNumber: bankDetails.accountNumber.trim(),
              ifscCode: bankDetails.ifscCode.trim(),
              accountName: bankDetails.accountName.trim(),
            };
      await createWithdrawRequest({
        amount: parsedAmount,
        method: paymentMethod,
        details,
      });
      setModal({
        isOpen: true,
        title: 'Withdrawal Requested',
        message: `Your withdraw request of ₹${netAmount.toFixed(2)} (net) has been submitted. Amount is held until admin processes it.`,
        type: 'success',
      });
      setAmount('');
      setUpiId('');
      setBankDetails({ accountNumber: '', ifscCode: '', accountName: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidate = () => {
    if (parsedAmount < MIN_WITHDRAWAL) {
      setModal({
        isOpen: true,
        title: 'Minimum Amount Required',
        message: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.`,
        type: 'error'
      });
      return;
    }

    if (parsedAmount > user.balance) {
      setModal({
        isOpen: true,
        title: 'Insufficient Balance',
        message: `Your available balance is ₹${user.balance.toLocaleString()}.`,
        type: 'error'
      });
      return;
    }

    if (paymentMethod === 'upi' && !upiId) {
      setModal({
        isOpen: true,
        title: 'UPI ID Required',
        message: 'Please enter your UPI ID.',
        type: 'error'
      });
      return;
    }

    if (paymentMethod === 'bank' && (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountName)) {
      setModal({
        isOpen: true,
        title: 'Bank Details Required',
        message: 'Please fill in all bank details.',
        type: 'error'
      });
      return;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <RosePetals />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold uppercase tracking-wider">Withdraw</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        {/* Balance Card */}
        <div className="bg-card border border-border rounded-md p-6 mb-6 animate-fade-in border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground uppercase tracking-wider text-xs font-bold">Available Balance</span>
          </div>
          <p className="text-4xl font-bold font-display text-foreground">
            ₹{user.balance.toLocaleString()}
          </p>
        </div>

        {/* Amount Input */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <label className="font-semibold mb-2 block">Withdrawal Amount</label>
          <Input
            type="number"
            placeholder={`Minimum ₹${MIN_WITHDRAWAL}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={MIN_WITHDRAWAL}
            max={user.balance}
          />
          
          {parsedAmount > 0 && (
            <div className="mt-4 bg-muted rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span>₹{parsedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (5%)</span>
                <span className="text-destructive">-₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>You'll receive</span>
                <span className="text-valentine-warm-dark">₹{netAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <label className="font-semibold mb-3 block">Payment Method</label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setPaymentMethod('upi')}
              className={cn(
                "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                paymentMethod === 'upi'
                  ? "border-valentine-rose bg-valentine-rose/10"
                  : "border-border hover:border-valentine-rose/50"
              )}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">UPI</span>
            </button>
            <button
              onClick={() => setPaymentMethod('bank')}
              className={cn(
                "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                paymentMethod === 'bank'
                  ? "border-valentine-rose bg-valentine-rose/10"
                  : "border-border hover:border-valentine-rose/50"
              )}
            >
              <Building className="w-5 h-5" />
              <span className="font-medium">Bank</span>
            </button>
          </div>

          {paymentMethod === 'upi' ? (
            <Input
              placeholder="Enter UPI ID (e.g., name@upi)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          ) : (
            <div className="space-y-3">
              <Input
                placeholder="Account Number"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
              />
              <Input
                placeholder="IFSC Code"
                value={bankDetails.ifscCode}
                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
              />
              <Input
                placeholder="Account Holder Name"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Withdraw timings</p>
          <p className="text-xs text-muted-foreground mt-1">
            Withdraw is available from <span className="font-semibold">{timeWindow.start}</span> to{' '}
            <span className="font-semibold">{timeWindow.end}</span> (IST).
          </p>
          {!isWithinWithdrawHours && (
            <p className="text-xs text-destructive mt-2">
              Withdraw is closed right now. Please try during the allowed timings.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          variant="rose"
          size="xl"
          className="w-full mb-8"
          onClick={() => {
            if (!isWithinWithdrawHours) {
              setModal({
                isOpen: true,
                title: 'Withdraw Closed',
                message: `Withdraw is available from ${timeWindow.start} to ${timeWindow.end} (IST).`,
                type: 'info',
              });
              return;
            }
            handleValidate();
            if (
              parsedAmount >= MIN_WITHDRAWAL &&
              parsedAmount <= user.balance &&
              ((paymentMethod === 'upi' && !!upiId) ||
                (paymentMethod === 'bank' &&
                  !!bankDetails.accountNumber &&
                  !!bankDetails.ifscCode &&
                  !!bankDetails.accountName))
            ) {
              handleSubmit();
            }
          }}
          disabled={isSubmitting || !isWithinWithdrawHours || parsedAmount < MIN_WITHDRAWAL}
        >
          {isSubmitting ? (
            <>
              <Sparkles className="w-4 h-4 animate-sparkle" />
              Submitting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Request Withdrawal
            </>
          )}
        </Button>

        {/* Withdrawal History */}
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-valentine-rose" />
            Recent Withdrawals
          </h3>
          
          {withdrawHistory.length > 0 ? (
            <div className="space-y-2">
              {withdrawHistory.map((item) => (
                <div key={item.id} className="bg-card rounded-xl p-4 border border-border flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">₹{Number(item.net_amount).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                    {item.status !== 'pending' && item.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        Note: {item.admin_notes}
                      </p>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-3 py-1 rounded-full",
                    item.status === 'approved' && "bg-valentine-warm/20 text-valentine-warm-dark",
                    item.status === 'pending' && "bg-valentine-rose/10 text-valentine-rose",
                    (item.status === 'rejected' || item.status === 'cancelled') && "bg-destructive/10 text-destructive"
                  )}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground text-sm">No withdrawals yet</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default Withdraw;
