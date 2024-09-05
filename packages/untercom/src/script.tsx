import { UntercomWidget } from './UntercomWidget';
import { createRoot } from 'react-dom/client';
import React from 'react';

function init(widgetUrl: string, widgetPublicId: string) {
  const untercomRoot = document.createElement('div');
  untercomRoot.id = 'untercom-root';
  document.body.appendChild(untercomRoot);

  const root = createRoot(untercomRoot);
  root.render(
    <UntercomWidget
      widgetUrl={widgetUrl}
      widgetPublicId={widgetPublicId}
    />
  );
}

// Expose init function to window
(window as any).Untercom = { init };
