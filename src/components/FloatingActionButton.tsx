import React from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchPublicAppSettings } from '@/services/appSettingsService';

const FloatingActionButton: React.FC = () => {
  const { data: appSettings } = useAsyncResource(fetchPublicAppSettings, {
    key: 'fab:public-app-settings',
  });

  const handleTelegramOpen = () => {
    const channel = appSettings?.telegramChannelUrl ?? 'https://t.me/UNIONVESTIND';
    window.open(channel, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.button
      onClick={handleTelegramOpen}
      className={cn(
        "fixed bottom-24 right-4 z-50 w-14 h-14 rounded-md shadow-valentine flex items-center justify-center",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90 transition-colors active:scale-95"
      )}
      whileTap={{ scale: 0.92 }}
      aria-label="Open Telegram channel"
      title="Open Telegram channel"
    >
      <Send className="w-6 h-6" strokeWidth={2.5} />
    </motion.button>
  );
};

export default FloatingActionButton;
