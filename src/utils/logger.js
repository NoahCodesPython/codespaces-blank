const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf, colorize } = format;

const path = require('path');

const fs = require('fs');

const BatchedWebhookTransport = require('./BatchedWebhookTransport'); // <-- Updated import!

const myFormat = printf(({ level, message, timestamp }) => {

  return `[${timestamp}] ${level}: ${message}`;

});

const logsDir = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logsDir)) {

  fs.mkdirSync(logsDir, { recursive: true });

}

const logger = createLogger({

  level: 'debug',

  format: combine(

    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

    myFormat

  ),

  transports: [

    new transports.Console({

      level: 'debug',

      format: combine(

        colorize(),

        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

        myFormat

      ),

    }),

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

    new BatchedWebhookTransport({

      level: 'info', // Send info and above to Discord

      webhookType: 'logs',

      batchInterval: 5000, // 5 seconds batch sending

    }),

  ],

});

module.exports = logger;