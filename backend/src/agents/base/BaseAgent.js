import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';
import { queryLLM } from '../../config/langchain.js';
import { setAgentState, getAgentState, publishEvent } from '../../config/redis.js';
import { publishToAgent, broadcastMessage } from '../../config/rabbitmq.js';
import { AgentState, Message, Company } from '../../models/index.js';
import * as awsCloudService from '../../services/awsCloudService.js';
import { decrypt } from '../../utils/encryption.js';

/**
 * BaseAgent - Foundation class for all specialized agents
 * Provides common functionality: state management, messaging, memory, LLM integration
 */
class BaseAgent {
  constructor(name, orchestrator, companyId) {
    this.name = name;
    this.orchestrator = orchestrator;
    this.companyId = companyId;
    this.agentId = uuidv4();
    
    // Internal state
    this.state = {
      status: 'idle',
      lastAction: null,
      lastActionTime: null,
      memory: [],
      confidence: 0.5,
      tasksProcessed: 0,
      successfulTasks: 0,
      failedTasks: 0,
    };
    
    // Configuration
    this.config = {
      maxMemoryItems: 100,
      defaultTimeout: 30000,
      retryAttempts: 3,
      confidenceThreshold: 0.7,
    };
  }

  /**
   * Initialize the agent - called when agent starts
   */
  async initialize() {
    this.log('Initializing agent', 'info');
    this.updateState({ status: 'idle' });
    
    // Load previous state from Redis if available
    const savedState = await getAgentState(this.getStateKey());
    if (savedState) {
      this.state = { ...this.state, ...savedState };
      this.log('Restored previous state', 'debug');
    }
    
    return this;
  }

  /**
   * Main processing method - MUST BE IMPLEMENTED BY SUBCLASSES
   * @param {Object} data - Input data to process
   * @returns {Promise<Object>} - Processing result
   */
  async process(data) {
    throw new Error(`process() must be implemented by ${this.name}`);
  }

  /**
   * Update agent state
   * @param {Object} updates - State updates to apply
   */
  async updateState(updates) {
    this.state = { ...this.state, ...updates, lastUpdated: Date.now() };
    
    // Persist to Redis
    await setAgentState(this.getStateKey(), this.state);
    
    // Emit state change event
    await publishEvent('agent:state', {
      agent: this.name,
      companyId: this.companyId,
      state: this.state,
    });
  }

  /**
   * Send message to another agent
   * @param {string} targetAgent - Target agent name
   * @param {Object} message - Message payload
   * @returns {Promise<string>} - Message ID
   */
  async sendMessage(targetAgent, message) {
    const msgData = {
      from: this.name,
      to: targetAgent,
      type: message.type || 'notification',
      payload: message,
      priority: message.priority || 3,
    };

    // Store message in database
    await Message.create({
      company: this.companyId,
      ...msgData,
      correlationId: message.correlationId || uuidv4(),
    });

    // Publish to message queue
    const messageId = await publishToAgent(targetAgent, msgData);
    
    this.log(`Sent message to ${targetAgent}`, 'debug', { messageId });
    return messageId;
  }

  /**
   * Broadcast message to all agents
   * @param {Object} message - Message payload
   */
  async broadcast(message) {
    const msgData = {
      from: this.name,
      type: 'broadcast',
      payload: message,
      priority: message.priority || 2,
    };

    await broadcastMessage(msgData);
    this.log('Broadcasted message to all agents', 'debug');
  }

  /**
   * Request help from multiple agents and aggregate responses
   * @param {string[]} agentNames - List of agent names to query
   * @param {Object} query - Query to send
   * @returns {Promise<Object[]>} - Responses from agents
   */
  async requestHelp(agentNames, query) {
    this.log(`Requesting help from: ${agentNames.join(', ')}`, 'info');
    
    const correlationId = uuidv4();
    const requests = agentNames.map(agent => 
      this.sendMessage(agent, {
        type: 'collaboration',
        query,
        correlationId,
        replyTo: this.name,
      })
    );

    // Store collaboration in state
    this.state.collaborations = this.state.collaborations || [];
    this.state.collaborations.push({
      correlationId,
      agents: agentNames,
      query,
      timestamp: Date.now(),
    });

    await Promise.all(requests);
    return correlationId;
  }

