import { v4 as uuidv4 } from 'uuid';

// generate unique ID
export const generateId = () => uuidv4();

// format date for display
export const formatDate = (date) => {
  return new Date(date).toISOString();
};

// cal time difference
export const getTimeDiff = (startTime, endTime = Date.now()) => {
  const diff = endTime - startTime;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// Sanitize user input
export const sanitize = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '').trim();
};

// Paginate array
export const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const results = {
    data: array.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      hasNext: endIndex < array.length,
      hasPrev: startIndex > 0,
    },
  };
  
  return results;
};

// Sleep utility
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry with exponential backoff
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  
  throw lastError;
};

// Parse error signature from log message
export const extractErrorSignature = (message) => {
  // Remove timestamps, IDs, and variable parts
  return message
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\b\d+\b/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
};

// Calculate confidence score
export const calculateConfidence = (factors) => {
  const total = factors.reduce((sum, f) => sum + f.weight * f.score, 0);
  const maxScore = factors.reduce((sum, f) => sum + f.weight, 0);
  return Math.min(1, Math.max(0, total / maxScore));
};