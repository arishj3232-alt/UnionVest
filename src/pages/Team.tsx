import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Share2, Users, TrendingUp, Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import { cn } from '@/lib/utils';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchReferralTree, type ReferralRow } from '@/services/referralService';

const Team: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: referrals, isLoading } = useAsyncResource<ReferralRow[]>(
    useCallback(() => fetchReferralTree(user!.invitationCode), [user?.invitationCode]),
    { key: user ? `referrals:${user.invitationCode}` : null }
  );
  const referralRows = referrals ?? [];
  const statStyles = {
    earnings: 'text-valentine-rose',
    direct: 'text-valentine-warm-dark',
    team: 'text-valentine-blush-dark',
  } as const;

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const inviteLink = `${window.location.origin}/register?ref=${user.invitationCode}`;
  const totalEarnings = referralRows.reduce((sum, r) => sum + r.earnings, 0);
  const directReferrals = referralRows.filter(r => r.level === 1).length;
  const teamReferrals = referralRows.filter(r => r.level === 2).length;

  const copyCode = () => {
    navigator.clipboard.writeText(user.invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `Join UnionVest — empowering workers, building futures. Use my code: ${user.invitationCode} to get started. ${inviteLink}`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile 
      ? `whatsapp://send?text=${encodeURIComponent(text)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareTelegram = () => {
    const text = `Join UnionVest — empowering workers, building futures. Use my code: ${user.invitationCode} to get started.`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`, '_blank');
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
          <h1 className="font-display text-xl font-bold uppercase tracking-wider">My Team</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        {/* Invite Card */}
        <div className="bg-foreground rounded-md p-6 mb-6 relative overflow-hidden animate-fade-in border-l-4 border-primary">
          <h2 className="font-display text-xl font-bold text-background mb-2 uppercase tracking-wider">
            Build Your Union
          </h2>
          <p className="text-background/70 text-sm mb-4">
            Share your code. Strengthen the collective. Earn together.
          </p>

          {/* Invitation Code */}
          <div className="bg-card/20 backdrop-blur-sm rounded-xl p-4 mb-4">
            <p className="text-primary-foreground/70 text-xs mb-1">Your Invitation Code</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold font-display text-valentine-blush-light">{user.invitationCode}</p>
              <Button
                variant="blush"
                size="sm"
                onClick={copyCode}
                className="gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="warm"
              onClick={shareWhatsApp}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={shareTelegram}
              className="gap-2 border-valentine-blush/50 text-valentine-blush-light hover:bg-valentine-blush/10"
            >
              <Share2 className="w-4 h-4" />
              Telegram
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: <TrendingUp className="w-5 h-5" />, label: 'Total Earned', value: `₹${totalEarnings.toLocaleString('en-IN')}`, colorClass: statStyles.earnings },
            { icon: <Users className="w-5 h-5" />, label: 'Direct', value: directReferrals.toString(), colorClass: statStyles.direct },
            { icon: <Gift className="w-5 h-5" />, label: 'Team', value: teamReferrals.toString(), colorClass: statStyles.team },
          ].map((stat, i) => (
            <div 
              key={stat.label}
              className={cn(
                "bg-card rounded-xl p-4 border border-border text-center animate-fade-in"
              )}
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <div className={cn("mx-auto mb-2", stat.colorClass)}>
                {stat.icon}
              </div>
              <p className={cn("text-base sm:text-xl font-bold break-words", stat.colorClass)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Referral Rewards Info */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            Referral Rewards
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Level 1 (Direct)</span>
              <span className="font-semibold text-valentine-rose">5% of earnings</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Level 2 (Team)</span>
              <span className="font-semibold text-valentine-warm-dark">2% of earnings</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Level 3 (Extended)</span>
              <span className="font-semibold text-valentine-blush-dark">1% of earnings</span>
            </div>
          </div>
        </div>

        {/* Referral List */}
        <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <h3 className="font-semibold mb-3">Team Members ({referralRows.length})</h3>
          
          {isLoading ? (
            <div className="text-center py-12 bg-muted/50 rounded-2xl">
              <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3 animate-sparkle" />
              <p className="text-muted-foreground">Loading referrals…</p>
            </div>
          ) : referralRows.length > 0 ? (
            <div className="space-y-2">
              {referralRows.map((referral) => (
                <div key={referral.id} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-valentine-warm/20 flex items-center justify-center">
                      <span className="font-display font-bold text-valentine-warm-dark">
                        {referral.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{referral.name}</p>
                      <p className="text-xs text-muted-foreground">{referral.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-valentine-rose">₹{referral.earnings}</p>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      referral.level === 1 
                        ? "bg-valentine-warm/20 text-valentine-warm-dark"
                        : "bg-valentine-rose/10 text-valentine-rose"
                    )}>
                      Level {referral.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/50 rounded-2xl">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No referrals yet</p>
              <p className="text-sm text-muted-foreground">Share your code to start earning!</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Team;
