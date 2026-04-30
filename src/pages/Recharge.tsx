import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Upload, Check, Clock, Lock, Timer, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import paymentQR from '@/assets/payment-qr.png';
import { goldPacks, silverPacks } from '@/data/packs';
import { Input } from '@/components/ui/input';
import { paymentDetails } from '@/config/paymentDetails';
import QRCode from 'react-qr-code';
import {
  fetchRechargeHistory,
  uploadPaymentScreenshot,
  createRechargeRequest,
  type RechargeTransaction,
} from '@/services/rechargeService';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useToast } from '@/hooks/use-toast';
import { buildUpiPayUri, getDirectPayAppOptions, makeUpiNote, type UpiApp } from '@/utils/upiUri';
import { fetchPublicAppSettings } from '@/services/appSettingsService';

const workerPlanOptions = silverPacks.map((pack) => ({
  id: pack.id,
  level: pack.level,
  name: `Pack ${pack.level}`,
  label: pack.name,
  price: pack.price,
}));

const leadershipPlanOptions = goldPacks.map((pack) => ({
  id: pack.id,
  level: pack.level,
  name: `Level ${pack.level}`,
  label: pack.name,
  price: pack.price,
}));

// International Workers' Day countdown target: 01/05/2026
const VALENTINE_FUND_TARGET = new Date('2026-05-01T00:00:00').getTime();
const UPI_SCAN_LIMIT = 2000;
const DIRECT_PAY_SPLIT_LIMIT = 2000;
const UPI_MAX_TOTAL = 9500;

const useCountdown = (targetDate: number) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

