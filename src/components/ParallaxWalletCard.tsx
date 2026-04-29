import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle, Camera, Hammer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const ParallaxWalletCard: React.FC = () => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  
  const cardY = useTransform(scrollY, [0, 300], [0, 30]);
  const cardScale = useTransform(scrollY, [0, 200], [1, 0.97]);
  const cardRotateX = useTransform(scrollY, [0, 300], [0, 2]);
  const decorY1 = useTransform(scrollY, [0, 300], [0, -20]);
  const shadowOpacity = useTransform(scrollY, [0, 200], [0.4, 0.2]);

  if (!user) return null;
  const maskedPhone = user.phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1******$3');

  const stats = [
    { icon: <Wallet className="w-5 h-5" />, label: 'Balance', value: `₹${user.balance.toLocaleString()}` },
    { icon: <ArrowDownCircle className="w-5 h-5" />, label: 'Deposits', value: `₹${user.totalRecharge.toLocaleString()}` },
    { icon: <ArrowUpCircle className="w-5 h-5" />, label: 'Withdrawn', value: `₹${user.totalWithdrawal.toLocaleString()}` },
    { icon: <TrendingUp className="w-5 h-5" />, label: 'Earnings', value: `₹${user.productRevenue.toLocaleString()}` },
  ];

  return (
    <div ref={containerRef} className="perspective-1000">
      <motion.div 
        style={{ y: cardY, scale: cardScale, rotateX: cardRotateX, transformStyle: 'preserve-3d' }}
        className="relative overflow-hidden rounded-md bg-foreground p-6 shadow-valentine will-change-transform border-l-4 border-primary"
      >
        <motion.div style={{ y: decorY1 }} className="absolute top-3 right-3 opacity-20 will-change-transform">
          <Hammer className="w-10 h-10 text-background" strokeWidth={2} />
        </motion.div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className={cn("w-16 h-16 rounded-md overflow-hidden border-2 border-primary/60", "flex items-center justify-center bg-background/10")}>
              {user.profilePicture ? (
                <img src={user.profilePicture} alt={user.nickname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-display font-bold text-background">{user.nickname.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
              <Camera className="w-3 h-3 text-primary-foreground" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-background uppercase tracking-wider">{user.nickname}</h2>
            <p className="text-background/70 text-sm">{maskedPhone}</p>
            <p className="text-background/50 text-xs mt-1 uppercase tracking-widest">ID: {user.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
              className={cn("bg-background/10 backdrop-blur-sm rounded-md p-3 transition-all duration-200 border border-background/10", "hover:bg-background/15")}>
              <div className="flex items-center gap-2 mb-1">
                <span className="opacity-90 text-primary">{stat.icon}</span>
                <span className="text-background/70 text-[10px] uppercase tracking-widest font-bold">{stat.label}</span>
              </div>
              <p className="font-display font-bold text-lg text-background">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <motion.div style={{ opacity: shadowOpacity }} className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-md" />
      </motion.div>
    </div>
  );
};

export default ParallaxWalletCard;
