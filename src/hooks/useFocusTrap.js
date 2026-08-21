import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Traps focus inside `containerRef` while it is open.
 * - Restores focus to the previously-active element on close.
 * - Closes on Escape (calls onEscape).
 * - Cycles Tab / Shift+Tab within the container.
 */
export const useFocusTrap = (open, containerRef, onEscape) => {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return undefined;

    const focusables = () => Array.from(container.querySelectorAll(FOCUSABLE)).filter(
      (el) => !el.hasAttribute('aria-hidden') && el.offsetParent !== null
    );

    const initial = focusables()[0];
    if (initial) {
      initial.focus();
    } else {
      container.focus();
    }

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [open, containerRef, onEscape]);
};
