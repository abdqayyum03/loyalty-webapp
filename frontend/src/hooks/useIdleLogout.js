import { useEffect, useRef } from 'react';

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
  'click',
];

const WRITE_THROTTLE_MS = 5000;

/**
 * Sign the user out after a period of no activity 
 *
 * @param {object}   options
 * @param {boolean}  options.enabled    Only run while the user is signed in.
 * @param {() => void} options.onIdle   Called once the idle window elapses.
 * @param {string}   options.storageKey localStorage key for the last-activity.
 * @param {number}   [options.timeout]  Idle window in ms (default 30 min).
 */
export function useIdleLogout({ enabled, onIdle, storageKey, timeout = IDLE_TIMEOUT_MS }) {
  // Keep the latest callback in a ref so changing it doesn't tear down and
  // re-arm all the listeners on every render.
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return undefined;

    let timerId;
    let lastWrite = 0;

    const readStamp = () => {
      const raw = Number(localStorage.getItem(storageKey));
      return Number.isFinite(raw) && raw > 0 ? raw : null;
    };

    const writeStamp = (now) => {
      try {
        localStorage.setItem(storageKey, String(now));
      } catch {
        /* storage may be unavailable (private mode / quota) — ignore */
      }
    };

    const fireIdle = () => {
      clearTimeout(timerId);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      onIdleRef.current?.();
    };

    // (Re)arm the timer for whatever time is left relative to `stamp`. If that
    // window has already passed (e.g. resuming a backgrounded tab), log out now.
    const armFrom = (stamp) => {
      clearTimeout(timerId);
      const remaining = stamp + timeout - Date.now();
      if (remaining <= 0) {
        fireIdle();
        return;
      }
      timerId = setTimeout(fireIdle, remaining);
    };

    const handleActivity = () => {
      const now = Date.now();
      // Throttle persistence; always re-arm the in-memory timer though.
      if (now - lastWrite >= WRITE_THROTTLE_MS) {
        lastWrite = now;
        writeStamp(now);
      }
      armFrom(now);
    };

    // Another tab touched the same key: a fresh timestamp means activity there
    // (keep this tab alive); a removed key means a logout there (follow suit).
    const handleStorage = (event) => {
      if (event.key !== storageKey) return;
      if (event.newValue == null) {
        fireIdle();
        return;
      }
      const stamp = Number(event.newValue);
      if (Number.isFinite(stamp)) armFrom(stamp);
    };

    // Coming back to a backgrounded tab: re-check against the persisted stamp so
    // a tab left idle in the background can't silently outlive the window.
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const stamp = readStamp();
      if (stamp == null) handleActivity();
      else armFrom(stamp);
    };

    // Initial arm: resume from a prior session's stamp if one exists (so a
    // reload doesn't hand out a fresh window), otherwise start the clock now.
    const existing = readStamp();
    if (existing == null) {
      const now = Date.now();
      lastWrite = now;
      writeStamp(now);
      armFrom(now);
    } else {
      armFrom(existing);
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timerId);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, storageKey, timeout]);
}
