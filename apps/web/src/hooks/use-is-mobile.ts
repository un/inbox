'use client';

import { useLayoutEffect, useState } from 'react';

function useMaxWidth(maxWidth: number) {
  if (typeof window === 'undefined') false;
  const [isHittingMaxWidth, setIsHittingMaxWidth] = useState(false);

  useLayoutEffect(() => {
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

  return isHittingMaxWidth;
}

export const useIsMobile = () => useMaxWidth(768);
export const useIsSidebarAutoCollapsed = () => useMaxWidth(1024);
