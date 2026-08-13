import { useEffect, useRef, useState } from 'react';

interface KeepAliveSlotProps {
  routeKey: string;
  activeKey: string;
  children: React.ReactNode;
}

/**
 * KeepAliveSlot keeps page DOM mounted across route changes.
 *
 * Strategy:
 *  - Mounted once per route (no unmount/remount on tab switch)
 *  - Hidden via display:none when inactive — preserves:
 *      · React component state (useState/useReducer)
 *      · In-flight request refs / timers
 *      · DOM refs & input focus
 *  - Tracks window scrollTop while active and restores it when re-activated
 *    so users never lose their scroll position when switching tabs.
 *  - Smooth opacity transition when becoming visible for polished UX.
 */
export function KeepAliveSlot({ routeKey, activeKey, children }: KeepAliveSlotProps) {
  const isActive = routeKey === activeKey;
  const [savedScroll, setSavedScroll] = useState(0);
  const [animatingKey, setAnimatingKey] = useState(0);
  const isRestoringRef = useRef(false);

  // Trigger fade-in animation when becoming active
  useEffect(() => {
    if (isActive) {
      setAnimatingKey((k) => k + 1);

      // Restore previously saved scroll after layout
      if (savedScroll > 0 && !isRestoringRef.current) {
        isRestoringRef.current = true;
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScroll);
          isRestoringRef.current = false;
        });
      }

      // Track scroll while this slot is active
      const handleScroll = () => {
        setSavedScroll(window.scrollY);
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isActive]);

  return (
    <div
      data-keep-alive-slot={routeKey}
      data-active={isActive ? 'true' : 'false'}
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <div
        key={animatingKey}
        style={{
          animation: isActive ? 'keepAliveFadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface KeepAliveScopeProps {
  activeKey: string;
  children: React.ReactNode;
}

export function KeepAliveScope({ children }: KeepAliveScopeProps) {
  return <>{children}</>;
}
