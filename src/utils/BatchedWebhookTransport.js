const Transport = require('winston-transport');

const { send } = require('./webhook'); // this is your webhook sender

class BatchedWebhookTransport extends Transport {

  constructor(opts) {

    super(opts);

    this.name = 'BatchedWebhookTransport';

    this.level = opts.level || 'info';

    this.buffer = [];

    this.interval = opts.interval || 5000; // 5 seconds

    this.webhookType = opts.webhookType || 'logs';

    setInterval(() => this.flush(), this.interval);

  }

  log(info, callback) {

    setImmediate(() => {

      this.emit('logged', info);

    });

    this.buffer.push(`[${info.level}] ${info.message}`);

    callback();

  }

  async flush() {

    if (this.buffer.length === 0) return;

    const message = this.buffer.join('\n').slice(0, 1900); // Discord limit is 2000 characters

    this.buffer = [];

    try {

      await send({ content: `\`\`\`\n${message}\n\`\`\`` }, this.webhookType);

    } catch (error) {

      console.error('Failed to send logs to webhook:', error);

    }

  }

}

module.exports = BatchedWebhookTransport;