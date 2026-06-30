import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';

interface PinGateProps {
  onSuccess: () => void;
}

export function PinGate({ onSuccess }: PinGateProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    
    if (pin === 'scheme@admin123') {
      setLoading(true);
      setTimeout(() => {
        localStorage.setItem('sc_admin_authorized', 'true');
        onSuccess();
        setLoading(false);
      }, 600);
    } else {
      setError(true);
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#080808] p-4 text-white">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md p-8 bg-[#111] border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden"
        >
          {/* Top glowing ambient effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-violet-500 blur-md rounded-full" />

          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4 text-violet-400">
              <Shield size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mb-1">Admin Access Required</h1>
            <p className="text-sm text-zinc-400 text-center">
              Please enter the administrative credentials to manage welfare schemes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="pin-input" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Security Passkey
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  ref={inputRef}
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="••••••••••••••"
                  className={`w-full py-3.5 pl-4 pr-11 bg-black border rounded-lg text-sm transition-all focus:outline-none font-mono ${
                    error
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                      : 'border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30'
                  }`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-medium text-red-400"
              >
                Incorrect security passkey. Please check and try again.
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:bg-violet-600/30 text-white font-medium rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <span>Access Dashboard</span>
              )}
            </button>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
