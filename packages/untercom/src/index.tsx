import { UntercomWidget } from './untercom-widget';
import ReactDOM from 'react-dom';
import React from 'react';

export { UntercomWidget };

// Function to initialize Untercom as a script
function init(widgetUrl: string, widgetPublicId: string) {
  const untercomRoot = document.createElement('div');
  untercomRoot.id = 'untercom-root';
  document.body.appendChild(untercomRoot);

  ReactDOM.render(
    <UntercomWidget
      widgetUrl={widgetUrl}
      widgetPublicId={widgetPublicId}
    />,
    untercomRoot
  );
}

// Expose init function to window for script usage
(window as any).untercom = { init };
