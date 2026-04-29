import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';

export interface PublicAppSettings {
  telegramId: string;
  telegramChannelUrl: string;
  upiVpa: string;
  withdrawStartTime: string; // HH:MM (IST)
  withdrawEndTime: string; // HH:MM (IST)
  staticQrPath: string;
  staticQrUrl: string;
}

const DEFAULT_SETTINGS: PublicAppSettings = {
  telegramId: 'zorokun142',
  telegramChannelUrl: 'https://t.me/UNIONVESTIND',
  upiVpa: '',
  withdrawStartTime: '10:00',
  withdrawEndTime: '16:00',
  staticQrPath: '',
  staticQrUrl: '',
};

const DEFAULT_TELEGRAM_CHANNEL_URL = 'https://t.me/UNIONVESTIND';

function normalizeTelegramChannelUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return DEFAULT_TELEGRAM_CHANNEL_URL;

  if (value.startsWith('@')) {
    return `https://t.me/${value.slice(1)}`;
  }

  if (/^[a-zA-Z0-9_]{5,}$/.test(value)) {
    return `https://t.me/${value}`;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      if (parsed.hostname === 't.me' || parsed.hostname === 'www.t.me') {
        return value;
      }
    } catch {
      return DEFAULT_TELEGRAM_CHANNEL_URL;
    }
  }

  return DEFAULT_TELEGRAM_CHANNEL_URL;
}

type SettingKey =
  | 'telegram_id'
  | 'telegram_channel_url'
  | 'upi_vpa'
  | 'withdraw_start_time'
  | 'withdraw_end_time'
  | 'static_qr_url';

const keyMap: Record<
  SettingKey,
  'telegramId' | 'telegramChannelUrl' | 'upiVpa' | 'withdrawStartTime' | 'withdrawEndTime' | 'staticQrPath'
> = {
  telegram_id: 'telegramId',
  telegram_channel_url: 'telegramChannelUrl',
  upi_vpa: 'upiVpa',
  withdraw_start_time: 'withdrawStartTime',
  withdraw_end_time: 'withdrawEndTime',
  static_qr_url: 'staticQrPath',
};

function normalizeTimeHHMM(value: string, fallback: string): string {
  const v = value.trim();
  if (!v) return fallback;
  const m = v.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return fallback;
  return `${m[1]}:${m[2]}`;
}

export async function fetchPublicAppSettings(): Promise<PublicAppSettings> {
  return safeAsync({ scope: 'fetchPublicAppSettings' }, async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', Object.keys(keyMap))
      .eq('is_public', true);

    if (error) {
      const hint = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
      if (hint.includes('pgrst205') || hint.includes("could not find the table 'public.app_settings'")) {
        return DEFAULT_SETTINGS;
      }
      throw error;
    }

    const next: PublicAppSettings = { ...DEFAULT_SETTINGS };
    for (const row of data ?? []) {
      const key = row.key as SettingKey;
      const mapped = keyMap[key];
      if (mapped) {
        next[mapped] = row.value ?? '';
      }
    }

    if (next.staticQrPath) {
      const { data: signed } = await supabase.storage
        .from('payment-screenshots')
        .createSignedUrl(next.staticQrPath, 60 * 10);
      if (signed?.signedUrl) {
        next.staticQrUrl = signed.signedUrl;
      } else {
        next.staticQrUrl = '';
      }
    }
    next.telegramChannelUrl = normalizeTelegramChannelUrl(next.telegramChannelUrl);
    next.withdrawStartTime = normalizeTimeHHMM(next.withdrawStartTime, DEFAULT_SETTINGS.withdrawStartTime);
    next.withdrawEndTime = normalizeTimeHHMM(next.withdrawEndTime, DEFAULT_SETTINGS.withdrawEndTime);
    return next;
  });
}

export async function adminUpsertPublicAppSettings(input: PublicAppSettings): Promise<void> {
  return safeAsync({ scope: 'adminUpsertPublicAppSettings' }, async () => {
    const payload = [
      { key: 'telegram_id', value: input.telegramId.trim(), is_public: true },
      { key: 'telegram_channel_url', value: normalizeTelegramChannelUrl(input.telegramChannelUrl), is_public: true },
      { key: 'upi_vpa', value: input.upiVpa.trim(), is_public: true },
      {
        key: 'withdraw_start_time',
        value: normalizeTimeHHMM(input.withdrawStartTime, DEFAULT_SETTINGS.withdrawStartTime),
        is_public: true,
      },
      {
        key: 'withdraw_end_time',
        value: normalizeTimeHHMM(input.withdrawEndTime, DEFAULT_SETTINGS.withdrawEndTime),
        is_public: true,
      },
      { key: 'static_qr_url', value: input.staticQrPath.trim(), is_public: true },
    ];

    const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'key' });
    if (error) throw error;
  });
}

export async function uploadStaticQrImage(file: File): Promise<string> {
  return safeAsync({ scope: 'uploadStaticQrImage' }, async () => {
    const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
    const filePath = `qr-config/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('payment-screenshots').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    return filePath;
  });
}
