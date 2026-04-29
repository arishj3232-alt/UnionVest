import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Smartphone, Key, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/BottomNav';
import RosePetals from '@/components/RosePetals';
import Modal from '@/components/Modal';
import { cn } from '@/lib/utils';
import { updatePassword } from '@/services/authService';

const Security: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleChangePassword = async () => {
    // Validate password match
    if (newPassword !== confirmPassword) {
      setModal({
        isOpen: true,
        title: 'Password Mismatch',
        message: 'New password and confirm password do not match.',
        type: 'error'
      });
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setModal({
        isOpen: true,
        title: 'Weak Password',
        message: 'Password must be at least 6 characters long.',
        type: 'error'
      });
      return;
    }

    // Validate password strength (at least one number or special char)
    if (!/[0-9!@#$%^&*]/.test(newPassword)) {
      setModal({
        isOpen: true,
        title: 'Weak Password',
        message: 'Password must contain at least one number or special character.',
        type: 'error'
      });
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        setModal({
          isOpen: true,
          title: 'Update Failed',
          message: error.message,
          type: 'error'
        });
        return;
      }

      setModal({
        isOpen: true,
        title: 'Password Updated',
        message: 'Your password has been changed successfully.',
        type: 'success'
      });
      
      // Clear form
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password update error:', error);
      setModal({
        isOpen: true,
        title: 'Error',
        message: 'An unexpected error occurred. Please try again.',
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const securityOptions = [
    {
      icon: <Lock className="w-5 h-5" />,
      title: 'Change Password',
      description: 'Update your account password',
      action: () => setShowChangePassword(true),
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: 'Two-Factor Authentication',
      description: 'Add extra security to your account',
      toggle: true,
      enabled: twoFactorEnabled,
      onToggle: () => setTwoFactorEnabled(!twoFactorEnabled),
    },
    {
      icon: <Key className="w-5 h-5" />,
      title: 'Login Activity',
      description: 'View recent login attempts',
      comingSoon: true,
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
          <h1 className="font-display text-xl font-bold">Security 🔐</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto relative z-10">
        {/* Security Status */}
        <div className="bg-gradient-to-r from-valentine-warm to-valentine-warm-dark rounded-2xl p-6 mb-6 text-center animate-fade-in">
          <Shield className="w-12 h-12 text-valentine-rose mx-auto mb-3" />
          <h2 className="font-display text-xl font-bold text-foreground">Account Protected</h2>
          <p className="text-foreground/70 text-sm mt-1">Your account security is strong</p>
        </div>

        {/* Security Options */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {securityOptions.map((option, index) => (
            <div
              key={option.title}
              className={cn(
                "bg-card rounded-2xl border border-border p-4 transition-all duration-300",
                !option.toggle && !option.comingSoon && "hover:shadow-valentine cursor-pointer"
              )}
              onClick={option.action}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-valentine-warm/20 flex items-center justify-center text-valentine-warm-dark">
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
                {option.toggle && (
                  <Switch
                    checked={option.enabled}
                    onCheckedChange={option.onToggle}
                  />
                )}
                {option.comingSoon && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">Coming Soon</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Change Password Form */}
        {showChangePassword && (
          <div className="mt-6 bg-card rounded-2xl border border-border p-5 animate-fade-in">
            <h3 className="font-semibold mb-4">Change Password</h3>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  maxLength={128}
                  autoComplete="current-password"
                />
              </div>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="New Password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </div>
              <div className="relative">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  maxLength={128}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters and contain a number or special character.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  variant="valentine"
                  onClick={handleChangePassword}
                  className="flex-1"
                  disabled={isUpdating || !newPassword || !confirmPassword}
                >
                  {isUpdating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-sparkle" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 bg-muted/30 rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            🔐 Security Tips
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Use a strong, unique password</li>
            <li>• Enable two-factor authentication</li>
            <li>• Never share your login credentials</li>
            <li>• Log out from shared devices</li>
          </ul>
        </div>
      </main>

      <BottomNav />

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default Security;
