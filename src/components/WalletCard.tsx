import React from 'react';
import { Heart, Sparkles, Gift, Star, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const WalletCard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const maskedPhone = user.phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1******$3');

  const stats = [
    { icon: <Gift className="w-5 h-5" />, label: 'Balance', value: `₹${user.balance.toLocaleString()}`, color: 'text-valentine-rose' },
    { icon: <Sparkles className="w-5 h-5" />, label: 'Recharge', value: `₹${user.totalRecharge.toLocaleString()}`, color: 'text-valentine-blush-dark' },
    { icon: <Heart className="w-5 h-5" />, label: 'Withdrawal', value: `₹${user.totalWithdrawal.toLocaleString()}`, color: 'text-valentine-rose-light' },
    { icon: <Star className="w-5 h-5" />, label: 'Revenue', value: `₹${user.productRevenue.toLocaleString()}`, color: 'text-valentine-rose' },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-valentine-rose via-valentine-blush-dark to-valentine-rose-dark p-6 shadow-valentine">
      {/* Decorative elements */}
      <div className="absolute top-2 right-2 text-4xl opacity-20 animate-float">💕</div>
      <div className="absolute bottom-2 left-2 text-3xl opacity-20 animate-sparkle">🌹</div>
      <div className="absolute top-1/2 right-8 text-2xl opacity-10">💝</div>

      {/* User Info */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          <div className={cn(
            "w-16 h-16 rounded-full overflow-hidden border-3 border-white/40",
            "flex items-center justify-center bg-white/20"
          )}>
            {user.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt={user.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-display font-bold text-white">
                {user.nickname.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
            <Camera className="w-3 h-3 text-valentine-rose" />
          </button>
        </div>
        
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-white">
            {user.nickname}
          </h2>
          <p className="text-white/80 text-sm">{maskedPhone}</p>
          <p className="text-white/60 text-xs mt-1">ID: {user.id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <div 
            key={stat.label}
            className={cn(
              "bg-white/15 backdrop-blur-sm rounded-xl p-3 transition-all duration-300",
              "hover:bg-white/25 hover:scale-[1.02]"
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="opacity-90 text-white">{stat.icon}</span>
              <span className="text-white/80 text-xs">{stat.label}</span>
            </div>
            <p className="font-bold text-lg text-white">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WalletCard;
