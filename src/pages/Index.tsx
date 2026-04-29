import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, TrendingUp, ShieldCheck, Users, ChevronRight, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RosePetals from '@/components/RosePetals';

const Index: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { icon: <TrendingUp className="w-6 h-6" />, title: 'Steady Returns', description: 'Earn consistent daily income from disciplined plans' },
    { icon: <ShieldCheck className="w-6 h-6" />, title: 'Secure Platform', description: 'Your capital is protected with enterprise-grade controls' },
    { icon: <Users className="w-6 h-6" />, title: 'Stronger Together', description: 'Build your network, grow as a collective' },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <RosePetals />

      <header className="relative z-10 px-4 pt-8 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hammer className="w-7 h-7 text-primary" strokeWidth={2.5} />
            <span className="font-display text-2xl font-bold text-foreground tracking-wider uppercase">UnionVest</span>
          </div>
          <Button variant="outline-rose" size="sm" onClick={() => navigate('/login')}>
            Login
          </Button>
        </div>
      </header>

      <main className="relative z-10 px-4 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="text-center py-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest mb-6 border border-primary/20">
              <Wrench className="w-4 h-4" />
              International Workers' Day
            </div>

            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight uppercase tracking-wide">
              Build your
              <span className="text-primary"> Future </span>
              with
              <span className="text-foreground"> Discipline</span>
            </h1>

            <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Empowering workers through steady returns. Strength through consistency, growth through unity.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="valentine"
                size="xl"
                onClick={() => navigate('/register')}
                className="gap-2 uppercase tracking-wider"
              >
                Start Building
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline-rose"
                size="xl"
                onClick={() => navigate('/login')}
                className="uppercase tracking-wider"
              >
                Member Login
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {[
              { value: '₹10L+', label: 'Capital Deployed' },
              { value: '5000+', label: 'Active Workers' },
              { value: '24/7', label: 'Operations' },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-md p-4 text-center border border-border shadow-card">
                <p className="text-2xl font-bold font-display text-primary">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="bg-card rounded-md p-5 border border-border flex items-start gap-4 animate-fade-in hover:shadow-valentine transition-shadow"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <div className="p-3 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg mb-1 uppercase tracking-wide">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-foreground rounded-md p-8 text-center animate-fade-in border-l-4 border-primary" style={{ animationDelay: '0.6s' }}>
            <Wrench className="w-10 h-10 text-primary mx-auto mb-4" strokeWidth={2.5} />
            <h2 className="font-display text-2xl font-bold text-background mb-2 uppercase tracking-wide">
              Ready to Build?
            </h2>
            <p className="text-background/70 mb-6 text-sm">
              Join the movement. Empower your future through consistency.
            </p>
            <Button
              variant="valentine"
              size="lg"
              onClick={() => navigate('/register')}
              className="uppercase tracking-wider"
            >
              Create Account
            </Button>
          </div>

          <footer className="mt-12 text-center text-muted-foreground text-xs">
            <p className="uppercase tracking-widest">© 2026 UnionVest · All rights reserved</p>
            <p className="mt-2 font-display text-base text-primary uppercase tracking-widest">Strength · Solidarity · Progress</p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Index;
