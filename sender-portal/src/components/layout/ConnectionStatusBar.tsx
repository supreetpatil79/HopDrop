import { AnimatePresence, motion } from 'framer-motion';
import { useOnlineStatus, useSocketStatus } from 'hopdrop-shared';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

export function ConnectionStatusBar() {
  const { isAuthenticated } = useAuth();
  const socket = useSocket();
  const isOnline = useOnlineStatus();
  const { status, attempt } = useSocketStatus(isAuthenticated ? socket : null);

  let banner: { message: string; className: string } | null = null;

  if (!isOnline) {
    banner = {
      message: 'You are offline. Live delivery updates will resume automatically once your connection returns.',
      className: 'border-red-200/80 bg-red-50/90 text-red-800'
    };
  }

  return (
    <AnimatePresence initial={false}>
      {banner ? (
        <motion.div
          key={banner.message}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`border-b px-4 py-2 text-center text-sm font-medium shadow-[0_12px_30px_-28px_rgba(15,23,42,0.45)] ${banner.className}`}
        >
          {banner.message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
