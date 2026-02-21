import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import logger from '../utils/logger.js';

let llm = null;

export const initializeLangChain = () => {
  try {
    llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 2000,
    });

    logger.info('LangChain initialized with OpenAI');
    return llm;
  } catch (error) {
    logger.error('Error initializing LangChain:', error.message);
    return null;
  }
};

export const getLLM = () => llm;

// Common LLM query function
export const queryLLM = async (systemPrompt, userPrompt, options = {}) => {
  if (!llm) {
    logger.warn('LLM not initialized');
    return null;
  }

  try {
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    const response = await llm.invoke(messages, options);
    return response.content;
  } catch (error) {
    logger.error('Error querying LLM:', error.message);
    throw error;
  }
};

// Structured output query
export const queryLLMStructured = async (systemPrompt, userPrompt, schema) => {
  if (!llm) {
    logger.warn('LLM not initialized');
    return null;
  }

  try {
    const structuredLLM = llm.withStructuredOutput(schema);
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    const response = await structuredLLM.invoke(messages);
    return response;
  } catch (error) {
    logger.error('Error querying structured LLM:', error.message);
    throw error;
  }
};
