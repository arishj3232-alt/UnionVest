import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CreditCard, Package, Users, User, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: <Home className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
  { icon: <CreditCard className="w-5 h-5" />, label: 'Recharge', path: '/recharge' },
  { icon: <Package className="w-5 h-5" />, label: 'My Orders', path: '/orders' },
  { icon: <Users className="w-5 h-5" />, label: 'Team', path: '/team' },
  { icon: <History className="w-5 h-5" />, label: 'Wallet', path: '/wallet-history' },
  { icon: <User className="w-5 h-5" />, label: 'Profile', path: '/profile' },
];

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t-2 border-primary/40 shadow-lg">
      <div className="max-w-lg mx-auto flex items-center justify-between py-2 px-1 sm:px-2 gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-1 sm:px-2 rounded-md transition-all duration-200",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <div className="transition-all duration-200">
                {item.icon}
              </div>
              <span className={cn(
                "text-[9px] sm:text-[10px] mt-1 font-bold uppercase tracking-wide transition-all duration-200 whitespace-nowrap",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-[2px] left-2 right-2 h-[2px] bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
