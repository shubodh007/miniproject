import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  schemeName: string;
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, schemeName }: DeleteConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-999 cursor-pointer"
          />

          {/* Centered Modal */}
          <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="w-full max-w-md bg-[#0d0d0d] border border-red-500/10 rounded-2xl shadow-2xl overflow-hidden p-6 relative pointer-events-auto text-white"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>

              {/* Icon & Title */}
              <div className="flex flex-col items-center text-center mt-2 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 animate-bounce-subtle">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-white mb-1">Delete Welfare Scheme?</h3>
                <p className="text-xs text-zinc-400">
                  This action is irreversible. The entry will be permanently deleted from the database.
                </p>
              </div>

              {/* Scheme Target Block */}
              <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl mb-6 text-center">
                <div className="text-xs text-red-300 font-mono font-bold leading-relaxed break-words">
                  {schemeName}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-transparent hover:bg-white/5 border border-white/10 text-sm font-semibold rounded-lg text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-sm font-semibold rounded-lg text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-900/10"
                >
                  <Trash2 size={15} />
                  Delete Scheme
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
