import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface NotificationContextType {
  showDepositNotification: (amount: number) => void;
  showPurchaseNotification: (packName: string) => void;
  showWithdrawNotification: (amount: number) => void;
  showChristmasWish: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [christmasWishShown, setChristmasWishShown] = useState(false);
  const hasStartedWishCheckRef = useRef(false);

  // Check for Christmas wish on component mount and every minute
  useEffect(() => {
    if (hasStartedWishCheckRef.current) return;
    hasStartedWishCheckRef.current = true;

    const checkChristmasWish = () => {
      const now = new Date();
      const christmasDate = new Date('2025-12-25T00:00:00');
      
      // Check if it's Christmas day and we haven't shown the wish yet
      if (
        now.getFullYear() === 2025 &&
        now.getMonth() === 11 && // December is month 11
        now.getDate() === 25 &&
        !christmasWishShown &&
        !localStorage.getItem('christmas2025WishShown')
      ) {
        showChristmasWish();
        setChristmasWishShown(true);
        localStorage.setItem('christmas2025WishShown', 'true');
      }
    };

    checkChristmasWish();
    const interval = setInterval(checkChristmasWish, 60000); // Check every minute

    return () => {
      clearInterval(interval);
      hasStartedWishCheckRef.current = false;
    };
  }, []);

  const showDepositNotification = (amount: number) => {
    toast.success(
      `Deposit Confirmed`,
      {
        description: `₹${amount.toLocaleString()} added to your wallet. Build steady, build strong.`,
        duration: 5000,
      }
    );
  };

  const showPurchaseNotification = (packName: string) => {
    toast.success(
      `Plan Activated`,
      {
        description: `You've activated ${packName}. Daily earnings begin shortly.`,
        duration: 5000,
      }
    );
  };

  const showWithdrawNotification = (amount: number) => {
    toast.success(
      `Withdrawal Requested`,
      {
        description: `Your withdrawal of ₹${amount.toLocaleString()} is being processed.`,
        duration: 5000,
      }
    );
  };

  const showChristmasWish = () => {
    toast(
      `Solidarity in Progress`,
      {
        description: `Empowering workers, building futures — together with UnionVest.`,
        duration: 6000,
      }
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        showDepositNotification,
        showPurchaseNotification,
        showWithdrawNotification,
        showChristmasWish,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
