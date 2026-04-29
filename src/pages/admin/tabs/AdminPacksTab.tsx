import React, { useCallback, useMemo, useState } from 'react';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { adminAdjustPackDuration, adminAdjustPackEarning, adminPausePack, fetchPackControls } from '@/services/adminService';
import { getAllPacks } from '@/data/packs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

export const AdminPacksTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [earningInput, setEarningInput] = useState<Record<string, string>>({});
  const [durationInput, setDurationInput] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  const { data: controls } = useAsyncResource(useCallback(() => fetchPackControls(), []), {
    key: `admin:pack-controls:${refreshKey}`,
  });

  const rows = useMemo(() => {
    const controlMap = new Map((controls ?? []).map((c) => [c.pack_id, c]));
    return getAllPacks().map((pack) => ({ pack, control: controlMap.get(pack.id) }));
  }, [controls]);

  const onPauseToggle = useCallback(async (packId: string, paused: boolean) => {
    setBusyPack(packId);
    try {
      await adminPausePack(packId, paused, noteInput[packId] ?? '');
      toast({ title: paused ? 'Pack paused' : 'Pack resumed' });
      setRefreshKey((k) => k + 1);
      onChanged?.();
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setBusyPack(null);
    }
  }, [noteInput, onChanged, toast]);

  const onAdjustEarning = useCallback(async (packId: string, fallbackValue: number) => {
    const raw = earningInput[packId];
    const next = raw == null || raw.trim() === '' ? fallbackValue : Number(raw);
    if (!Number.isFinite(next) || next < 0) {
      toast({ title: 'Invalid value', description: 'Enter a valid daily earning number.', variant: 'destructive' });
      return;
    }
    setBusyPack(packId);
    try {
      await adminAdjustPackEarning(packId, next, noteInput[packId] ?? '');
      toast({ title: 'Daily earning updated' });
      setRefreshKey((k) => k + 1);
      onChanged?.();
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setBusyPack(null);
    }
  }, [earningInput, noteInput, onChanged, toast]);

  const onAdjustDuration = useCallback(async (packId: string, fallbackValue: number) => {
    const raw = durationInput[packId];
    const next = raw == null || raw.trim() === '' ? fallbackValue : Number(raw);
    if (!Number.isFinite(next) || next < 1) {
      toast({ title: 'Invalid value', description: 'Enter a valid duration in days.', variant: 'destructive' });
      return;
    }
    setBusyPack(packId);
    try {
      await adminAdjustPackDuration(packId, next, noteInput[packId] ?? '');
      toast({ title: 'Duration updated' });
      setRefreshKey((k) => k + 1);
      onChanged?.();
    } catch (e) {
      toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setBusyPack(null);
    }
  }, [durationInput, noteInput, onChanged, toast]);

  return (
    <div className="rounded-lg border border-border/40 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pack</TableHead>
            <TableHead>Base Daily</TableHead>
            <TableHead>Effective Daily</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Controls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ pack, control }) => {
            const effective = control?.daily_earning_override ?? pack.dailyEarning;
            const duration = control?.duration_override ?? pack.duration;
            const paused = !!control?.is_paused;
            return (
              <TableRow key={pack.id}>
                <TableCell>
                  <div className="font-medium">{pack.name}</div>
                  <div className="text-xs text-muted-foreground">{pack.id}</div>
                </TableCell>
                <TableCell>₹{pack.dailyEarning.toLocaleString('en-IN')}</TableCell>
                <TableCell>₹{effective.toLocaleString('en-IN')}</TableCell>
                <TableCell>{duration}d</TableCell>
                <TableCell>
                  <Badge variant={paused ? 'destructive' : 'secondary'}>{paused ? 'Paused' : 'Active'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      className="w-28"
                      type="number"
                      min={0}
                      placeholder="Daily"
                      value={earningInput[pack.id] ?? String(effective)}
                      onChange={(e) => setEarningInput((p) => ({ ...p, [pack.id]: e.target.value }))}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      min={1}
                      placeholder="Days"
                      value={durationInput[pack.id] ?? String(duration)}
                      onChange={(e) => setDurationInput((p) => ({ ...p, [pack.id]: e.target.value }))}
                    />
                    <Input
                      className="w-44"
                      placeholder="Admin note"
                      value={noteInput[pack.id] ?? ''}
                      onChange={(e) => setNoteInput((p) => ({ ...p, [pack.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyPack === pack.id}
                      onClick={() => onAdjustEarning(pack.id, effective)}
                    >
                      Daily
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyPack === pack.id}
                      onClick={() => onAdjustDuration(pack.id, duration)}
                    >
                      Duration
                    </Button>
                    <Button
                      size="sm"
                      variant={paused ? 'default' : 'destructive'}
                      disabled={busyPack === pack.id}
                      onClick={() => onPauseToggle(pack.id, !paused)}
                    >
                      {paused ? 'Resume' : 'Pause'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
