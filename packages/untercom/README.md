# Untercom Widget

Untercom is a customizable chat widget that can be easily integrated into your web applications. It supports both React applications and traditional HTML websites.

## Installation

```bash
npm install @u22n/untercom
# or
yarn add @u22n/untercom
# or
pnpm add @u22n/untercom
```

## Usage

### React Applications

```jsx
import { UntercomWidget } from '@u22n/untercom';

function App() {
  return (
    <div>
      {/* Your app content */}
      <UntercomWidget
        widgetUrl="https://your-widget-url.com"
        widgetPublicId="your-public-id"
      />
    </div>
  );
}
```

### HTML Websites

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0" />
    <title>Your Website</title>
  </head>
  <body>
    <!-- Your website content -->

    <script src="https://unpkg.com/@u22n/untercom/dist/index.umd.js"></script>
    <script>
      Untercom.init('https://your-widget-url.com', 'your-public-id');
    </script>
  </body>
</html>
```

## Building

To build the project, run one of the following commands:

```bash
npm run build
# or
yarn build
# or
pnpm build
```

```

This update properly formats the code blocks, uses appropriate language identifiers, and removes the extra parenthesis at the end. The backticks are now correctly escaped within the markdown code block.
```
