import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ChevronDown, ChevronUp, ExternalLink, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import { cn } from '@/lib/utils';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchPublicAppSettings } from '@/services/appSettingsService';
import { fetchHighestSilverLevel } from '@/services/ordersService';

interface FAQ {
  question: string;
  answer: string;
}

const HelpSupport: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
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

  const contactOptions = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'Telegram Chat',
      description: `@${appSettings?.telegramId ?? 'zorokun142'}`,
      colorClass: 'bg-valentine-warm-dark/10 text-valentine-warm-dark',
      link: (() => {
        const idRaw = (appSettings?.telegramId ?? 'zorokun142').trim();
        const id = idRaw.startsWith('@') ? idRaw.slice(1) : idRaw;
        return `https://t.me/${id}`;
      })(),
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
                  Purchase any pack to unlock contact support
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
                href={option.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-card rounded-2xl border border-border p-4 hover:shadow-valentine transition-all duration-300"
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
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>
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
