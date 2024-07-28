import { validateSmtpCredentials } from '../../smtp/auth';
import { protectedProcedure, router } from '../trpc';
import { z } from 'zod';

export const smtpRouter = router({
  validateSmtpCredentials: protectedProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number(),
        username: z.string(),
        password: z.string(),
        encryption: z.enum(['none', 'ssl', 'tls', 'starttls']),
        authMethod: z.enum(['plain', 'login'])
      })
    )
    .query(async ({ input }) => {
      const result = await validateSmtpCredentials(input);

      return { result };
    })
});
