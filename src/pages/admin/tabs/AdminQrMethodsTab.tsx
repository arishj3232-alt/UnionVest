import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { __resetAsyncResourceCache, useAsyncResource } from '@/hooks/useAsyncResource';
import {
  adminRememberUpiVpa,
  adminUpsertPublicAppSettings,
  fetchPublicAppSettings,
  listUpiVpaHistory,
  listUploadedQrHistory,
  type PaymentMethodStatus,
  type PublicAppSettings,
  type QrHistoryItem,
  uploadStaticQrImage,
} from '@/services/appSettingsService';
import paymentQRFallback from '@/assets/payment-qr.png';

const statusOptions: Array<{ value: PaymentMethodStatus; label: string }> = [
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'out_of_service', label: 'Out of Service' },
];

export const AdminQrMethodsTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrHistory, setQrHistory] = useState<QrHistoryItem[]>([]);
  const [upiHistory, setUpiHistory] = useState<string[]>([]);
  const [form, setForm] = useState<PublicAppSettings>({
    telegramId: '',
    telegramChannelUrl: '',
    upiVpa: '',
    upiQrStatus: 'enabled',
    directPayStatus: 'disabled',
    usdtStatus: 'enabled',
    withdrawStartTime: '10:00',
    withdrawEndTime: '16:00',
    staticQrPath: '',
    staticQrUrl: '',
  });

  const { data, isLoading } = useAsyncResource(useCallback(() => fetchPublicAppSettings(), []), {
    key: 'admin:qr-methods',
  });

  useEffect(() => {
    if (!data) return;
    setForm(data);
  }, [data]);

  const refreshQrHistory = useCallback(async () => {
    try {
      const rows = await listUploadedQrHistory();
      setQrHistory(rows);
    } catch {
      setQrHistory([]);
    }
  }, []);

  useEffect(() => {
    void refreshQrHistory();
  }, [refreshQrHistory]);

  const refreshUpiHistory = useCallback(async () => {
    try {
      const rows = await listUpiVpaHistory();
      setUpiHistory(rows);
    } catch {
      setUpiHistory([]);
    }
  }, []);

  useEffect(() => {
    void refreshUpiHistory();
  }, [refreshUpiHistory]);

  const onSelectQrFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be below 5MB', variant: 'destructive' });
      return;
    }

    setIsUploadingQr(true);
    try {
      const path = await uploadStaticQrImage(file);
      const localPreview = URL.createObjectURL(file);
      setForm((prev) => ({ ...prev, staticQrPath: path, staticQrUrl: localPreview }));
      await refreshQrHistory();
      toast({ title: 'QR image uploaded' });
    } catch (error) {
      toast({
        title: 'QR upload failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingQr(false);
    }
  };

  const onReuseQrFromHistory = useCallback(
    (item: QrHistoryItem) => {
      setForm((prev) => ({
        ...prev,
        staticQrPath: item.path,
        staticQrUrl: item.url,
      }));
      toast({ title: 'Selected this QR', description: 'Click "Save QR and Methods" to make it live for users.' });
    },
    [toast]
  );

  const onSave = async () => {
    if (!form.upiVpa.trim()) {
      toast({ title: 'UPI ID required', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await adminUpsertPublicAppSettings(form);
      await adminRememberUpiVpa(form.upiVpa);
      __resetAsyncResourceCache();
      await refreshQrHistory();
      await refreshUpiHistory();
      toast({ title: 'QR and payment methods updated' });
      onChanged?.();
    } catch (error) {
      toast({
        title: 'Failed to update settings',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !data) {
    return <div className="text-sm text-muted-foreground">Loading QR and methods...</div>;
  }

  const runningQrSrc = form.staticQrUrl || paymentQRFallback;
  const runningQrIsCustom = Boolean(form.staticQrUrl);

  return (
    <div className="max-w-3xl space-y-5 rounded-lg border border-border/40 p-5">
      <div>
        <h3 className="text-base font-semibold">QR and Methods</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Control payment QR, UPI ID and method availability in Deposit.
        </p>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Currently Running</p>
        <p className="text-sm">
          Active UPI ID: <span className="font-semibold">{form.upiVpa || '-'}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {runningQrIsCustom ? 'Custom uploaded QR (same as users see in Deposit).' : 'Built-in fallback QR (same as users see when no custom QR is saved).'}
        </p>
        <img
          src={runningQrSrc}
          alt={runningQrIsCustom ? 'Current active custom QR' : 'Built-in fallback QR'}
          className="mt-2 w-40 h-40 rounded-md border border-border object-contain p-2 bg-card"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">QR History</label>
        {qrHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No uploaded QR history found.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {qrHistory.map((item, idx) => {
              const status =
                item.path === form.staticQrPath
                  ? 'running'
                  : idx === 0 || (idx === 1 && qrHistory[0]?.path === form.staticQrPath)
                    ? 'old'
                    : 'stopped';
              const canReuse = item.path !== form.staticQrPath;
              return (
                <div key={item.path} className="rounded-md border border-border p-2">
                  <img src={item.url} alt={item.name} className="w-full h-32 object-contain rounded bg-card" />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs truncate max-w-[70%]" title={item.name}>{item.name}</span>
                    <span className="text-[10px] uppercase font-semibold">{status}</span>
                  </div>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant={canReuse ? 'secondary' : 'outline'}
                      className="w-full h-8 text-xs"
                      disabled={!canReuse}
                      onClick={() => onReuseQrFromHistory(item)}
                    >
                      {canReuse ? 'Reuse' : 'Currently selected'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">UPI ID</label>
        <Input
          value={form.upiVpa}
          onChange={(e) => setForm((prev) => ({ ...prev, upiVpa: e.target.value }))}
          placeholder="yourname@upi"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">UPI ID History</label>
        {upiHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">No UPI ID history yet. Saved IDs will appear here.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {upiHistory.map((item) => {
              const isCurrent = item === form.upiVpa;
              return (
                <div key={item} className="rounded-md border border-border p-2 flex items-center justify-between gap-2">
                  <span className="text-xs truncate" title={item}>{item}</span>
                  <Button
                    type="button"
                    variant={isCurrent ? 'outline' : 'secondary'}
                    className="h-7 text-[11px] px-2"
                    disabled={isCurrent}
                    onClick={() => setForm((prev) => ({ ...prev, upiVpa: item }))}
                  >
                    {isCurrent ? 'Current' : 'Reuse'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">UPI QR</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.upiQrStatus}
            onChange={(e) => setForm((prev) => ({ ...prev, upiQrStatus: e.target.value as PaymentMethodStatus }))}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Direct Pay</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.directPayStatus}
            onChange={(e) => setForm((prev) => ({ ...prev, directPayStatus: e.target.value as PaymentMethodStatus }))}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">USDT</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.usdtStatus}
            onChange={(e) => setForm((prev) => ({ ...prev, usdtStatus: e.target.value as PaymentMethodStatus }))}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Normal QR Image</label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelectQrFile(file);
          }}
          disabled={isUploadingQr}
        />
        <div className="space-y-2">
          <img
            src={form.staticQrUrl || paymentQRFallback}
            alt="Normal QR preview"
            className="w-56 h-56 rounded-md border border-border object-contain p-2 bg-card"
          />
          {!form.staticQrUrl && (
            <p className="text-xs text-muted-foreground">Preview shows built-in fallback until you upload and save a custom image.</p>
          )}
        </div>
      </div>

      <Button onClick={onSave} disabled={isSaving || isUploadingQr}>
        {isSaving ? 'Saving...' : isUploadingQr ? 'Uploading QR...' : 'Save QR and Methods'}
      </Button>
    </div>
  );
};
