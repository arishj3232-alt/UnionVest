import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Wrench, User, Ticket, Hammer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/Modal';
import RosePetals from '@/components/RosePetals';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    password: '',
    confirmPassword: '',
    invitationCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref') ?? '';
    const cleaned = ref.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
    if (cleaned && !formData.invitationCode) {
      setFormData((prev) => ({ ...prev, invitationCode: cleaned }));
    }
  }, [formData.invitationCode, location.search]);

  const handleChange = (field: string, value: string) => {
    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    if (field === 'nickname') {
      // Limit nickname length and sanitize
      value = value.slice(0, 50);
    }
    if (field === 'invitationCode') {
      // Only allow alphanumeric and limit length
      value = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate nickname
    if (formData.nickname.trim().length < 2) {
      setModal({
        isOpen: true,
        title: 'Invalid Nickname',
        message: 'Nickname must be at least 2 characters.',
        type: 'error'
      });
      return;
    }

    // Validate phone
    if (formData.phone.length !== 10) {
      setModal({
        isOpen: true,
        title: 'Invalid Phone Number',
        message: 'Please enter a valid 10-digit mobile number.',
        type: 'error'
      });
      return;
    }

    // Validate password
    if (formData.password.length < 6) {
      setModal({
        isOpen: true,
        title: 'Weak Password',
        message: 'Password must be at least 6 characters.',
        type: 'error'
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setModal({
        isOpen: true,
        title: 'Password Mismatch',
        message: 'Passwords do not match. Please try again.',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);

    const result = await register({
      nickname: formData.nickname.trim(),
      phone: formData.phone,
      password: formData.password,
      invitationCode: formData.invitationCode || undefined,
    });

    if (result.success) {
      setModal({
        isOpen: true,
        title: 'Registration Successful',
        message: 'Welcome to UnionVest. Please sign in to continue.',
        type: 'success'
      });
    } else {
      setModal({
        isOpen: true,
        title: 'Registration Failed',
        message: result.error || 'Something went wrong.',
        type: 'error'
      });
    }
    setIsLoading(false);
  };

  const handleModalClose = () => {
    setModal({ ...modal, isOpen: false });
    if (modal.type === 'success') {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      <RosePetals />
      
      {/* Logo & Header */}
      <div className="relative z-10 text-center mb-6 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Hammer className="w-8 h-8 text-primary" strokeWidth={2.5} />
          <h1 className="font-display text-3xl font-bold text-foreground uppercase tracking-widest">
            UnionVest
          </h1>
        </div>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">Join the Movement</p>
      </div>

      {/* Register Form */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card rounded-md shadow-card p-6 border border-border animate-slide-up">
          <h2 className="font-display text-2xl font-bold text-center mb-5 uppercase tracking-wider">
            Create Account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nickname Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Nickname
              </label>
              <Input
                type="text"
                placeholder="Enter your nickname"
                value={formData.nickname}
                onChange={(e) => handleChange('nickname', e.target.value)}
                required
                minLength={2}
                maxLength={50}
                autoComplete="name"
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  +91
                </span>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="pl-14"
                  required
                  maxLength={10}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  minLength={6}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Confirm Password
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
                maxLength={128}
                autoComplete="new-password"
              />
            </div>

            {/* Invitation Code */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                Invitation Code
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </label>
              <Input
                type="text"
                placeholder="Enter invitation code"
                value={formData.invitationCode}
                onChange={(e) => handleChange('invitationCode', e.target.value)}
                maxLength={10}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="valentine"
              size="lg"
              className="w-full mt-2 uppercase tracking-wider"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Wrench className="w-4 h-4 animate-pulse" />
                  Creating Account...
                </>
              ) : (
                <>
                  Register
                </>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-5 text-center">
            <p className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-primary font-bold uppercase tracking-wider hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={handleModalClose}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default Register;
