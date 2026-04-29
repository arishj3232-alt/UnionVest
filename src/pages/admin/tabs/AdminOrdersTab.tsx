import React, { useCallback, useState } from 'react';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { adminTerminateOrderEarly, fetchAllOrders, type AdminOrderRow } from '@/services/adminService';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export const AdminOrdersTab: React.FC = () => {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, isLoading, error } = useAsyncResource<AdminOrderRow[]>(
    useCallback(() => fetchAllOrders(), []),
    { key: `admin:orders:${refreshKey}` }
  );
  const [reasonByOrder, setReasonByOrder] = useState<Record<string, string>>({});
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const handleTerminate = useCallback(async (orderId: string) => {
    const reason = reasonByOrder[orderId]?.trim() || 'Admin terminated early';
    setBusyOrderId(orderId);
    try {
      await adminTerminateOrderEarly(orderId, reason);
      toast({ title: 'Order terminated', description: 'The running order was completed early.' });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to terminate order';
      toast({ title: 'Action failed', description: message, variant: 'destructive' });
    } finally {
      setBusyOrderId(null);
    }
  }, [reasonByOrder, toast]);

  const normalizeStatus = (status: string) => {
    const s = status?.toLowerCase?.() ?? '';
    return s === 'completed' ? 'completed' : 'running';
  };

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading orders…</div>;
  if (error) return <div className="py-12 text-center text-destructive">{error.message}</div>;

  return (
    <div className="rounded-lg border border-border/40 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Pack</TableHead>
            <TableHead>Invested</TableHead>
            <TableHead>Earned</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Purchased</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data ?? []).map((o) => {
            const normalizedStatus = normalizeStatus(o.status);
            return (
            <TableRow key={o.id}>
              <TableCell className="text-xs text-muted-foreground">{o.user_id.slice(0, 8)}…</TableCell>
              <TableCell>{o.pack_name}</TableCell>
              <TableCell>₹{o.invested_amount.toLocaleString('en-IN')}</TableCell>
              <TableCell>₹{o.earned_amount.toLocaleString('en-IN')}</TableCell>
              <TableCell>
                <Badge variant={normalizedStatus === 'running' ? 'default' : 'secondary'}>{normalizedStatus}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(o.purchased_at).toLocaleString()}
              </TableCell>
              <TableCell className="min-w-[260px]">
                {normalizedStatus === 'running' ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Reason (optional)"
                      value={reasonByOrder[o.id] ?? ''}
                      onChange={(e) => setReasonByOrder((prev) => ({ ...prev, [o.id]: e.target.value }))}
                    />
                    <Button
                      variant="destructive"
                      disabled={busyOrderId === o.id}
                      onClick={() => handleTerminate(o.id)}
                    >
                      Terminate
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          )})}
          {(data ?? []).length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No orders</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};