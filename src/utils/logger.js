const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const path = require('path');

// Define custom format
const myFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Create logger instance
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat
  ),
  transports: [
    // Output to console
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        myFormat
      ),
    }),
    // Output to log file
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
    }),
    new transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
    }),
  ],
});

// If we're not in production, log to the console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      myFormat
    ),
  }));
}

module.exports = logger;
