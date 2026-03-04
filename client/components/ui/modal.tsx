import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ModalProps {
  isVisible: boolean;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  onBackdropClick?: () => void;
}

export function Modal({
  isVisible,
  children,
  className,
  overlayClassName,
  onBackdropClick,
}: ModalProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
            overlayClassName,
          )}
          onClick={onBackdropClick}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'bg-card text-card-foreground rounded-lg border shadow-lg',
              className,
            )}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
