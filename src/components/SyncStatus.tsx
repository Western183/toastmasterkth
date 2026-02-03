import { motion, AnimatePresence } from 'framer-motion';
import { Check, RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  className?: string;
}

export function SyncStatus({ isSyncing, lastSyncTime, className }: SyncStatusProps) {
  // Calculate how long ago the last sync was
  const getTimeAgo = () => {
    if (!lastSyncTime) return null;
    const seconds = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000);
    if (seconds < 5) return 'Just nu';
    if (seconds < 60) return `${seconds}s sedan`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m sedan`;
  };

  const timeAgo = getTimeAgo();

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      <AnimatePresence mode="wait">
        {isSyncing ? (
          <motion.div
            key="syncing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-muted-foreground"
          >
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Synkar...</span>
          </motion.div>
        ) : lastSyncTime ? (
          <motion.div
            key="synced"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-success"
          >
            <Check className="h-3 w-3" />
            <span className="text-muted-foreground">{timeAgo}</span>
          </motion.div>
        ) : (
          <motion.div
            key="offline"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 text-destructive"
          >
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
