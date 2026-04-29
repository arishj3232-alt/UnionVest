import React, { useCallback, useState } from 'react';
import { useAsyncResource, __resetAsyncResourceCache } from '@/hooks/useAsyncResource';
import {
  fetchAllRechargeRequests,
  adminApproveRecharge,
  getScreenshotSignedUrl,
  fetchRechargePayments,
  type AdminRechargeRequest,
  type AdminRechargePaymentRow,
} from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Props { onChanged: () => void; }

const extractReferenceFromScreenshotPath = (path: string | null) => {
  if (!path) return null;
  const filename = path.split('/').pop() ?? '';
  const match = filename.match(/^\d+-(.+?)\.[a-zA-Z0-9]+$/);
  return match?.[1] ?? null;
};

const parsePaymentReference = (reference: string | null) => {
  if (!reference) return { note: null as string | null, utr: null as string | null };
  const [note, ...rest] = reference.split('|');
  const utr = rest.join('|').trim() || null;
  return { note: note?.trim() || null, utr };
};

export const AdminRechargeTab: React.FC<Props> = ({ onChanged }) => {
  const { data, isLoading, error } = useAsyncResource<AdminRechargeRequest[]>(
    useCallback(() => fetchAllRechargeRequests(), []),
    { key: 'admin:recharges' }
  );
  const { toast } = useToast();
  const [active, setActive] = useState<AdminRechargeRequest | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [paymentRows, setPaymentRows] = useState<AdminRechargePaymentRow[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const openRow = useCallback(async (row: AdminRechargeRequest) => {
    setActive(row);
    setNotes('');
    setScreenshotUrl(null);
    setPaymentRows([]);
    if (row.screenshot_url) {
      const url = await getScreenshotSignedUrl(row.screenshot_url);
      setScreenshotUrl(url);
    }
    const rows = await fetchRechargePayments(row.id);
    setPaymentRows(rows);
  }, []);

  const act = useCallback(async (action: 'approve' | 'reject') => {
    if (!active) return;
    setBusy(action);
    try {
      await adminApproveRecharge(active.id, action, notes || undefined);
      toast({ title: action === 'approve' ? 'Recharge approved' : 'Recharge rejected' });
      __resetAsyncResourceCache();
      setActive(null);
      onChanged();
    } catch (err) {
      toast({ title: 'Action failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }, [active, notes, toast, onChanged]);

  if (isLoading) return <div className="py-12 text-center text-muted-foreground">Loading recharges…</div>;
  if (error) return <div className="py-12 text-center text-destructive">{error.message}</div>;

  return (
    <>
      <div className="rounded-lg border border-border/40 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.profiles?.nickname ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{r.profiles?.phone ?? r.user_id.slice(0, 8)}</div>
                </TableCell>
                <TableCell className="font-semibold">₹{r.amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'pending' ? 'secondary' : r.status === 'approved' ? 'default' : 'destructive'}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => openRow(r)}>
                    {r.status === 'pending' ? 'Review' : 'View'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No recharge requests</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Recharge Request — ₹{active?.amount.toLocaleString('en-IN')}</DialogTitle>
            <DialogDescription>
              Review payment proof, add an optional note, then approve or reject this recharge request.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="text-sm">
                <div><span className="text-muted-foreground">User:</span> {active.profiles?.nickname} ({active.profiles?.phone})</div>
                <div><span className="text-muted-foreground">Status:</span> {active.status}</div>
                {extractReferenceFromScreenshotPath(active.screenshot_url) && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>{' '}
                    {extractReferenceFromScreenshotPath(active.screenshot_url)}
                  </div>
                )}
                {active.admin_notes && <div><span className="text-muted-foreground">Previous notes:</span> {active.admin_notes}</div>}
              </div>
              {screenshotUrl ? (
                <a href={screenshotUrl} target="_blank" rel="noreferrer">
                  <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-md border border-border/40" />
                </a>
              ) : active.screenshot_url ? (
                <div className="text-xs text-muted-foreground">Loading screenshot…</div>
              ) : (
                <div className="text-xs text-muted-foreground">No screenshot uploaded.</div>
              )}

              {paymentRows.length > 0 && (
                <div className="rounded-md border border-border/40 p-3">
                  <div className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">
                    Payment proofs ({paymentRows.length})
                  </div>
                  <div className="space-y-2">
                    {paymentRows.map((p) => (
                      <div key={p.id} className="text-xs flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold">
                            ₹{p.amount.toLocaleString('en-IN')} · {p.method}
                          </div>
                          {(() => {
                            const { note, utr } = parsePaymentReference(p.reference);
                            return (
                              <>
                                {note && (
                                  <div className="text-muted-foreground break-words">
                                    Note: <span className="font-semibold">{note}</span>
                                  </div>
                                )}
                                {utr && (
                                  <div className="text-muted-foreground break-words">UTR: {utr}</div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        {p.screenshot_url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const url = await getScreenshotSignedUrl(p.screenshot_url!);
                              if (url) window.open(url, '_blank', 'noreferrer');
                            }}
                          >
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {active.status === 'pending' && (
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )}
            </div>
          )}
          {active?.status === 'pending' && (
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => act('reject')}
                disabled={busy !== null}
              >
                {busy === 'reject' ? 'Rejecting…' : 'Reject'}
              </Button>
              <Button onClick={() => act('approve')} disabled={busy !== null}>
                {busy === 'approve' ? 'Approving…' : 'Approve & Credit'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};