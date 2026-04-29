import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, Plus, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import { cn } from '@/lib/utils';

const PaymentMethods: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const paymentMethods = [
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: 'UPI Payment',
      description: 'Pay via any UPI app',
      colorClass: 'bg-valentine-warm-dark/10 text-valentine-warm-dark',
      available: true,
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: 'Card Payment',
      description: 'Credit/Debit cards',
      colorClass: 'bg-valentine-blush-dark/10 text-valentine-blush-dark',
      available: false,
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
          <h1 className="font-display text-xl font-bold">Payment Methods 💳</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        <div className="space-y-4 animate-fade-in">
          {paymentMethods.map((method, index) => (
            <div
              key={method.title}
              className={cn(
                "bg-card rounded-2xl border border-border p-5 transition-all duration-300",
                method.available ? "hover:shadow-valentine cursor-pointer" : "opacity-60"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  method.colorClass
                )}>
                  {method.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{method.title}</h3>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                {!method.available && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">Coming Soon</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-muted/30 rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            Payment Information
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Minimum deposit: ₹1,099</li>
            <li>• Maximum deposit: ₹10,00,000</li>
            <li>• Processing time: 5-30 minutes</li>
            <li>• All payments are secure and encrypted</li>
          </ul>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default PaymentMethods;
