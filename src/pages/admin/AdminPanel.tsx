import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDashboardTab } from './tabs/AdminDashboardTab';
import { AdminRechargeTab } from './tabs/AdminRechargeTab';
import { AdminUsersTab } from './tabs/AdminUsersTab';
import { AdminOrdersTab } from './tabs/AdminOrdersTab';
import { AdminPacksTab } from './tabs/AdminPacksTab';
import { AdminAmountTab } from './tabs/AdminAmountTab';
import { AdminContactTab } from './tabs/AdminContactTab';
import { useAuth } from '@/contexts/AuthContext';

const AdminPanel: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Trigger child refresh by re-mounting via a key.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setIsUnlocked(sessionStorage.getItem('admin_viewer_unlocked') === '1');
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Verifying admin access…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Secret hotkey gate (Ctrl+Shift+S) sets sessionStorage flag.
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-border/40 bg-card p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-semibold">Admin Panel Locked</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Use the secret shortcut to unlock this panel.
          </p>
          <div className="mt-4 text-sm">
            <div className="font-semibold">Unlock shortcut</div>
            <div className="text-muted-foreground mt-1">Windows/Linux: Ctrl + Alt + A</div>
            <div className="text-muted-foreground">macOS: Cmd + Option + A</div>
          </div>
          <div className="mt-5 flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <Link to="/dashboard">Back</Link>
            </Button>
            <Button
              onClick={() => {
                sessionStorage.setItem('admin_viewer_unlocked', '1');
                setIsUnlocked(true);
              }}
            >
              I have access
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            This unlock lasts for this session only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Admin Panel</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>Refresh</Button>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-4 py-6"
      >
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="recharge">Recharge Requests</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="orders">Transactions</TabsTrigger>
            <TabsTrigger value="packs">Pack Controls</TabsTrigger>
            <TabsTrigger value="amount">AMOUNT</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <AdminDashboardTab key={`dash-${refreshKey}`} />
          </TabsContent>
          <TabsContent value="recharge" className="mt-6">
            <AdminRechargeTab key={`r-${refreshKey}`} onChanged={refresh} />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <AdminUsersTab key={`u-${refreshKey}`} onChanged={refresh} />
          </TabsContent>
          <TabsContent value="orders" className="mt-6">
            <AdminOrdersTab key={`o-${refreshKey}`} />
          </TabsContent>
          <TabsContent value="packs" className="mt-6">
            <AdminPacksTab key={`p-${refreshKey}`} onChanged={refresh} />
          </TabsContent>
          <TabsContent value="amount" className="mt-6">
            <AdminAmountTab key={`a-${refreshKey}`} onChanged={refresh} />
          </TabsContent>
          <TabsContent value="contact" className="mt-6">
            <AdminContactTab key={`c-${refreshKey}`} onChanged={refresh} />
          </TabsContent>
        </Tabs>
      </motion.main>
    </div>
  );
};

export default AdminPanel;