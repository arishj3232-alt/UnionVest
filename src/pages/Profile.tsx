import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Camera, LogOut, ChevronRight, User, CreditCard, Shield, HelpCircle, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { applyRedeemCode } from '@/services/redeemService';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [copied, setCopied] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const maskedPhone = user.phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1******$3');

  const copyInviteCode = () => {
    navigator.clipboard.writeText(user.invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNickname = () => {
    updateUser({ nickname });
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const onRedeem = async () => {
    if (!redeemCode.trim()) {
      toast({ title: 'Please enter a redeem code', variant: 'destructive' });
      return;
    }
    setIsRedeeming(true);
    try {
      const creditedAmount = await applyRedeemCode(redeemCode);
      updateUser({ balance: user.balance + creditedAmount });
      setRedeemCode('');
      toast({
        title: 'Redeem success',
        description: `₹${creditedAmount.toLocaleString()} added to your wallet.`,
      });
    } catch (error) {
      toast({
        title: 'Redeem failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const menuItems = [
    { icon: <CreditCard className="w-5 h-5" />, label: 'Payment Methods', path: '/payments' },
    { icon: <Shield className="w-5 h-5" />, label: 'Security', path: '/security' },
    { icon: <Share2 className="w-5 h-5" />, label: 'Invite Friends', path: '/team' },
    { icon: <HelpCircle className="w-5 h-5" />, label: 'Help & Support', path: '/help' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 relative">
      <RosePetals />
      
      {/* Header */}
      <header className="bg-foreground px-4 pt-12 pb-20 relative overflow-hidden border-b-4 border-primary">
        <div className="max-w-lg mx-auto text-center relative z-10">
          {/* Profile Picture */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-valentine-blush-light bg-valentine-cream mx-auto">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.nickname} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-display font-bold text-valentine-rose">
                    {user.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-valentine-blush flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Camera className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Nickname */}
          {isEditing ? (
            <div className="flex items-center justify-center gap-2 mb-2">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-40 text-center bg-card/20 border-valentine-blush/50"
              />
              <Button variant="blush" size="sm" onClick={handleSaveNickname}>
                Save
              </Button>
            </div>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-2xl font-display font-bold text-primary-foreground hover:text-valentine-blush-light transition-colors"
            >
              {user.nickname}
            </button>
          )}
          
          <p className="text-primary-foreground/70 text-sm">{maskedPhone}</p>
          <p className="text-valentine-blush-light text-xs mt-1">
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </header>

      <main className="px-4 -mt-10 max-w-lg mx-auto relative z-10">
        {/* Invite Code Card */}
        <div className="bg-card rounded-2xl shadow-valentine p-5 mb-6 border border-border animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your Invitation Code</p>
              <p className="text-2xl font-bold font-display text-valentine-rose">{user.invitationCode}</p>
            </div>
            <Button
              variant="outline-rose"
              size="sm"
              onClick={copyInviteCode}
              className="gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          {[
            { label: 'Balance', value: `₹${user.balance.toLocaleString()}`, color: 'text-valentine-rose' },
            { label: 'Recharged', value: `₹${user.totalRecharge.toLocaleString()}`, color: 'text-valentine-warm-dark' },
            { label: 'Withdrawn', value: `₹${user.totalWithdrawal.toLocaleString()}`, color: 'text-valentine-blush-dark' },
          ].map((stat, i) => (
            <div 
              key={stat.label}
              className="bg-card rounded-xl p-3 text-center border border-border animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <p className={cn("font-bold text-sm sm:text-lg leading-tight break-words", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="font-semibold">Redeem Code</p>
              <p className="text-xs text-muted-foreground">Enter promo/reward code to claim wallet bonus.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              placeholder="Enter code (e.g. UNIONVEST100)"
              className="uppercase"
            />
            <Button onClick={onRedeem} disabled={isRedeeming}>
              {isRedeeming ? 'Applying...' : 'Apply'}
            </Button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden mb-6">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors",
                i !== menuItems.length - 1 && "border-b border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-valentine-warm-dark">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <Button
          variant="outline-blush"
          size="lg"
          className="w-full"
          onClick={() => setLogoutModal(true)}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </main>

      <BottomNav />

      {/* Logout Modal */}
      <Modal
        isOpen={logoutModal}
        onClose={() => setLogoutModal(false)}
        title="Logout"
        message="Are you sure you want to logout?"
        type="info"
        actionLabel="Yes, Logout"
        onAction={handleLogout}
      />
    </div>
  );
};

export default Profile;
