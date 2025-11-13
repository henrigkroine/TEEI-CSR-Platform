import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

export const logger = pino({
  level: LOG_LEVEL,
  transport:
    NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export function createServiceLogger(serviceName: string) {
  return logger.child({ service: serviceName });
}
