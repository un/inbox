'use client';
import { useWindowSize } from '@uidotdev/usehooks';

export function useIsMobile(): boolean {
  const maxWidth = 768;
  const { width } = useWindowSize();
  return width ? width <= maxWidth : true;
}
export function useIsSidebarAutoCollapsed(): boolean {
  const maxWidth = 1024;
  const { width } = useWindowSize();
  return width ? width <= maxWidth : true;
}
