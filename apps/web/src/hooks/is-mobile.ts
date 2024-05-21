'use client';
import { useWindowSize } from '@uidotdev/usehooks';

export function useIsMobile(): boolean {
  const maxWidth = 768;
  const { width } = useWindowSize();
  return width ? width <= maxWidth : true;
}
