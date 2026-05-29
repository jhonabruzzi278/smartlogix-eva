function gracefulShutdown(server, pool, sqsPollingFlag, serviceName) {
  const log = require('./logger');

  async function shutdown(signal) {
    log.info(`${serviceName} received ${signal}, shutting down gracefully`);

    if (sqsPollingFlag) {
      sqsPollingFlag.shuttingDown = true;
    }

    server.close(async () => {
      log.info('HTTP server closed');
      try {
        if (pool) {
          await pool.end();
          log.info('DB pool closed');
        }
      } catch (err) {
        log.error('Error closing DB pool', { message: err.message });
      }
      process.exit(0);
    });

    setTimeout(() => {
      log.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    log.error('Uncaught exception', { message: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled rejection', { message: reason?.message || String(reason) });
  });
}

module.exports = { gracefulShutdown };
