import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return { toast: context };
};

const ToastComponent: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (elapsed >= toast.duration) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [toast.duration, toast.id, onDismiss]);

  const typeConfig = {
    success: {
      bg: 'bg-emerald-550/10 border-emerald-500/20 text-emerald-500 dark:bg-emerald-500/10 dark:border-emerald-500/35',
      progressBg: 'bg-emerald-500',
      icon: <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
    },
    error: {
      bg: 'bg-error/15 border-error/20 text-error',
      progressBg: 'bg-error',
      icon: <XCircle size={16} className="shrink-0 text-error" />
    },
    warning: {
      bg: 'bg-accent-saffron/10 border-accent-saffron/20 text-accent-saffron',
      progressBg: 'bg-accent-saffron',
      icon: <AlertTriangle size={16} className="shrink-0 text-accent-saffron" />
    },
    info: {
      bg: 'bg-accent-blue/10 border-accent-blue/20 text-accent-blue',
      progressBg: 'bg-accent-blue',
      icon: <Info size={16} className="shrink-0 text-accent-blue" />
    }
  };

  const config = typeConfig[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative w-full max-w-sm overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-md flex items-start space-x-3 text-sm md:text-[11px] leading-tight ${config.bg}`}
      role="alert"
      aria-live="assertive"
    >
      {config.icon}
      <div className="flex-1 pr-6 font-semibold font-sans break-words">{toast.message}</div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute right-3 top-3.5 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-current/60 hover:text-current transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 dark:bg-white/5">
        <div 
          className={`h-full transition-all duration-30 ease-linear ${config.progressBg}`} 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </motion.div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = type === 'error' ? 5000 : 3500;
    setToasts((prev) => {
      const next = [...prev, { id, message, type, duration }];
      if (next.length > 3) {
        return next.slice(next.length - 3);
      }
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    warning: (msg: string) => addToast(msg, 'warning'),
    info: (msg: string) => addToast(msg, 'info'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 md:left-auto z-9999 flex flex-col items-center md:items-end space-y-3 pointer-events-none max-w-sm mx-auto md:mx-0 w-auto">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto w-full">
              <ToastComponent toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
