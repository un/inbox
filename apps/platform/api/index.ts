import publicWidgetRouter from './routes/publicWidget';
import { Hono } from 'hono';

const app = new Hono();

// ... other routes and middleware

app.route('/api/public-widget', publicWidgetRouter);

export default app;
