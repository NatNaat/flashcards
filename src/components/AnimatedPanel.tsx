import { useEffect, useState, type ReactNode } from 'react';

const EXIT_DURATION = 180;

/** Keeps `children` mounted long enough to play an exit animation before actually unmounting. */
export default function AnimatedPanel({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timer = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [open, mounted]);

  if (!mounted) return null;
  return <div className={closing ? 'panel-exit' : undefined}>{children}</div>;
}
