import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of `value` that only updates after `delay` ms
 * of stability. Useful for inputs that trigger expensive filtering on every keystroke.
 */
export const useDebouncedValue = (value, delay = 200) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