  /**
   * Store memory of an event for future reference
   * @param {Object} event - Event to remember
   */
  async storeMemory(event) {
    const memory = {
      timestamp: Date.now(),
      event: event.type,
      context: event.context,
      outcome: event.outcome,
      importance: event.importance || 0.5,
    };

    this.state.memory.unshift(memory);
    
    // Limit memory size
    if (this.state.memory.length > this.config.maxMemoryItems) {
      // Remove least important old memories
      this.state.memory = this.state.memory
        .sort((a, b) => b.importance - a.importance)
        .slice(0, this.config.maxMemoryItems);
    }

    await this.updateState({ memory: this.state.memory });

    // Persist to MongoDB AgentState collection
    try {
      await AgentState.findOneAndUpdate(
        { company: this.companyId, agentName: this.name },
        {
          $push: {
            memory: {
              $each: [memory],
              $position: 0,
              $slice: 100,
            },
          },
          $set: { confidence: this.state.confidence },
        }
      );
    } catch (err) {
      this.log(`Failed to persist memory to MongoDB: ${err.message}`, 'warn');
    }
  }

  /**
   * Query LLM with context from this agent
   * @param {string} prompt - User prompt
   * @param {Object} context - Additional context
   * @returns {Promise<string>} - LLM response
   */
  async queryLLM(prompt, context = {}) {
    const systemPrompt = this.getSystemPrompt();
    const contextStr = JSON.stringify(context, null, 2);
    
    const fullPrompt = `
Context:
${contextStr}

Request:
${prompt}
    `.trim();

    try {
      const response = await queryLLM(systemPrompt, fullPrompt, { companyId: this.companyId });
      return response;
    } catch (error) {
      this.log(`LLM query failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get system prompt for LLM - can be overridden by subclasses
   */
  getSystemPrompt() {
    return `You are ${this.name}, an AI agent specialized in cloud infrastructure management. 
Analyze the provided data and context to give accurate, actionable insights.
Be concise and focus on the most important findings.
Format your response as JSON when appropriate.`;
  }

  /**
   * Log message with agent context
   */
  log(message, level = 'info', metadata = {}) {
    logger[level](`[${this.name}] ${message}`, {
      agentId: this.agentId,
      companyId: this.companyId,
      ...metadata,
    });
  }

  /**
   * Execute action with error handling and state management
   */
  async executeWithTracking(actionName, actionFn) {
    const startTime = Date.now();
    
    try {
      await this.updateState({ 
        status: 'working',
        currentTask: actionName,
      });

      const result = await actionFn();
      
      const duration = Date.now() - startTime;
      this.state.tasksProcessed++;
      this.state.successfulTasks++;
      
      await this.updateState({
        status: 'idle',
        lastAction: actionName,
        lastActionTime: Date.now(),
        currentTask: null,
      });

      await this.storeMemory({
        type: actionName,
        context: { duration },
        outcome: 'success',
        importance: 0.5,
      });

      return result;
    } catch (error) {
      this.state.failedTasks++;
      
      await this.updateState({
        status: 'error',
        lastError: { message: error.message, timestamp: Date.now() },
      });

      await this.storeMemory({
        type: actionName,
        context: { error: error.message },
        outcome: 'failure',
        importance: 0.8,
      });

      throw error;
    }
  }

  /**
   * Get unique state key for this agent instance
   */
  getStateKey() {
    return `${this.companyId}:${this.name}`;
  }

  /**
   * Calculate confidence based on various factors
   */
  calculateConfidence(factors) {
    const weights = {
      dataQuality: 0.3,
      historicalAccuracy: 0.25,
      modelConfidence: 0.25,
      corroboration: 0.2,
    };

    let confidence = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      if (factors[factor] !== undefined) {
        confidence += factors[factor] * weight;
      }
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Retry logic with exponential backoff
   */
  async retry(fn, maxRetries = this.config.retryAttempts) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const delay = Math.pow(2, i) * 1000;
        this.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`, 'warn');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Get decrypted AWS credentials for this company (cached for 5 min)
   * @returns {Promise<Object|null>} { accessKeyId, secretAccessKey, region }
   */
  async getAwsCredentials() {
    // Cache check
    if (this._awsCreds && Date.now() - this._awsCredsAt < 300000) {
      return this._awsCreds;
    }
    try {
      const company = await Company.findById(this.companyId);
      if (!company?.awsCredentials?.isConfigured) return null;
      const creds = company.getAwsCredentials();
      this._awsCreds = creds;
      this._awsCredsAt = Date.now();
      return creds;
    } catch (err) {
      this.log(`Failed to load AWS credentials: ${err.message}`, 'warn');
      return null;
    }
  }

  /**
   * Access the awsCloudService module (convenience accessor)
   * Usage: const instances = await this.aws().getEC2Instances(creds);
   */
  aws() {
    return awsCloudService;
  }

  /**
   * Get current agent status
   */
  getStatus() {
    return {
      name: this.name,
      agentId: this.agentId,
      companyId: this.companyId,
      state: this.state,
      config: this.config,
    };
  }
}

export default BaseAgent;
