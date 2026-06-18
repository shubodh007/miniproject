import winston from 'winston';

const { combine, timestamp, json, colorize, printf } = winston.format;

const browserSafeCircularReplacer = () => {
  const seen = new WeakSet();
  return (_key: string, val: any) => {
    if (typeof val === 'object' && val !== null) {
      if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) {
        return `[HTMLElement ${val.tagName || ''}]`;
      }
      if ('nodeType' in val || 'ownerDocument' in val) {
        return '[DOMNode]';
      }
      if ('_reactFiber' in val || '__reactFiber' in val || 'stateNode' in val) {
        return '[ReactNode]';
      }
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    return val;
  };
};

// Standard Winston formatted logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json({ replacer: browserSafeCircularReplacer() })
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, browserSafeCircularReplacer())}` : '';
          return `[${timestamp}] ${level}: ${message}${metaStr}`;
        })
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB limit
      maxFiles: 5,
      tailable: true
    })
  ]
});
