import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import {
  adminUpsertPublicAppSettings,
  fetchPublicAppSettings,
  type PublicAppSettings,
} from '@/services/appSettingsService';

export const AdminContactTab: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
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
    key: 'admin:public-app-settings',
  });

  useEffect(() => {
    if (!data) return;
    setForm(data);
  }, [data]);

  const onSave = async () => {
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

      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Contact Settings'}
      </Button>
    </div>
  );
};
