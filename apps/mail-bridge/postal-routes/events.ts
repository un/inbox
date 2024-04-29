import { Hono } from 'hono';

export const eventApi = new Hono().post('/events/:params{.+}', async (c) => {
  return c.json({ error: 'Not implemented' }, 400);
});
