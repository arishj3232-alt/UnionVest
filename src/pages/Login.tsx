import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Hammer, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/Modal';
import RosePetals from '@/components/RosePetals';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
    isOpen: false, title: '', message: '', type: 'success'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setModal({ isOpen: true, title: 'Invalid Phone Number', message: 'Please enter a valid 10-digit mobile number.', type: 'error' });
      return;
    }
    if (password.length < 6) {
      setModal({ isOpen: true, title: 'Invalid Password', message: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setIsLoading(true);
    const result = await login(phone, password);
    if (result.success) {
      setModal({ isOpen: true, title: 'Welcome Back', message: 'Login successful. Continue building your future.', type: 'success' });
    } else {
      setModal({ isOpen: true, title: 'Login Failed', message: result.error || 'Please check your credentials.', type: 'error' });
    }
    setIsLoading(false);
  };

  const handleModalClose = () => {
    setModal({ ...modal, isOpen: false });
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      <RosePetals />
      
      <div className="relative z-10 text-center mb-8 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Hammer className="w-9 h-9 text-primary" strokeWidth={2.5} />
          <h1 className="font-display text-4xl font-bold text-foreground uppercase tracking-widest">
            UnionVest
          </h1>
        </div>
        <p className="text-muted-foreground text-sm uppercase tracking-widest">Empowering Workers · Building Futures</p>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card rounded-md shadow-card p-8 border border-border animate-slide-up">
          <h2 className="font-display text-2xl font-bold text-center mb-6 uppercase tracking-wider">
            Member Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">+91</span>
                <Input type="tel" placeholder="Enter 10-digit number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="pl-14" required maxLength={10} autoComplete="tel" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Password
              </label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} maxLength={128} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="valentine" size="lg" className="w-full uppercase tracking-wider" disabled={isLoading}>
              {isLoading ? (<><Wrench className="w-4 h-4 animate-pulse" /> Signing In...</>) : (<>Sign In</>)}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-bold uppercase tracking-wider hover:underline">Register</Link>
            </p>
          </div>
        </div>
      </div>

      <Modal isOpen={modal.isOpen} onClose={handleModalClose} title={modal.title} message={modal.message} type={modal.type} />
    </div>
  );
};

export default Login;
