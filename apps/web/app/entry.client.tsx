import { startTransition, StrictMode } from 'react';
import { RemixBrowser } from '@remix-run/react';
import { hydrateRoot } from 'react-dom/client';

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
