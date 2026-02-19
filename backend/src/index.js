import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config, { validateConfig } from './config/index.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import { testConnection, closeConnection } from './database/index.js';
import zkDeviceService from './services/zkDevice.service.js';

/**
 * Initialize Express app
 */
const app = express();

/**
 * Middleware
 */

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger
if (config.server.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

/**
 * Routes
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Attendance Management System API',
    version: config.apiVersion,
    environment: config.env,
  });
});

app.use(`/api/${config.apiVersion}`, routes);

/**
 * Error handlers (must be last)
 */
app.use(notFound);
app.use(errorHandler);

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Test database connection
    await testConnection();
    logger.info('Database connected');

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info('===========================================');
      logger.info(`Server running in ${config.env} mode`);
      logger.info(`Listening on port ${config.port}`);
      logger.info(`API Version: ${config.apiVersion}`);
      logger.info('===========================================');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Disconnect all ZKTeco devices
          await zkDeviceService.disconnectAll();
          
          // Close database connection
          await closeConnection();
          
          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
