import React, { useCallback, useMemo, useState } from 'react';
import { useAsyncResource, __resetAsyncResourceCache } from '@/hooks/useAsyncResource';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type WithdrawStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type WithdrawRow = {
  id: string;
  user_id: string;
  amount: number;
  tax_amount: number;
  net_amount: number;
  method: 'upi' | 'bank';
  details: Record<string, unknown>;
  status: WithdrawStatus;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  profiles?: { nickname: string; phone: string } | null;
};

async function fetchAllWithdrawRequests(): Promise<WithdrawRow[]> {
  const { data, error } = await supabase
    .from('withdraw_requests')
    .select('id, user_id, amount, tax_amount, net_amount, method, details, status, admin_notes, created_at, processed_at')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  const rows = (data ?? []).map((r: any) => ({
    ...r,
    amount: Number(r.amount),
    tax_amount: Number(r.tax_amount),
    net_amount: Number(r.net_amount),
  })) as WithdrawRow[];
  if (rows.length === 0) return rows;

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, nickname, phone')
    .in('user_id', userIds);
  const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  return rows.map((r) => ({ ...r, profiles: map.get(r.user_id) ?? null }));
}

async function adminProcessWithdraw(requestId: string, action: 'approve' | 'reject' | 'cancel', notes: string) {
  const { error } = await supabase.rpc('admin_process_withdraw_request', {
    p_request_id: requestId,
    p_action: action,
    p_admin_notes: notes ?? null,
  });
  if (error) throw error;
}

export const AdminWithdrawTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { toast } = useToast();
  const { data, isLoading, error } = useAsyncResource<WithdrawRow[]>(
    useCallback(() => fetchAllWithdrawRequests(), []),
    { key: 'admin:withdraws' }
  );

  const [q, setQ] = useState('');
  const [active, setActive] = useState<WithdrawRow | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | 'cancel' | null>(null);

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const name = r.profiles?.nickname?.toLowerCase?.() ?? '';
      const phone = r.profiles?.phone ?? '';
      return name.includes(s) || phone.includes(s) || r.user_id.toLowerCase().includes(s);
    });
  }, [data, q]);

  const act = useCallback(
    async (action: 'approve' | 'reject' | 'cancel') => {
      if (!active) return;
      if ((notes ?? '').trim().length < 3) {
        toast({ title: 'Notes required (min 3 chars)', variant: 'destructive' });
        return;
      }
      setBusy(action);
      try {
        await adminProcessWithdraw(active.id, action, notes.trim());
        toast({ title: action === 'approve' ? 'Withdraw approved' : action === 'cancel' ? 'Withdraw cancelled (refunded)' : 'Withdraw rejected (refunded)' });
        __resetAsyncResourceCache();
        setActive(null);
        setNotes('');
        onChanged?.();
      } catch (e) {
        toast({ title: 'Action failed', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
      } finally {
        setBusy(null);
      }
    },
    [active, notes, onChanged, toast]
  );

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading withdraw requests…</div>;
  if (error) return <div className="py-12 text-center text-destructive">{error.message}</div>;

  return (
    <>
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">Review pending withdraw requests. Cancel/Reject refunds wallet automatically.</div>
        <Input className="sm:max-w-sm" placeholder="Search name / phone / user id" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="rounded-lg border border-border/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Net</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.profiles?.nickname ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{r.profiles?.phone ?? r.user_id.slice(0, 8)}</div>
                </TableCell>
                <TableCell className="font-semibold">₹{r.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell className="font-semibold">₹{r.net_amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>{r.method}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'pending' ? 'secondary' : r.status === 'approved' ? 'default' : 'destructive'}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => { setActive(r); setNotes(''); }}>
                    {r.status === 'pending' ? 'Review' : 'View'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No withdraw requests</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Withdraw Request — ₹{active?.amount.toLocaleString('en-IN')}</DialogTitle>
            <DialogDescription>
              Approve to finalize. Cancel/Reject will refund the gross amount back to wallet.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4 text-sm">
              <div>
                <div><span className="text-muted-foreground">User:</span> {active.profiles?.nickname} ({active.profiles?.phone})</div>
                <div><span className="text-muted-foreground">Method:</span> {active.method}</div>
                <div><span className="text-muted-foreground">Gross:</span> ₹{active.amount.toLocaleString('en-IN')}</div>
                <div><span className="text-muted-foreground">Tax:</span> ₹{active.tax_amount.toLocaleString('en-IN')}</div>
                <div><span className="text-muted-foreground">Net:</span> ₹{active.net_amount.toLocaleString('en-IN')}</div>
              </div>
              <Textarea placeholder="Admin notes (required)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
          {active?.status === 'pending' && (
            <DialogFooter>
              <Button variant="destructive" onClick={() => act('reject')} disabled={busy !== null}>
                {busy === 'reject' ? 'Rejecting…' : 'Reject'}
              </Button>
              <Button variant="outline" onClick={() => act('cancel')} disabled={busy !== null}>
                {busy === 'cancel' ? 'Cancelling…' : 'Cancel (Refund)'}
              </Button>
              <Button onClick={() => act('approve')} disabled={busy !== null}>
                {busy === 'approve' ? 'Approving…' : 'Approve'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

