import { supabase } from '@/integrations/supabase/client';
import { safeAsync } from '@/lib/errorHandler';

export interface PublicAppSettings {
  telegramId: string;
  telegramChannelUrl: string;
  upiVpa: string;
  upiQrStatus: PaymentMethodStatus;
  directPayStatus: PaymentMethodStatus;
  usdtStatus: PaymentMethodStatus;
  withdrawStartTime: string; // HH:MM (IST)
  withdrawEndTime: string; // HH:MM (IST)
  staticQrPath: string;
  staticQrUrl: string;
}

export type PaymentMethodStatus = 'enabled' | 'disabled' | 'out_of_service';

const DEFAULT_SETTINGS: PublicAppSettings = {
  telegramId: 'zorokun142',
  telegramChannelUrl: 'https://t.me/UNIONVESTIND',
  upiVpa: '',
  upiQrStatus: 'enabled',
  directPayStatus: 'disabled',
  usdtStatus: 'enabled',
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
  | 'upi_qr_status'
  | 'direct_pay_status'
  | 'usdt_status'
  | 'withdraw_start_time'
  | 'withdraw_end_time'
  | 'static_qr_url';

const keyMap: Record<
  SettingKey,
  | 'telegramId'
  | 'telegramChannelUrl'
  | 'upiVpa'
  | 'upiQrStatus'
  | 'directPayStatus'
  | 'usdtStatus'
  | 'withdrawStartTime'
  | 'withdrawEndTime'
  | 'staticQrPath'
> = {
  telegram_id: 'telegramId',
  telegram_channel_url: 'telegramChannelUrl',
  upi_vpa: 'upiVpa',
  upi_qr_status: 'upiQrStatus',
  direct_pay_status: 'directPayStatus',
  usdt_status: 'usdtStatus',
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

function normalizePaymentMethodStatus(value: string | undefined, fallback: PaymentMethodStatus): PaymentMethodStatus {
  if (!value) return fallback;
  if (value === 'enabled' || value === 'disabled' || value === 'out_of_service') return value;
  return fallback;
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
      const value = row.value ?? '';
      switch (key) {
        case 'telegram_id':
          next.telegramId = value;
          break;
        case 'telegram_channel_url':
          next.telegramChannelUrl = value;
          break;
        case 'upi_vpa':
          next.upiVpa = value;
          break;
        case 'upi_qr_status':
          next.upiQrStatus = value as PaymentMethodStatus;
          break;
        case 'direct_pay_status':
          next.directPayStatus = value as PaymentMethodStatus;
          break;
        case 'usdt_status':
          next.usdtStatus = value as PaymentMethodStatus;
          break;
        case 'withdraw_start_time':
          next.withdrawStartTime = value;
          break;
        case 'withdraw_end_time':
          next.withdrawEndTime = value;
          break;
        case 'static_qr_url':
          next.staticQrPath = value;
          break;
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
    next.upiQrStatus = normalizePaymentMethodStatus(next.upiQrStatus, DEFAULT_SETTINGS.upiQrStatus);
    next.directPayStatus = normalizePaymentMethodStatus(next.directPayStatus, DEFAULT_SETTINGS.directPayStatus);
    next.usdtStatus = normalizePaymentMethodStatus(next.usdtStatus, DEFAULT_SETTINGS.usdtStatus);
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
      { key: 'upi_qr_status', value: normalizePaymentMethodStatus(input.upiQrStatus, DEFAULT_SETTINGS.upiQrStatus), is_public: true },
      { key: 'direct_pay_status', value: normalizePaymentMethodStatus(input.directPayStatus, DEFAULT_SETTINGS.directPayStatus), is_public: true },
      { key: 'usdt_status', value: normalizePaymentMethodStatus(input.usdtStatus, DEFAULT_SETTINGS.usdtStatus), is_public: true },
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

export interface QrHistoryItem {
  path: string;
  name: string;
  url: string;
}

function extractTimestampFromQrName(name: string): number {
  const match = name.match(/^(\d{10,})-/);
  if (!match) return 0;
  return Number(match[1]) || 0;
}

export async function listUploadedQrHistory(): Promise<QrHistoryItem[]> {
  return safeAsync({ scope: 'listUploadedQrHistory' }, async () => {
    const { data, error } = await supabase.storage
      .from('payment-screenshots')
      .list('qr-config', {
        limit: 100,
        offset: 0,
      });

    if (error) throw error;
    const files = (data ?? [])
      .filter((f) => !!f.name && !f.name.endsWith('/'))
      .sort((a, b) => extractTimestampFromQrName(b.name) - extractTimestampFromQrName(a.name));

    const signed = await Promise.all(
      files.map(async (file) => {
        const path = `qr-config/${file.name}`;
        const { data: signedData } = await supabase.storage
          .from('payment-screenshots')
          .createSignedUrl(path, 60 * 10);
        return {
          path,
          name: file.name,
          url: signedData?.signedUrl ?? '',
        };
      })
    );

    return signed.filter((row) => !!row.url);
  });
}

const UPI_VPA_HISTORY_KEY = 'upi_vpa_history';
const MAX_UPI_VPA_HISTORY = 25;

export async function listUpiVpaHistory(): Promise<string[]> {
  return safeAsync({ scope: 'listUpiVpaHistory' }, async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', UPI_VPA_HISTORY_KEY)
      .maybeSingle();
    if (error) throw error;
    const raw = data?.value ?? '[]';
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v.length > 0)
        .slice(0, MAX_UPI_VPA_HISTORY);
    } catch {
      return [];
    }
  });
}

export async function adminRememberUpiVpa(upiVpa: string): Promise<void> {
  return safeAsync({ scope: 'adminRememberUpiVpa' }, async () => {
    const next = upiVpa.trim();
    if (!next) return;
    const existing = await listUpiVpaHistory();
    const nextLower = next.toLowerCase();
    const merged = [next, ...existing.filter((v) => v.toLowerCase() !== nextLower)].slice(0, MAX_UPI_VPA_HISTORY);
    const { error } = await supabase.from('app_settings').upsert(
      [{ key: UPI_VPA_HISTORY_KEY, value: JSON.stringify(merged), is_public: true }],
      { onConflict: 'key' }
    );
    if (error) throw error;
  });
}
