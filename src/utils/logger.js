const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const path = require('path');

// Define custom format
const myFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
const logger = createLogger({
  level: 'debug', // Always use debug level to see all logs
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat
  ),
  transports: [
    // Output to console with colors
    new transports.Console({
      level: 'debug',
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        myFormat
      ),
    }),
    // Output to log files
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new transports.File({
      filename: path.join(logsDir, 'debug.log'),
      level: 'debug',
    }),
    new transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
});

module.exports = logger;
