import { createClient } from 'redis';
import logger from '../utils/logger.js';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client Ready');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis Client Reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Error connecting to Redis:', error.message);
    // Don't exit - Redis is optional for basic functionality
    return null;
  }
};

export const getRedisClient = () => redisClient;

// Agent state operations
export const setAgentState = async (agentName, state) => {
  if (!redisClient) return null;
  const key = `agent:${agentName}:state`;
  await redisClient.set(key, JSON.stringify(state));
  return state;
};

export const getAgentState = async (agentName) => {
  if (!redisClient) return null;
  const key = `agent:${agentName}:state`;
  const state = await redisClient.get(key);
  return state ? JSON.parse(state) : null;
};

// Pub/Sub for real-time updates
export const publishEvent = async (channel, message) => {
  if (!redisClient) return;
  await redisClient.publish(channel, JSON.stringify(message));
};

export const subscribeToChannel = async (channel, callback) => {
  if (!redisClient) return;
  const subscriber = redisClient.duplicate();
  await subscriber.connect();
  await subscriber.subscribe(channel, (message) => {
    callback(JSON.parse(message));
  });
  return subscriber;
};