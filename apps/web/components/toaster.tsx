'use client';
import { useTheme } from 'next-themes';
import { Toaster as PrimitiveToaster } from 'sonner';

export default function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <PrimitiveToaster
      richColors
      theme={(resolvedTheme as 'dark') || 'light'}
      duration={5000}
    />
  );
}
