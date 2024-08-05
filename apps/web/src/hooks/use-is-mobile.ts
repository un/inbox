'use client';
import { useWindowSize } from '@uidotdev/usehooks';

function useMaxWidth(maxWidth: number) {
  const { width } = useWindowSize();
  return width ? width <= maxWidth : true;
}

export const useIsMobile = () => useMaxWidth(768);
export const useIsSidebarAutoCollapsed = () => useMaxWidth(1024);
