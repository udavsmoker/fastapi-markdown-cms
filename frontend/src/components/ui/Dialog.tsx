import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          {/* Dialog Container */}
          <div className="relative z-10 w-full max-w-lg p-4">
            {children}
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export function DialogContent({ children, className }: DialogContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative w-full overflow-hidden text-slate-100",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4">
      {children}
    </div>
  );
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn("text-lg font-bold leading-none text-white", className)}>
      {children}
    </h3>
  );
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2 mt-6">
      {children}
    </div>
  );
}
