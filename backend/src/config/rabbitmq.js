import amqplib from 'amqplib';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

let connection = null;
let channel = null;

export const EXCHANGE_NAME = 'helix_agents';
export const QUEUES = {
  LOG_INTELLIGENCE: 'log_intelligence_queue',
  CRASH_DIAGNOSTIC: 'crash_diagnostic_queue',
  RESOURCE_OPTIMIZATION: 'resource_optimization_queue',
  ANOMALY_DETECTION: 'anomaly_detection_queue',
  RECOVERY: 'recovery_queue',
  RECOMMENDATION: 'recommendation_queue',
  COST_OPTIMIZATION: 'cost_optimization_queue',
  ORCHESTRATOR: 'orchestrator_queue',
};

export const connectRabbitMQ = async () => {
  try {
    connection = await amqplib.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();

    // Create fanout exchange for broadcasts
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // Create queues for each agent
    for (const [name, queueName] of Object.entries(QUEUES)) {
      await channel.assertQueue(queueName, { durable: true });
      // Bind queue to exchange with routing key
      await channel.bindQueue(queueName, EXCHANGE_NAME, queueName);
      await channel.bindQueue(queueName, EXCHANGE_NAME, 'broadcast');
    }

    logger.info('RabbitMQ Connected and queues configured');

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed. Attempting to reconnect...');
      setTimeout(connectRabbitMQ, 5000);
    });

    return { connection, channel };
  } catch (error) {
    logger.error('Error connecting to RabbitMQ:', error.message);
    // Don't exit - RabbitMQ is optional for basic functionality
    return null;
  }
};

export const getChannel = () => channel;

// Publish message to specific agent queue
export const publishToAgent = async (targetAgent, message) => {
  if (!channel) {
    logger.warn('RabbitMQ channel not available, skipping message');
    return null;
  }

  const queueName = QUEUES[targetAgent.toUpperCase().replace(/ /g, '_')];
  if (!queueName) {
    logger.error(`Unknown agent: ${targetAgent}`);
    return null;
  }

  const msgWithId = {
    id: uuidv4(),
    timestamp: Date.now(),
    ...message,
  };

  channel.publish(EXCHANGE_NAME, queueName, Buffer.from(JSON.stringify(msgWithId)), {
    persistent: true,
  });

  logger.debug(`Message published to ${queueName}:`, msgWithId.id);
  return msgWithId.id;
};

// Broadcast message to all agents
export const broadcastMessage = async (message) => {
  if (!channel) {
    logger.warn('RabbitMQ channel not available, skipping broadcast');
    return null;
  }

  const msgWithId = {
    id: uuidv4(),
    timestamp: Date.now(),
    ...message,
  };

  channel.publish(EXCHANGE_NAME, 'broadcast', Buffer.from(JSON.stringify(msgWithId)), {
    persistent: true,
  });

  logger.debug('Broadcast message sent:', msgWithId.id);
  return msgWithId.id;
};

// Subscribe to agent queue
export const subscribeToQueue = async (agentName, callback) => {
  if (!channel) {
    logger.warn('RabbitMQ channel not available');
    return null;
  }

  const queueName = QUEUES[agentName.toUpperCase().replace(/ /g, '_')];
  if (!queueName) {
    logger.error(`Unknown agent: ${agentName}`);
    return null;
  }

  await channel.consume(queueName, async (msg) => {
    if (msg) {
      try {
        const content = JSON.parse(msg.content.toString());
        await callback(content);
        channel.ack(msg);
      } catch (error) {
        logger.error(`Error processing message in ${queueName}:`, error);
        channel.nack(msg, false, true); // Requeue the message
      }
    }
  });

  logger.info(`Subscribed to queue: ${queueName}`);
};