import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/database.js';
import { connectRedis } from './src/config/redis.js';
import { connectRabbitMQ } from './src/config/rabbitmq.js';
import { initializeLangChain } from './src/config/langchain.js';
import { initializeWebSocket } from './src/websocket/socketHandler.js';
import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    logger.info('MongoDB connected');

    // Connect to Redis (optional)
    await connectRedis();

    // Connect to RabbitMQ (optional)
    await connectRabbitMQ();

    // Initialize LangChain
    initializeLangChain();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket
    initializeWebSocket(server);

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
