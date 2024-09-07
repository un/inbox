import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';
import { useState } from 'react';

function useMaxWidth(maxWidth: number) {
  const [isHittingMaxWidth, setIsHittingMaxWidth] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const handleSize = () => {
      const isCurrentlyHitting = window.innerWidth <= maxWidth;
      if (isCurrentlyHitting !== isHittingMaxWidth) {
        setIsHittingMaxWidth(isCurrentlyHitting);
      }
    };
    handleSize();
    window.addEventListener('resize', handleSize);
    return () => window.removeEventListener('resize', handleSize);
  });

  if (typeof window === 'undefined') return false;
  return isHittingMaxWidth;
}

export const useIsMobile = () => useMaxWidth(768);
export const useIsSidebarAutoCollapsed = () => useMaxWidth(1024);
