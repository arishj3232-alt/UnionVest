import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  adminUpsertPublicAppSettings,
  fetchPublicAppSettings,
  type PublicAppSettings,
  uploadStaticQrImage,
} from '@/services/appSettingsService';

export const AdminContactTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<PublicAppSettings>({
    telegramId: '',
    telegramChannelUrl: '',
    upiVpa: '',
    withdrawStartTime: '10:00',
    withdrawEndTime: '16:00',
    staticQrPath: '',
    staticQrUrl: '',
  });
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  const { data, isLoading } = useAsyncResource(useCallback(() => fetchPublicAppSettings(), []), {
    key: 'admin:public-app-settings',
  });

  useEffect(() => {
    if (!data) return;
    setForm(data);
  }, [data]);

  const onSave = async () => {
    if (!form.telegramId.trim()) {
      toast({ title: 'Telegram ID required', variant: 'destructive' });
      return;
    }
    if (!form.telegramChannelUrl.trim()) {
      toast({ title: 'Telegram channel link required', variant: 'destructive' });
      return;
    }
    if (!form.upiVpa.trim()) {
      toast({ title: 'UPI ID required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await adminUpsertPublicAppSettings(form);
      toast({ title: 'Contact settings updated' });
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
    return <div className="text-sm text-muted-foreground">Loading contact settings...</div>;
  }

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
      setForm((prev) => ({ ...prev, staticQrPath: path }));
      const localPreview = URL.createObjectURL(file);
      setForm((prev) => ({ ...prev, staticQrUrl: localPreview }));
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

  return (
    <div className="max-w-2xl space-y-5 rounded-lg border border-border/40 p-5">
      <div>
        <h3 className="text-base font-semibold">Telegram & QR Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">
          These values are public and used in Help & Support and Recharge pages.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Telegram ID</label>
        <Input
          value={form.telegramId}
          onChange={(e) => setForm((prev) => ({ ...prev, telegramId: e.target.value }))}
          placeholder="zorokun142"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Telegram Channel Link</label>
        <Input
          value={form.telegramChannelUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, telegramChannelUrl: e.target.value }))}
          placeholder="https://t.me/UNIONVESTIND"
        />
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
        <label className="text-sm font-medium">Withdraw Hours (IST)</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Start</label>
            <Input
              type="time"
              value={form.withdrawStartTime}
              onChange={(e) => setForm((prev) => ({ ...prev, withdrawStartTime: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">End</label>
            <Input
              type="time"
              value={form.withdrawEndTime}
              onChange={(e) => setForm((prev) => ({ ...prev, withdrawEndTime: e.target.value }))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Users can request withdrawals only during this window.</p>
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
        {form.staticQrUrl ? (
          <img src={form.staticQrUrl} alt="Normal QR preview" className="w-48 h-48 rounded-md border border-border object-contain p-2 bg-card" />
        ) : (
          <p className="text-xs text-muted-foreground">No custom QR uploaded. Built-in fallback will be used.</p>
        )}
      </div>

      <Button onClick={onSave} disabled={isSaving || isUploadingQr}>
        {isSaving ? 'Saving...' : isUploadingQr ? 'Uploading QR...' : 'Save Contact Settings'}
      </Button>
    </div>
  );
};
