import { useState, useEffect } from 'react';

// Simple global navigation state to mimic router & useLocation
let currentPath = '/';
let currentState: any = null;
const listeners = new Set<() => void>();

export const router = {
  push: (path: string, options?: { state?: any }) => {
    currentPath = path;
    currentState = options?.state || null;
    listeners.forEach(fn => fn());
  },
  getPath: () => currentPath,
  getState: () => currentState,
  clearHandoff: () => {
    if (currentState && currentState.schemeHandoff) {
      currentState = { ...currentState, schemeHandoff: null };
      listeners.forEach(fn => fn());
    }
  }
};

export function useLocation() {
  const [loc, setLoc] = useState({ pathname: currentPath, state: currentState });

  useEffect(() => {
    const handleUpdate = () => {
      setLoc({ pathname: currentPath, state: currentState });
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  return loc;
}

export function clearHandoff() {
  router.clearHandoff();
}
