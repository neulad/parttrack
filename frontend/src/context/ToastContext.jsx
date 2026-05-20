import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const leaveTimer = useRef(null);
  const removeTimer = useRef(null);

  function clearTimers() {
    clearTimeout(leaveTimer.current);
    clearTimeout(removeTimer.current);
  }

  const showToast = useCallback((msg, type = 'success') => {
    clearTimers();
    setToast({ msg, type, leaving: false });
    leaveTimer.current  = setTimeout(() => setToast((t) => t ? { ...t, leaving: true } : null), 4500);
    removeTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  function dismiss() {
    clearTimers();
    setToast((t) => t ? { ...t, leaving: true } : null);
    removeTimer.current = setTimeout(() => setToast(null), 500);
  }

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.type}${toast.leaving ? ' toast-leave' : ''}`}>
          <span>{toast.msg}</span>
          <button className="toast-close" onClick={dismiss}>✕</button>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
