import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Global Ctrl+Shift+S listener. Navigates logged-in users to /admin.
 * Unauthed users get a silent no-op.
 */
export const AdminShortcut: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Prefer a non-reserved shortcut: Ctrl+Alt+A (Windows/Linux) / Cmd+Alt+A (macOS).
      const isUnlockA =
        (e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'A' || e.key === 'a' || e.code === 'KeyA');
      // Keep old shortcut as a fallback (some browsers intercept Ctrl+Shift+S).
      const isUnlockLegacy =
        (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's' || e.code === 'KeyS');

      if (isUnlockA || isUnlockLegacy) {
        if (isLoading || !user) return;
        e.preventDefault();
        e.stopPropagation();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).stopImmediatePropagation?.();
        sessionStorage.setItem('admin_viewer_unlocked', '1');
        navigate('/admin');
      }
    };
    // Use capture so we can intercept before other handlers where possible.
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true } as AddEventListenerOptions);
  }, [isLoading, navigate, user]);

  return null;
};