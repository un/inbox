import { createLogger, format, transports } from 'winston';
import { env } from './env';

export const logger = createLogger({
  level: 'info',
  format: format.json(),
  transports: [
    env.NODE_ENV === 'production'
      ? new transports.Console()
      : new transports.Console({
          format: format.combine(
            format.timestamp(),
            format.colorize(),
            format.simple()
          )
        })
  ],
  exitOnError: false
});
