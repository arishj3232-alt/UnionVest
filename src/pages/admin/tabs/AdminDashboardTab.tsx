import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  adminDeleteUser,
  adminDisableUser,
  fetchAdminUserMetrics,
  fetchAllOrders,
  fetchAllRechargeRequests,
  fetchAllUsers,
  type AdminUserMetricsRow,
} from '@/services/adminService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const AdminDashboardTab: React.FC = () => {
  const recharges = useAsyncResource(useCallback(() => fetchAllRechargeRequests(), []), { key: 'admin:recharges' });
  const users = useAsyncResource(useCallback(() => fetchAllUsers(), []), { key: 'admin:users' });
  const orders = useAsyncResource(useCallback(() => fetchAllOrders(), []), { key: 'admin:orders' });
  const metrics = useAsyncResource<AdminUserMetricsRow[]>(
    useCallback(() => fetchAdminUserMetrics(), []),
    { key: 'admin:user-metrics' }
  );
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const isLoading = recharges.isLoading || users.isLoading || orders.isLoading || metrics.isLoading;
  const pendingCount = recharges.data?.filter((r) => r.status === 'pending').length ?? 0;
  const totalUsers = users.data?.length ?? 0;
  const activeOrders = orders.data?.filter((o) => o.status === 'running').length ?? 0;
  const totalBalance = users.data?.reduce((sum, u) => sum + u.balance, 0) ?? 0;

  const stats = [
    { label: 'Pending Recharges', value: pendingCount, accent: 'text-yellow-500' },
    { label: 'Total Users', value: totalUsers, accent: 'text-primary' },
    { label: 'Active Orders', value: activeOrders, accent: 'text-green-500' },
    { label: 'Wallet Liability', value: `₹${totalBalance.toLocaleString('en-IN')}`, accent: 'text-magenta-500' },
  ];

  const filtered = useMemo(() => {
    const data = metrics.data ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return data.filter((u) =>
      u.nickname.toLowerCase().includes(query) ||
      u.phone.includes(query) ||
      u.user_id.toLowerCase().includes(query)
    );
  }, [metrics.data, q]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.accent}`}>
                {isLoading ? '…' : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-border/40 overflow-x-auto">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <div className="font-semibold">All Users</div>
            <div className="text-xs text-muted-foreground">
              Name, phone, totals (investment/revenue/packs), deposits/withdraw counts, and actions.
            </div>
          </div>
          <Input
            className="sm:max-w-sm"
            placeholder="Search name / phone / user id"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Total Investment</TableHead>
              <TableHead>Earnings/Revenue</TableHead>
              <TableHead>Total Packs</TableHead>
              <TableHead>Deposits</TableHead>
              <TableHead>Withdraws</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell>
                  <div className="font-medium">{u.nickname || '—'}</div>
                  <div className="text-xs text-muted-foreground">+91 {u.phone || '—'}</div>
                  <div className="text-[11px] text-muted-foreground">{u.user_id.slice(0, 8)}…</div>
                </TableCell>
                <TableCell className="font-semibold">₹{u.balance.toLocaleString('en-IN')}</TableCell>
                <TableCell className="font-semibold">₹{u.total_investment.toLocaleString('en-IN')}</TableCell>
                <TableCell className="font-semibold">
                  ₹{u.total_earned.toLocaleString('en-IN')}/₹{u.total_revenue.toLocaleString('en-IN')}
                </TableCell>
                <TableCell>{u.total_packs}</TableCell>
                <TableCell>{u.deposit_count}</TableCell>
                <TableCell>{u.withdraw_count}</TableCell>
                <TableCell>
                  <span className={u.disabled_at ? 'text-destructive' : 'text-green-600'}>
                    {u.disabled_at ? 'paused' : 'active'}
                  </span>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyUserId === u.user_id}
                    onClick={async () => {
                      const reason = window.prompt('Reason (min 3 chars)') ?? '';
                      if (reason.trim().length < 3) return;
                      setBusyUserId(u.user_id);
                      try {
                        await adminDisableUser(u.user_id, !u.disabled_at, reason);
                        toast({ title: u.disabled_at ? 'User unpaused' : 'User paused' });
                        window.location.reload();
                      } catch (e) {
                        toast({ title: 'Action failed', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
                      } finally {
                        setBusyUserId(null);
                      }
                    }}
                  >
                    {u.disabled_at ? 'Unpause' : 'Pause'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyUserId === u.user_id}
                    onClick={async () => {
                      if (!confirm(`Delete ${u.nickname || 'this user'}? This cannot be undone.`)) return;
                      const reason = window.prompt('Reason (min 3 chars)') ?? '';
                      if (reason.trim().length < 3) return;
                      setBusyUserId(u.user_id);
                      try {
                        await adminDeleteUser(u.user_id, reason);
                        toast({ title: 'User deleted' });
                        window.location.reload();
                      } catch (e) {
                        toast({ title: 'Delete failed', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
                      } finally {
                        setBusyUserId(null);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  {isLoading ? 'Loading…' : 'No users found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};