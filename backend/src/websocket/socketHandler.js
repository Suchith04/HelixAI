import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { subscribeToChannel } from '../config/redis.js';

let io = null;

export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.companyId = decoded.companyId;
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket connected: ${socket.id}`);
    
    // Join company room
    if (socket.companyId) {
      socket.join(`company:${socket.companyId}`);
    }

    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected: ${socket.id}`);
    });

    socket.on('subscribe:agent', (agentName) => {
      socket.join(`agent:${agentName}`);
    });
  });

  // Subscribe to Redis events and broadcast to WebSocket
  setupRedisSubscriptions();

  logger.info('WebSocket server initialized');
  return io;
};

const setupRedisSubscriptions = async () => {
  try {
    await subscribeToChannel('agent:state', (data) => {
      io?.to(`company:${data.companyId}`).emit('agent:state', data);
    });

    await subscribeToChannel('workflow:completed', (data) => {
      io?.to(`company:${data.companyId}`).emit('workflow:completed', data);
    });

    await subscribeToChannel('incident:created', (data) => {
      io?.to(`company:${data.companyId}`).emit('incident:created', data);
    });

    // Recovery events for HITL
    await subscribeToChannel('recovery:pending', (data) => {
      io?.to(`company:${data.companyId}`).emit('recovery:pending', data);
    });

    await subscribeToChannel('recovery:executed', (data) => {
      io?.to(`company:${data.companyId}`).emit('recovery:executed', data);
    });

    await subscribeToChannel('recovery:approved', (data) => {
      io?.to(`company:${data.companyId}`).emit('recovery:approved', data);
    });
  } catch (e) {
    logger.warn('Redis subscriptions not available');
  }
};

export const getIO = () => io;

export const emitToCompany = (companyId, event, data) => {
  io?.to(`company:${companyId}`).emit(event, data);
};
