import { z } from 'zod';
import { validateSmtpCredentials } from '../../smtp/auth';
import { protectedProcedure, router } from '../trpc';

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
    .mutation(({ input }) => validateSmtpCredentials(input))
});
