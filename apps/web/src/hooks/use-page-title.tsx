import { useEffect } from 'react';

export function usePageTitle(title?: string) {
  useEffect(() => {
    if (typeof window === 'undefined' || !title) return;
    const prevTitle = document.title;
    document.title = title;
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
