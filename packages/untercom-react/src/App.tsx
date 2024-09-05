import { UntercomWidget } from '@u22n/untercom';
import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Untercom React Example</h1>
      <p>This is an example of using Untercom in a React application.</p>
      <UntercomWidget
        widgetUrl="http://localhost:3300"
        widgetPublicId="hello"
      />
    </div>
  );
}

export default App;
