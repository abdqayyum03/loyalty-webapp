import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Lightweight toast/snackbar system. Wrap the app once in <ToastProvider>, then
 * call useToast() anywhere to surface transient feedback:
 *
 *   const toast = useToast();
 *   toast.success('Added to cart');
 *   toast.error('Could not save changes');
 *   toast.info('Heads up…', { duration: 6000 });
 *
 * Toasts render in a fixed viewport (portalled to <body>), auto-dismiss after a
 * few seconds, stack up to three at a time, and can be dismissed by hand.
 */

const ToastContext = createContext(null);

const ICONS = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
};

const MAX_VISIBLE = 3;
const EXIT_MS = 240; // keep in sync with the toast-out animation in enhancements.css

const ToastViewport = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-viewport" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.type}${t.leaving ? ' toast--leaving' : ''}`}
          role={t.type === 'error' ? 'alert' : 'status'}
          aria-live={t.type === 'error' ? 'assertive' : 'polite'}
        >
          <span className="material-symbols-outlined toast__icon" aria-hidden="true">
            {ICONS[t.type] || ICONS.info}
          </span>
          <span className="toast__message">{t.message}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  // Animate out first, then drop from the list once the exit anim has run.
  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const show = useCallback(
    (message, opts = {}) => {
      const id = (idRef.current += 1);
      const duration = opts.duration ?? 3500;
      const toast = { id, message, type: opts.type || 'info', leaving: false };

      setToasts((list) => {
        const next = [...list, toast];
        // Cap the stack — drop the oldest so newest feedback stays visible.
        return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
      });

      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, opts) => show(message, { ...opts, type: 'success' }),
      error: (message, opts) => show(message, { ...opts, type: 'error' }),
      info: (message, opts) => show(message, { ...opts, type: 'info' }),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(<ToastViewport toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
};

export default ToastProvider;