const Recharge: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedWorkerPlan, setSelectedWorkerPlan] = useState<string | null>(null);
  const [selectedLeadershipPlan, setSelectedLeadershipPlan] = useState<string | null>(null);
  const [qrMode, setQrMode] = useState<'static' | 'dynamic' | 'direct'>('static');
  const [paymentMethodAboveLimit, setPaymentMethodAboveLimit] = useState<'direct' | 'usdt'>('direct');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAmountLocked, setIsAmountLocked] = useState(false);
  const [showDirectPayFallback, setShowDirectPayFallback] = useState(false);
  const [lastDirectPayApp, setLastDirectPayApp] = useState<UpiApp | null>(null);
  // Local prepend buffer for newly-submitted requests so the UI updates
  // without re-fetching the full history.
  const [historyOverrides, setHistoryOverrides] = useState<RechargeTransaction[]>([]);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const countdown = useCountdown(VALENTINE_FUND_TARGET);
  const selectedWorker = workerPlanOptions.find(p => p.id === selectedWorkerPlan);
  const selectedLeadership = leadershipPlanOptions.find(p => p.id === selectedLeadershipPlan);
  const amount = (selectedWorker?.price ?? 0) + (selectedLeadership?.price ?? 0);
  const isLevelMismatch = !!selectedWorker && !!selectedLeadership && selectedWorker.level !== selectedLeadership.level;
  const [hasShownMismatchToast, setHasShownMismatchToast] = useState(false);
  const exceedsUpiMaxTotal = amount > UPI_MAX_TOTAL;

  type ProofSlot = {
    amount: number;
    note: string; // tn
    utr: string; // optional user-entered ref
    screenshotFile: File | null;
    preview: string | null;
  };
  const [proofSlots, setProofSlots] = useState<ProofSlot[]>([]);

  const splitForNormalQr = (total: number) => {
    const chunks: number[] = [];
    let remaining = total;
    while (remaining > 0) {
      const next = Math.min(UPI_SCAN_LIMIT, remaining);
      chunks.push(next);
      remaining -= next;
    }
    return chunks;
  };

  const splitForDirectPay = (total: number) => {
    const chunks: number[] = [];
    let remaining = total;
    while (remaining > 0) {
      const next = Math.min(DIRECT_PAY_SPLIT_LIMIT, remaining);
      chunks.push(next);
      remaining -= next;
    }
    return chunks;
  };

  const groupedProofSlots = React.useMemo(() => {
    const groups: Array<{ amount: number; count: number; note: string; indices: number[] }> = [];
    proofSlots.forEach((slot, idx) => {
      const existing = groups.find((g) => g.amount === slot.amount);
      if (existing) {
        existing.count += 1;
        existing.indices.push(idx);
      } else {
        groups.push({ amount: slot.amount, count: 1, note: slot.note, indices: [idx] });
      }
    });
    return groups;
  }, [proofSlots]);

  const handleGroupedScreenshotUpload = (slotIndices: number[], files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).slice(0, slotIndices.length);
    for (const file of selected) {
      if (file.size > 5 * 1024 * 1024) {
        setModal({ isOpen: true, title: 'File Too Large', message: 'Please upload images smaller than 5MB.', type: 'error' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setModal({ isOpen: true, title: 'Invalid File Type', message: 'Please upload image files only.', type: 'error' });
        return;
      }
    }

    // Clear old files for this amount group first.
    setProofSlots((prev) =>
      prev.map((slot, idx) =>
        slotIndices.includes(idx) ? { ...slot, screenshotFile: null, preview: null } : slot
      )
    );

    selected.forEach((file, i) => {
      const targetIndex = slotIndices[i];
      if (targetIndex === undefined) return;
      const reader = new FileReader();
      reader.onload = () => {
        setProofSlots((prev) =>
          prev.map((slot, idx) =>
            idx === targetIndex ? { ...slot, screenshotFile: file, preview: reader.result as string } : slot
          )
        );
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (!selectedWorker || !selectedLeadership) return;
    const last4 = user?.phone?.slice(-4) ?? '0000';
    if (exceedsUpiMaxTotal) {
      if (paymentMethodAboveLimit === 'direct') {
        const chunks = splitForDirectPay(amount);
        setProofSlots(
          chunks.map((chunk, idx) => ({
            amount: chunk,
            note: makeUpiNote(`UV-${last4}-D${idx + 1}`),
            utr: '',
            screenshotFile: null,
            preview: null,
          }))
        );
      } else {
        setProofSlots([
          {
            amount,
            note: makeUpiNote(`UV-${last4}-U1`),
            utr: '',
            screenshotFile: null,
            preview: null,
          },
        ]);
      }
      return;
    }
    if (!exceedsUpiMaxTotal && qrMode === 'static') {
      const chunks = splitForNormalQr(amount);
      setProofSlots(
        chunks.map((chunk, idx) => ({
          amount: chunk,
          note: makeUpiNote(`UV-${last4}-${idx + 1}`),
          utr: '',
          screenshotFile: null,
          preview: null,
        }))
      );
      return;
    }
    setProofSlots([
      {
        amount,
        note: makeUpiNote(`UV-${last4}-A`),
        utr: '',
        screenshotFile: null,
        preview: null,
      },
    ]);
  }, [amount, exceedsUpiMaxTotal, paymentMethodAboveLimit, qrMode, selectedLeadership, selectedWorker, user?.phone]);

  // StrictMode-safe single fetch of recharge history.
  const userId = isAuthenticated ? user?.authId ?? null : null;
  const { data: historyData, isLoading } = useAsyncResource<RechargeTransaction[]>(
    useCallback(() => fetchRechargeHistory(userId!), [userId]),
    { key: userId ? `recharge-history:${userId}` : null }
  );
  const { data: appSettings } = useAsyncResource(fetchPublicAppSettings, {
    key: 'recharge:public-app-settings',
  });
  const rechargeHistory = [...historyOverrides, ...(historyData ?? [])];
  const effectiveUpiVpa = appSettings?.upiVpa?.trim() || paymentDetails.upi?.vpa || '';
  const directPayAmount = amount;
  const directPayNote = makeUpiNote(`UV-${user?.phone?.slice(-4) ?? '0000'}-A`);
  const directPayOptions = effectiveUpiVpa
    ? getDirectPayAppOptions({
        vpa: effectiveUpiVpa,
        payeeName: paymentDetails.upi?.payeeName,
        amount: directPayAmount,
        note: directPayNote,
      })
    : [];

  const copyText = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: 'Copy failed', description: 'Please copy manually.', variant: 'destructive' });
    }
  }, [toast]);

  const isLikelyMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const appBrandClasses: Record<UpiApp, string> = {
    gpay: 'from-blue-500 to-green-500',
    phonepe: 'from-violet-600 to-fuchsia-600',
    paytm: 'from-sky-500 to-cyan-500',
  };
  const appLogoText: Record<UpiApp, string> = {
    gpay: 'G',
    phonepe: 'P',
    paytm: 'Paytm',
  };

  const openDirectPay = (app: UpiApp, override?: { amount: number; note: string }) => {
    const paymentAmount = override?.amount ?? directPayAmount;
    const paymentNote = override?.note ?? directPayNote;
    if (!effectiveUpiVpa || paymentAmount <= 0) {
      toast({ title: 'UPI details missing', description: 'Please configure UPI ID first.', variant: 'destructive' });
      return;
    }
    const option = getDirectPayAppOptions({
      vpa: effectiveUpiVpa,
      payeeName: paymentDetails.upi?.payeeName,
      amount: paymentAmount,
      note: paymentNote,
    }).find((o) => o.id === app);
    if (!option) return;

    setLastDirectPayApp(app);
    setShowDirectPayFallback(false);

    // Custom app URI schemes generally do not work on desktop browsers.
    // Avoid repeated "scheme does not have a registered handler" errors.
    if (!isLikelyMobileDevice) {
      setShowDirectPayFallback(true);
      toast({
        title: 'Direct app launch unavailable',
        description: 'Use the fallback options below or scan QR from your phone.',
      });
      return;
    }

    const hiddenBefore = document.hidden;
    window.location.href = option.uri;

    window.setTimeout(() => {
      // If tab is still visible, app likely did not open.
      if (!hiddenBefore && !document.hidden) {
        setShowDirectPayFallback(true);
      }
    }, 1200);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!selectedWorker || !selectedLeadership) {
      setHasShownMismatchToast(false);
      return;
    }
    if (isLevelMismatch && !hasShownMismatchToast) {
      toast({
        title: 'Recommended plan matching',
        description: 'Recommended: Match same level for best returns.',
      });
      setHasShownMismatchToast(true);
    }
    if (!isLevelMismatch) {
      setHasShownMismatchToast(false);
    }
  }, [hasShownMismatchToast, isLevelMismatch, selectedLeadership, selectedWorker, toast]);

  if (!user) return null;

  const handleWorkerPlanSelect = (packId: string) => {
    if (isAmountLocked) return;
    setSelectedWorkerPlan(packId);
  };

  const handleLeadershipPlanSelect = (packId: string) => {
    if (isAmountLocked) return;
    setSelectedLeadershipPlan(packId);
  };

  const handleLockAmount = () => {
    if (!selectedWorkerPlan) {
      setModal({
        isOpen: true,
        title: 'Worker Plan Required',
        message: 'Please select a Worker Plan.',
        type: 'error',
      });
      return;
    }
    if (!selectedLeadershipPlan) {
      setModal({
        isOpen: true,
        title: 'Leadership Plan Required',
        message: 'Please select a Leadership Plan.',
        type: 'error',
      });
      return;
    }
    setIsAmountLocked(true);
  };

  const handleUnlockAmount = () => {
    setIsAmountLocked(false);
  };

  const handleScreenshotUploadForSlot = (slotIndex: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setModal({ isOpen: true, title: 'File Too Large', message: 'Please upload an image smaller than 5MB.', type: 'error' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setModal({ isOpen: true, title: 'Invalid File Type', message: 'Please upload an image file.', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProofSlots((prev) =>
        prev.map((s, i) => (i === slotIndex ? { ...s, screenshotFile: file, preview: reader.result as string } : s))
      );
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const missing = proofSlots.findIndex((s) => !s.screenshotFile);
    if (missing !== -1) {
      setModal({ isOpen: true, title: 'Screenshot Required', message: 'Please upload all payment screenshots to proceed.', type: 'error' });
      return;
    }

    // Validate amount and mandatory plan selection.
    if (!selectedWorker || !selectedLeadership) {
      setModal({
        isOpen: true,
        title: 'Plan Selection Required',
        message: !selectedWorker
          ? 'Please select a Worker Plan.'
          : 'Please select a Leadership Plan.',
        type: 'error'
      });
      return;
    }
    if (amount <= 0 || amount > 10000000) {
      setModal({
        isOpen: true,
        title: 'Invalid Amount',
        message: 'Please select a valid package.',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!user) throw new Error('Not authenticated');
      const uploaded = await Promise.all(
        proofSlots.map(async (slot) => ({
          amount: slot.amount,
          utr: slot.utr.trim() || null,
          note: slot.note,
          screenshot_url: await uploadPaymentScreenshot(user.authId, slot.screenshotFile!, slot.note),
        }))
      );
      const tx = await createRechargeRequest(
        user.authId,
        amount,
        uploaded.map((u) => ({
          method: exceedsUpiMaxTotal ? paymentMethodAboveLimit : 'upi_qr',
          amount: u.amount,
          screenshot_url: u.screenshot_url,
          reference: u.utr ? `${u.note}|${u.utr}` : u.note,
        }))
      );
      setHistoryOverrides((prev) => [tx, ...prev]);
    
      setModal({
        isOpen: true,
        title: 'Deposit Request Submitted',
        message: `Your recharge of ₹${amount.toLocaleString()} (${selectedWorker.name} + ${selectedLeadership.name}) is pending approval.`,
        type: 'success'
      });
      
      setProofSlots((prev) => prev.map((s) => ({ ...s, screenshotFile: null, preview: null, utr: '' })));
      setIsAmountLocked(false);
    } catch (error) {
      console.error('Error submitting recharge:', error);
      setModal({
        isOpen: true,
        title: 'Submission Failed',
        message: 'Failed to submit recharge request. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <h1 className="font-display text-xl font-bold uppercase tracking-wider">Deposit</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        {/* Solidarity Fund Timer */}
        <div className="mb-6 bg-primary rounded-md p-4 animate-fade-in border-l-4 border-foreground">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Timer className="w-5 h-5 text-primary-foreground" />
            <h3 className="font-bold text-primary-foreground uppercase tracking-wider">Solidarity Fund · May 1, 2026</h3>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-card/20 backdrop-blur rounded-xl p-2">
              <p className="text-2xl font-bold text-valentine-blush-light">{countdown.days}</p>
              <p className="text-xs text-primary-foreground/70">Days</p>
            </div>
            <div className="bg-card/20 backdrop-blur rounded-xl p-2">
              <p className="text-2xl font-bold text-valentine-blush-light">{countdown.hours}</p>
              <p className="text-xs text-primary-foreground/70">Hours</p>
            </div>
            <div className="bg-card/20 backdrop-blur rounded-xl p-2">
              <p className="text-2xl font-bold text-valentine-blush-light">{countdown.minutes}</p>
              <p className="text-xs text-primary-foreground/70">Minutes</p>
            </div>
            <div className="bg-card/20 backdrop-blur rounded-xl p-2">
              <p className="text-2xl font-bold text-valentine-blush-light">{countdown.seconds}</p>
              <p className="text-xs text-primary-foreground/70">Seconds</p>
            </div>
          </div>
        </div>

        {/* Worker Plan Selection */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Step 1: Select Worker Plan</h2>
            {isAmountLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlockAmount}
                className="text-xs gap-1"
              >
                <Lock className="w-3 h-3" />
                Change Package
              </Button>
            )}
          </div>
          <div className={cn(
            "grid grid-cols-2 gap-3 transition-all duration-300",
            isAmountLocked && "opacity-50 pointer-events-none"
          )}>
            {workerPlanOptions.map((pack) => (
              <button
                key={pack.id}
                onClick={() => handleWorkerPlanSelect(pack.id)}
                disabled={isAmountLocked}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-300 text-left",
                  selectedWorkerPlan === pack.id
                    ? "border-valentine-rose bg-valentine-rose/10"
                    : "border-border hover:border-valentine-rose/50"
                )}
              >
                <p className={cn(
                  "font-bold text-lg",
                  selectedWorkerPlan === pack.id ? "text-valentine-rose" : "text-foreground"
                )}>
                  {pack.name}
                </p>
                <p className="text-xs text-muted-foreground mb-1">{pack.label}</p>
                <p className={cn(
                  "font-semibold",
                  selectedWorkerPlan === pack.id ? "text-valentine-rose" : "text-foreground"
                )}>
                  ₹{pack.price.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Leadership Plan Selection */}
        <div className="mb-6 animate-fade-in">
          <h2 className="font-semibold mb-3">Step 2: Select Leadership Plan</h2>
          <div className={cn(
            "grid grid-cols-2 gap-3 transition-all duration-300",
            isAmountLocked && "opacity-50 pointer-events-none"
          )}>
            {leadershipPlanOptions.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handleLeadershipPlanSelect(plan.id)}
                disabled={isAmountLocked}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-300 text-left",
                  selectedLeadershipPlan === plan.id
                    ? "border-valentine-rose bg-valentine-rose/10"
                    : "border-border hover:border-valentine-rose/50"
                )}
              >
                <p className={cn(
                  "font-bold text-lg",
                  selectedLeadershipPlan === plan.id ? "text-valentine-rose" : "text-foreground"
                )}>
                  {plan.name}
                </p>
                <p className="text-xs text-muted-foreground mb-1">{plan.label}</p>
                <p className={cn(
                  "font-semibold",
                  selectedLeadershipPlan === plan.id ? "text-valentine-rose" : "text-foreground"
                )}>
                  ₹{plan.price.toLocaleString()}
                </p>
              </button>
            ))}
          </div>
          {isLevelMismatch && (
            <p className="text-xs font-bold text-valentine-rose mt-2">
              Recommended: Match same level for best returns.
            </p>
          )}
        </div>

        {/* Selected Amount Display */}
        <div className="bg-gradient-to-r from-valentine-warm to-valentine-warm-dark rounded-2xl p-6 mb-6 text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <p className="text-foreground/70 text-sm mb-1">Total Investment</p>
          <p className="text-4xl font-bold font-display text-valentine-rose">₹{amount.toLocaleString()}</p>
          {isAmountLocked && (
            <div className="flex items-center justify-center gap-1 mt-2 text-valentine-rose/80 text-sm">
              <Lock className="w-4 h-4" />
              <span>Amount Locked</span>
            </div>
          )}
        </div>

        {/* Lock Amount Button */}
        {!isAmountLocked && (
          <div className="space-y-3 mb-6">
            {exceedsUpiMaxTotal && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Total is above ₹{UPI_MAX_TOTAL.toLocaleString('en-IN')}.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  For amounts above ₹{UPI_MAX_TOTAL.toLocaleString('en-IN')}, use Direct Pay or USDT (Binance), then upload proof.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethodAboveLimit === 'direct' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethodAboveLimit('direct')}
                  >
                    Direct Pay
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={paymentMethodAboveLimit === 'usdt' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethodAboveLimit('usdt')}
                  >
                    USDT
                  </Button>
                </div>
              </div>
            )}

            <Button
              variant="rose"
              className="w-full"
              onClick={handleLockAmount}
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock Amount & Show QR
            </Button>
          </div>
        )}

        {/* UPI QR section (Normal + Dynamic optional) */}
        {isAmountLocked && !exceedsUpiMaxTotal && (
          <div className="bg-gradient-to-br from-background via-background to-primary/5 rounded-2xl border border-border p-6 mb-6 animate-fade-in shadow-sm" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-valentine-rose" />
                <h3 className="font-semibold">Scan & Pay</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {proofSlots.length} payment{proofSlots.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Button
                type="button"
                size="sm"
                variant={qrMode === 'static' ? 'default' : 'outline'}
                onClick={() => setQrMode('static')}
              >
                Normal QR
              </Button>
              <Button
                type="button"
                size="sm"
                variant={qrMode === 'dynamic' ? 'default' : 'outline'}
                onClick={() => setQrMode('dynamic')}
              >
                Dynamic QR
              </Button>
              <Button
                type="button"
                size="sm"
                variant={qrMode === 'direct' ? 'default' : 'outline'}
                onClick={() => setQrMode('direct')}
              >
                Direct Pay
              </Button>
            </div>

            {!effectiveUpiVpa ? (
              <div className="text-sm text-destructive">
                Missing UPI ID. Set `paymentDetails.upi.vpa` in `src/config/paymentDetails.ts`.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedProofSlots.map((slot, idx) => {
                  const uri = buildUpiPayUri({
                    vpa: effectiveUpiVpa,
                    payeeName: paymentDetails.upi!.payeeName,
                    amount: slot.amount,
                    note: slot.note,
                  });
                  return (
                    <div key={idx} className="rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-sm">
                          ₹{slot.amount.toLocaleString('en-IN')} {slot.count > 1 ? `(x${slot.count})` : '(x1)'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Note: <span className="font-semibold">{slot.note}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-center">
                        <div className="bg-card rounded-xl p-3 inline-block border border-border">
                          {qrMode === 'dynamic' ? (
                            <QRCode value={uri} size={220} />
                          ) : qrMode === 'direct' ? (
                            <div className="w-[220px] space-y-2">
                              {directPayOptions.map((opt) => (
                                <Button
                                  key={`direct-pay-${opt.id}`}
                                  type="button"
                                  className="w-full justify-start gap-2"
                                  variant="outline"
                                  onClick={() => openDirectPay(opt.id, { amount: slot.amount, note: slot.note })}
                                >
                                  <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r px-2 text-[10px] font-bold text-white', appBrandClasses[opt.id])}>
                                    {appLogoText[opt.id]}
                                  </span>
                                  <span>{opt.label}</span>
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <img
                              src={appSettings?.staticQrUrl || paymentQR}
                              alt="UPI QR"
                              className="w-[220px] h-[220px] object-contain rounded-lg"
                            />
                          )}
                        </div>
                      </div>

                      {qrMode === 'static' && (
                        <p className="text-[11px] text-muted-foreground mt-3 text-center">
                          UPI ID: <span className="font-semibold">{effectiveUpiVpa}</span>
                        </p>
                      )}

                    </div>
                  );
                })}
                {qrMode === 'direct' && showDirectPayFallback && (
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Could not open {lastDirectPayApp ? directPayOptions.find((o) => o.id === lastDirectPayApp)?.label : 'selected app'} automatically. Use these links:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {directPayOptions.map((opt) => {
                        const disabledForDesktop = !isLikelyMobileDevice;
                        return (
                          <button
                            key={`${opt.id}-fallback`}
                            type="button"
                            onClick={() => openDirectPay(opt.id)}
                            disabled={disabledForDesktop}
                            className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            title={disabledForDesktop ? 'Open this link from mobile browser' : undefined}
                          >
                            Open {opt.label}
                          </button>
                        );
                      })}
                      <a
                        href={directPayOptions[0]?.fallbackUri}
                        className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        Open Generic UPI
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment instructions for totals above UPI max */}
        {isAmountLocked && exceedsUpiMaxTotal && (
          <div className="bg-card rounded-2xl border border-border p-6 mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {paymentMethodAboveLimit === 'direct' && effectiveUpiVpa && (
              <div className="mb-4 rounded-xl border border-border bg-gradient-to-br from-background via-background to-muted/30 p-4 shadow-sm">
                <p className="text-xs font-semibold mb-2 tracking-wide uppercase">Direct Pay</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Split by ₹{DIRECT_PAY_SPLIT_LIMIT.toLocaleString('en-IN')} per transaction.
                </p>
                <div className="space-y-3">
                  {groupedProofSlots.map((slot, idx) => (
                    <div key={`direct-group-${idx}`} className="rounded-lg border border-border p-3">
                      <p className="text-xs font-semibold mb-2">
                        ₹{slot.amount.toLocaleString('en-IN')} (x{slot.count})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {directPayOptions.map((opt) => (
                          <Button
                            key={`direct-pay-above-${slot.amount}-${opt.id}`}
                            type="button"
                            variant="outline"
                            className="justify-start gap-2"
                            onClick={() => openDirectPay(opt.id, { amount: slot.amount, note: slot.note })}
                          >
                            <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r px-2 text-[10px] font-bold text-white', appBrandClasses[opt.id])}>
                              {appLogoText[opt.id]}
                            </span>
                            <span>{opt.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {showDirectPayFallback && (
                  <div className="mt-3 rounded-lg border border-border bg-background/60 p-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Could not open {lastDirectPayApp ? directPayOptions.find((o) => o.id === lastDirectPayApp)?.label : 'selected app'} automatically. Use these links:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {directPayOptions.map((opt) => {
                        const disabledForDesktop = !isLikelyMobileDevice;
                        return (
                          <button
                            key={`direct-pay-above-fallback-${opt.id}`}
                            type="button"
                            onClick={() => openDirectPay(opt.id)}
                            disabled={disabledForDesktop}
                            className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                            title={disabledForDesktop ? 'Open this link from mobile browser' : undefined}
                          >
                            Open {opt.label}
                          </button>
                        );
                      })}
                      <a
                        href={directPayOptions[0]?.fallbackUri}
                        className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        Open Generic UPI
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
            {paymentMethodAboveLimit === 'usdt' && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-5 h-5 text-valentine-rose" />
                  <h3 className="font-semibold">USDT (Binance) Instructions</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Pay ₹{amount.toLocaleString('en-IN')} using the selected method, then upload the proof below.
                </p>
                <div className="space-y-3">
                  <div className="grid gap-1">
                    <div className="text-[11px] text-muted-foreground">Network</div>
                    <Input readOnly value={paymentDetails.usdt?.network ?? ''} />
                  </div>
                  <div className="grid gap-1">
                    <div className="text-[11px] text-muted-foreground">USDT address</div>
                    <div className="flex gap-2">
                      <Input readOnly value={paymentDetails.usdt?.address ?? ''} />
                      <Button type="button" variant="outline" onClick={() => copyText('USDT address', paymentDetails.usdt?.address ?? '')}>
                        Copy
                      </Button>
                    </div>
                  </div>
                  {paymentDetails.usdt?.note && (
                    <p className="text-[11px] text-muted-foreground">{paymentDetails.usdt.note}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Proof Upload Slots - Only show when amount is locked */}
        {isAmountLocked && (
          <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-valentine-warm-dark" />
              Upload Payment Proof
            </h3>

            <div className="space-y-4">
              {groupedProofSlots.map((group, idx) => (
                <div key={`${group.amount}-${idx}`} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">
                      ₹{group.amount.toLocaleString('en-IN')} ({`x${group.count}`})
                    </div>
                    {(!exceedsUpiMaxTotal || paymentMethodAboveLimit === 'direct') && (
                      <span className="text-xs text-muted-foreground">UPI payment proof</span>
                    )}
                  </div>

                  <div className="mt-3">
                    <label className="text-xs text-muted-foreground">
                      {exceedsUpiMaxTotal && paymentMethodAboveLimit === 'usdt' ? 'Txn ID (optional)' : 'UPI Ref. No (optional)'}
                    </label>
                    <Input
                      value={proofSlots[group.indices[0]]?.utr ?? ''}
                      onChange={(e) =>
                        setProofSlots((prev) =>
                          prev.map((s, i) => (group.indices.includes(i) ? { ...s, utr: e.target.value } : s))
                        )
                      }
                      placeholder={
                        exceedsUpiMaxTotal && paymentMethodAboveLimit === 'usdt'
                          ? 'Enter crypto Txn ID (optional)'
                          : 'Enter UPI Ref. No (optional)'
                      }
                      disabled={isSubmitting}
                    />
                  </div>

                  <label
                    className={cn(
                      "mt-3 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all duration-300",
                      group.indices.some((i) => !!proofSlots[i]?.preview)
                        ? "border-valentine-warm-dark bg-valentine-warm/20"
                        : "border-border hover:border-valentine-rose hover:bg-valentine-rose/5"
                    )}
                  >
                    {group.indices.some((i) => !!proofSlots[i]?.preview) ? (
                      <>
                        <Check className="w-10 h-10 text-valentine-warm-dark mb-2" />
                        <p className="text-valentine-warm-dark font-medium">
                          {group.indices.filter((i) => !!proofSlots[i]?.screenshotFile).length} / {group.count} screenshot(s) uploaded
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {group.indices
                            .map((i) => proofSlots[i]?.preview)
                            .filter(Boolean)
                            .map((preview, pIdx) => (
                              <img key={pIdx} src={preview as string} alt="Payment proof" className="h-16 w-16 rounded-lg object-cover" />
                            ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          Tap to upload {group.count > 1 ? `${group.count} screenshots` : 'screenshot'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Max 5MB, images only</p>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple={group.count > 1}
                      className="hidden"
                      onChange={(e) => {
                        handleGroupedScreenshotUpload(group.indices, e.target.files);
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {isAmountLocked && (
          <Button
            variant="valentine"
            size="xl"
            className="w-full mb-8"
            onClick={handleSubmit}
            disabled={isSubmitting || proofSlots.some((s) => !s.screenshotFile)}
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-sparkle" />
                Submitting...
              </>
            ) : (
              <>Submit Deposit Request</>
            )}
          </Button>
        )}

        {/* Recharge History */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-valentine-rose" />
            Recent Transactions
          </h3>
          
          {isLoading ? (
            <div className="text-center py-8 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          ) : rechargeHistory.length > 0 ? (
            <div className="space-y-2">
              {rechargeHistory.map((item) => (
                <div key={item.id} className="bg-card rounded-xl p-4 border border-border flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">₹{Number(item.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                    {item.status === 'rejected' && item.admin_notes && (
                      <p className="text-xs text-destructive mt-1 break-words">
                        Reason: {item.admin_notes}
                      </p>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-3 py-1 rounded-full",
                    item.status === 'approved' && "bg-valentine-warm/20 text-valentine-warm-dark",
                    item.status === 'pending' && "bg-valentine-rose/10 text-valentine-rose",
                    item.status === 'rejected' && "bg-destructive/10 text-destructive"
                  )}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/30 rounded-xl">
              <p className="text-muted-foreground text-sm">No transactions yet</p>
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

export default Recharge;
