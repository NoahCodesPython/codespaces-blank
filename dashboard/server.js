const app = require('./app');
const logger = require('../src/utils/logger');
const mongoose = require('../src/utils/mongoose');

// Set port
const PORT = process.env.DASHBOARD_PORT || 5000;

// Connect to database
mongoose.connect()
  .then(() => {
    logger.info('Dashboard connected to MongoDB');
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Dashboard server running on port ${PORT}`);
      logger.info(`Access the dashboard at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    logger.error(`Dashboard database connection error: ${err.message}`);
    process.exit(1);
  });