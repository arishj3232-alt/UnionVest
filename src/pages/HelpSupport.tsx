import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ChevronDown, ChevronUp, ExternalLink, Lock, Clock3, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import { cn } from '@/lib/utils';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchPublicAppSettings } from '@/services/appSettingsService';
import { fetchHighestSilverLevel } from '@/services/ordersService';
import { MAY_2_2026_NOON_IST_MS, formatCountdown, getCountdownParts } from '@/utils/releaseGate';

interface FAQ {
  question: string;
  answer: string;
}

const HelpSupport: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [releaseNowMs, setReleaseNowMs] = useState(() => Date.now());
  const { data: appSettings } = useAsyncResource(fetchPublicAppSettings, {
    key: 'help:public-app-settings',
  });

  const userId = user?.authId ?? null;
  const { data: highestSilverLevel } = useAsyncResource<number>(
    useCallback(() => fetchHighestSilverLevel(userId!), [userId]),
    { key: userId ? `help:silver-level:${userId}` : null }
  );
  // Unlock support only after a real pack purchase.
  const hasPurchasedPack = (highestSilverLevel ?? 0) > 0;

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    const t = window.setInterval(() => setReleaseNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const faqs: FAQ[] = [
    {
      question: 'How do I recharge my wallet?',
      answer: 'Go to the Recharge section, select an amount, scan the QR code to pay, and upload the payment screenshot. Your balance will be credited within 5-30 minutes after verification.',
    },
    {
      question: 'How long does withdrawal take?',
      answer: 'Withdrawals are processed within 24-48 hours. The amount will be credited to your registered UPI or bank account.',
    },
    {
      question: 'What is the minimum investment?',
      answer: 'The minimum investment starts at ₹1,099 with our Starter Pack 1.',
    },
    {
      question: 'How do referral rewards work?',
      answer: 'You earn 5% of your direct referrals\' earnings, 2% from level 2, and 1% from level 3 referrals.',
    },
    {
      question: 'When will the Solidarity Fund be available?',
      answer: 'The Solidarity Fund opens on May 1st, 2026 — International Workers\' Day.',
    },
  ];

  const telegramIdRaw = (appSettings?.telegramId ?? '').trim();
  const normalizedTelegramId = telegramIdRaw.startsWith('@') ? telegramIdRaw.slice(1) : telegramIdRaw;
  const supportReleaseLocked = releaseNowMs < MAY_2_2026_NOON_IST_MS;
  const supportCountdown = formatCountdown(MAY_2_2026_NOON_IST_MS - releaseNowMs);
  const supportCountdownParts = getCountdownParts(MAY_2_2026_NOON_IST_MS - releaseNowMs);
  const supportCountdownBadge = [
    `${String(supportCountdownParts.days).padStart(2, '0')}D`,
    `${String(supportCountdownParts.hours).padStart(2, '0')}H`,
    `${String(supportCountdownParts.minutes).padStart(2, '0')}M`,
    `${String(supportCountdownParts.seconds).padStart(2, '0')}S`,
  ].join(' : ');
  const hasTelegramContact = !supportReleaseLocked && normalizedTelegramId.length > 0;
  const supportWindowText = 'Mon - Sat, 9:00 AM to 9:00 PM IST';
  const supportResponseText = supportReleaseLocked
    ? `Support chat opens May 2, 12:00 PM IST (in ${supportCountdown})`
    : 'Typical first response: within 2-4 hours';

  const contactOptions = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'Telegram Chat',
      description: supportReleaseLocked
        ? `Opens May 2, 12:00 PM IST • ${supportCountdown}`
        : hasTelegramContact
          ? `@${normalizedTelegramId}`
          : 'Support will update soon after we reach 4k family.',
      colorClass: 'bg-valentine-warm-dark/10 text-valentine-warm-dark',
      link: hasTelegramContact ? `https://t.me/${normalizedTelegramId}` : '',
      isAvailable: hasTelegramContact,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <RosePetals />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold uppercase tracking-wider">Help & Support</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        <div className="mb-4 rounded-xl border border-border bg-card p-4 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Support Desk Status</p>
              <p className="text-xs text-muted-foreground mt-1">{supportWindowText}</p>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
              hasTelegramContact ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
            )}>
              <CircleCheck className="w-3 h-3" />
              {hasTelegramContact ? 'Online' : supportReleaseLocked ? 'Opens Soon' : 'Updating'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            {supportResponseText}
          </p>
        </div>

        {/* Contact Options */}
        <div className="mb-8 animate-fade-in relative">
          <h2 className="font-semibold mb-4">Contact Us</h2>
          
          {/* Locked Overlay */}
          {!hasPurchasedPack && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">Contact Support Locked</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Purchase any pack to unlock direct support chat.
                </p>
                <Button
                  variant="rose"
                  onClick={() => navigate('/dashboard')}
                  className="gap-2"
                >
                  Browse Packs
                </Button>
              </div>
            </div>
          )}
          
          <div className={cn("space-y-3", !hasPurchasedPack && "blur-sm pointer-events-none")}>
            {contactOptions.map((option, index) => (
              <a
                key={option.title}
                href={option.isAvailable ? option.link : undefined}
                target={option.isAvailable ? '_blank' : undefined}
                rel={option.isAvailable ? 'noopener noreferrer' : undefined}
                onClick={(e) => {
                  if (!option.isAvailable) e.preventDefault();
                }}
                className={cn(
                  "block bg-card rounded-2xl border border-border p-4 transition-all duration-300",
                  option.isAvailable ? "hover:shadow-valentine" : "opacity-70 cursor-not-allowed"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    option.colorClass
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                    {supportReleaseLocked && option.title === 'Telegram Chat' && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1">
                        <span className="text-[10px] uppercase tracking-wider text-primary/80">Opens In</span>
                        <span className="text-[11px] font-semibold text-primary">{supportCountdownBadge}</span>
                      </div>
                    )}
                    {option.isAvailable && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        For faster help, share your UID + screenshot in first message.
                      </p>
                    )}
                  </div>
                  <ExternalLink className={cn("w-5 h-5", option.isAvailable ? "text-muted-foreground" : "text-muted-foreground/50")} />
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card p-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="font-semibold text-sm mb-2">Before you contact support</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>Keep payment screenshot and UPI Ref/Txn ID ready.</li>
            <li>Mention your registered phone number or UID.</li>
            <li>Avoid duplicate requests while one is pending review.</li>
          </ul>
        </div>

        {/* FAQs */}
        <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl border border-border overflow-hidden"
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <span className="font-medium pr-4">{faq.question}</span>
                  {openFAQ === index ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {openFAQ === index && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support Hours */}
        <div className="mt-8 bg-muted/30 rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            Support Hours
          </h3>
          <p className="text-sm text-muted-foreground">
            Our support team is available Monday to Saturday, 9:00 AM to 9:00 PM IST.
            We typically respond within 2-4 hours.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default HelpSupport;
