const isBrowser = typeof window !== 'undefined';

let nodeLogger: any = null;

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

if (!isBrowser) {
  try {
    const pkgName = 'winston';
    // Dynamically loading winston with a variable name ensures Vite skips static analysis for browser builds
    const winston = typeof require !== 'undefined' ? require(pkgName) : null;
    if (winston) {
      const { combine, timestamp, json, colorize, printf } = winston.format;
      nodeLogger = winston.createLogger({
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          json({ replacer: browserSafeCircularReplacer() })
        ),
        transports: [
          new winston.transports.Console({
            format: combine(
              colorize(),
              printf(({ timestamp, level, message, ...meta }: any) => {
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
    }
  } catch (error) {
    // Fail silently in Node if Winston loader is unavailable
  }
}

// Unified client-safe and server-safe logger API
export const logger = {
  info: (message: any, ...meta: any[]) => {
    if (nodeLogger) {
      nodeLogger.info(message, ...meta);
    } else {
      console.info(`[INFO] ${message}`, ...meta);
    }
  },
  warn: (message: any, ...meta: any[]) => {
    if (nodeLogger) {
      nodeLogger.warn(message, ...meta);
    } else {
      console.warn(`[WARN] ${message}`, ...meta);
    }
  },
  error: (message: any, ...meta: any[]) => {
    if (nodeLogger) {
      nodeLogger.error(message, ...meta);
    } else {
      console.error(`[ERROR] ${message}`, ...meta);
    }
  },
  debug: (message: any, ...meta: any[]) => {
    if (nodeLogger) {
      nodeLogger.debug(message, ...meta);
    } else {
      console.debug(`[DEBUG] ${message}`, ...meta);
    }
  },
  log: (level: string, message: any, ...meta: any[]) => {
    if (nodeLogger) {
      nodeLogger.log(level, message, ...meta);
    } else {
      const logMethod = (console as any)[level] || console.log;
      logMethod(`[${level.toUpperCase()}] ${message}`, ...meta);
    }
  }
};

