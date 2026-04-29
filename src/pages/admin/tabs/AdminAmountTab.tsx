import React, { useCallback, useMemo, useState } from 'react';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { adminAdjustPackAmounts, fetchPackControls } from '@/services/adminService';
import { getAllPacks } from '@/data/packs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

export const AdminAmountTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyPack, setBusyPack] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<Record<string, string>>({});
  const [revenueInput, setRevenueInput] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  const { data: controls } = useAsyncResource(useCallback(() => fetchPackControls(), []), {
    key: `admin:amount-controls:${refreshKey}`,
  });

  const rows = useMemo(() => {
    const controlMap = new Map((controls ?? []).map((c) => [c.pack_id, c]));
    return getAllPacks().map((pack) => ({ pack, control: controlMap.get(pack.id) }));
  }, [controls]);

  const onAdjustAmounts = useCallback(
    async (packId: string, fallbackPrice: number, fallbackRevenue: number) => {
      const rawPrice = priceInput[packId];
      const rawRevenue = revenueInput[packId];
      const nextPrice = rawPrice == null || rawPrice.trim() === '' ? fallbackPrice : Number(rawPrice);
      const nextRevenue = rawRevenue == null || rawRevenue.trim() === '' ? fallbackRevenue : Number(rawRevenue);
      if (!Number.isFinite(nextPrice) || nextPrice <= 0 || !Number.isFinite(nextRevenue) || nextRevenue < 0) {
        toast({ title: 'Invalid values', description: 'Enter valid investment and revenue amounts.', variant: 'destructive' });
        return;
      }

      setBusyPack(packId);
      try {
        await adminAdjustPackAmounts(packId, nextPrice, nextRevenue, noteInput[packId] ?? '');
        toast({ title: 'Amounts updated' });
        setRefreshKey((k) => k + 1);
        onChanged?.();
      } catch (e) {
        toast({ title: 'Update failed', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
      } finally {
        setBusyPack(null);
      }
    },
    [noteInput, onChanged, priceInput, revenueInput, toast]
  );

  return (
    <div className="rounded-lg border border-border/40 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pack</TableHead>
            <TableHead>Investment Amount</TableHead>
            <TableHead>Total Revenue</TableHead>
            <TableHead>Controls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ pack, control }) => {
            const price = control?.price_override ?? pack.price;
            const revenue = control?.total_revenue_override ?? pack.totalRevenue;
            return (
              <TableRow key={pack.id}>
                <TableCell>
                  <div className="font-medium">{pack.name}</div>
                  <div className="text-xs text-muted-foreground">{pack.id}</div>
                </TableCell>
                <TableCell>₹{price.toLocaleString('en-IN')}</TableCell>
                <TableCell>₹{revenue.toLocaleString('en-IN')}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      className="w-28"
                      type="number"
                      min={1}
                      placeholder="Investment"
                      value={priceInput[pack.id] ?? String(price)}
                      onChange={(e) => setPriceInput((p) => ({ ...p, [pack.id]: e.target.value }))}
                    />
                    <Input
                      className="w-28"
                      type="number"
                      min={0}
                      placeholder="Revenue"
                      value={revenueInput[pack.id] ?? String(revenue)}
                      onChange={(e) => setRevenueInput((p) => ({ ...p, [pack.id]: e.target.value }))}
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
                      onClick={() => onAdjustAmounts(pack.id, price, revenue)}
                    >
                      Update
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
