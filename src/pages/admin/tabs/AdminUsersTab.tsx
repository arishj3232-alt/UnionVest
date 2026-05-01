import React, { useCallback, useMemo, useState } from 'react';
import { useAsyncResource, __resetAsyncResourceCache } from '@/hooks/useAsyncResource';
import {
  fetchAllUsers,
  adminUpdateBalance,
  adminDisableUser,
  adminUpdateRole,
  type AdminUserRow,
} from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import type { AppRole } from '@/services/rolesService';

interface Props { onChanged: () => void; }
type ActionKind = 'balance' | 'role' | 'disable' | null;

export const AdminUsersTab: React.FC<Props> = ({ onChanged }) => {
  const { isSuperAdmin } = useUserRole();
  const { data, isLoading, error } = useAsyncResource<AdminUserRow[]>(
    useCallback(() => fetchAllUsers(), []),
    { key: 'admin:users' }
  );
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<AdminUserRow | null>(null);
  const [action, setAction] = useState<ActionKind>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [role, setRole] = useState<AppRole>('finance');
  const [grant, setGrant] = useState(true);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (u) => u.nickname.toLowerCase().includes(q) || u.phone.includes(q) || u.user_id.includes(q)
    );
  }, [data, search]);

  const openAction = useCallback((row: AdminUserRow, kind: ActionKind) => {
    setTarget(row);
    setAction(kind);
    setDelta('');
    setReason('');
    setRole('finance');
    setGrant(true);
  }, []);

  const close = () => { setTarget(null); setAction(null); };

  const submit = useCallback(async () => {
    if (!target || !action) return;
    if (reason.trim().length < 3) {
      toast({ title: 'Reason required (min 3 chars)', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      if (action === 'balance') {
        const n = Number(delta);
        if (!Number.isFinite(n) || n === 0) throw new Error('Enter a non-zero amount');
        await adminUpdateBalance(target.user_id, n, reason);
        toast({ title: 'Balance updated', description: `Δ ₹${n.toLocaleString('en-IN')}` });
      } else if (action === 'disable') {
        await adminDisableUser(target.user_id, !target.disabled_at, reason);
        toast({ title: target.disabled_at ? 'User enabled' : 'User disabled' });
      } else if (action === 'role') {
        await adminUpdateRole(target.user_id, role, grant, reason);
        toast({ title: grant ? `Granted ${role}` : `Revoked ${role}` });
      }
      __resetAsyncResourceCache();
      close();
      onChanged();
    } catch (err) {
      toast({ title: 'Action failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }, [action, target, delta, reason, role, grant, toast, onChanged]);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading users…</div>;
  if (error) return <div className="py-12 text-center text-destructive">{error.message}</div>;

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Search by name, phone or user id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-lg border border-border/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell>
                  <div className="font-medium">{u.nickname}</div>
                  <div className="text-xs text-muted-foreground">{u.user_id.slice(0, 8)}…</div>
                </TableCell>
                <TableCell>+91 {u.phone}</TableCell>
                <TableCell className="font-semibold">₹{u.balance.toLocaleString('en-IN')}</TableCell>
                <TableCell>
                  {u.disabled_at
                    ? <Badge variant="destructive">disabled</Badge>
                    : <Badge variant="outline">active</Badge>}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openAction(u, 'balance')}>Balance</Button>
                  {isSuperAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openAction(u, 'role')}>Role</Button>
                      <Button
                        size="sm"
                        variant={u.disabled_at ? 'default' : 'destructive'}
                        onClick={() => openAction(u, 'disable')}
                      >
                        {u.disabled_at ? 'Enable' : 'Disable'}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!target && !!action} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'balance' && `Adjust balance — ${target?.nickname}`}
              {action === 'role' && `Manage role — ${target?.nickname}`}
              {action === 'disable' && `${target?.disabled_at ? 'Enable' : 'Disable'} — ${target?.nickname}`}
            </DialogTitle>
            <DialogDescription>
              Provide a clear reason for audit logs before confirming this admin action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {action === 'balance' && (
              <>
                <div className="text-sm text-muted-foreground">
                  Current balance: ₹{target?.balance.toLocaleString('en-IN')}
                </div>
                <Input
                  type="number"
                  placeholder="Delta (positive to credit, negative to debit)"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                />
              </>
            )}
            {action === 'role' && (
              <div className="grid grid-cols-2 gap-3">
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">super_admin</SelectItem>
                    <SelectItem value="finance">finance</SelectItem>
                    <SelectItem value="support">support</SelectItem>
                    <SelectItem value="user">user</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={grant ? 'grant' : 'revoke'} onValueChange={(v) => setGrant(v === 'grant')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grant">Grant</SelectItem>
                    <SelectItem value="revoke">Revoke</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Textarea
              placeholder="Reason (audit log) — required, min 3 chars"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? 'Submitting…' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};