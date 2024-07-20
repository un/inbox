import { createHonoApp } from '@u22n/hono';

export const eventApi = createHonoApp().post(
  '/events/:params{.+}',
  async (c) => {
    return c.json({ error: 'Not implemented' }, 400);
  }
);
