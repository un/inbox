import Pino from 'pino';
import { env } from './env';

export const logger = Pino({
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true
          }
        }
      : Pino.transport({
          target: 'pino-opentelemetry-transport'
        })
});
