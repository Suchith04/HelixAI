import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
let socket = null;

export const connectSocket = (token) => {
  socket = io(SOCKET_URL, { auth: { token } });
  
  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));
  
  return socket;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
};

export const subscribeToAgent = (agentName) => {
  socket?.emit('subscribe:agent', agentName);
};

export const onAgentState = (callback) => {
  socket?.on('agent:state', callback);
};

export const onIncidentCreated = (callback) => {
  socket?.on('incident:created', callback);
};

export const onWorkflowCompleted = (callback) => {
  socket?.on('workflow:completed', callback);
};

export const getSocket = () => socket;
