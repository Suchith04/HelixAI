import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Company } from '../models/index.js';
import { decrypt } from '../utils/encryption.js';
import logger from '../utils/logger.js';

// Cache LLM instances per company to avoid re-creating on every call
const llmCache = new Map();

/**
 * Create an LLM instance for a specific provider/model/apiKey combo
 */
function createLLM(provider, model, apiKey) {
  const commonOpts = { temperature: 0.3, maxTokens: 2000 };

  switch (provider) {
    case 'openai':
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        model: model || 'gpt-4o-mini',
        ...commonOpts,
      });

    case 'google':
      return new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        model: model || 'gemini-2.0-flash',
        model: model || 'gemini-2.0-flash', // Keep for backward compatibility if needed
        ...commonOpts,
      });

    case 'anthropic':
      return new ChatAnthropic({
        anthropicApiKey: apiKey,
        model: model || 'claude-3.5-sonnet',
        ...commonOpts,
      });

    case 'groq':
      return new ChatGroq({
        apiKey: apiKey,
        model: model || 'llama-3.3-70b-versatile',
        ...commonOpts,
      });

    default:
      logger.warn(`Unknown LLM provider: ${provider}, falling back to OpenAI`);
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        model: model || 'gpt-4o-mini',
        ...commonOpts,
      });
  }
}

/**
 * Get (or create) an LLM instance for a company based on its active LLM config.
 * Falls back to env-var-based OpenAI if no company config exists.
 */
async function getLLMForCompany(companyId) {
  // Check cache first
  const cached = llmCache.get(companyId);
  if (cached && Date.now() - cached.createdAt < 300000) { // 5-min TTL
    return cached.llm;
  }

  try {
    if (companyId) {
      const company = await Company.findById(companyId);
      if (company) {
        // Find the active LLM configuration
        const activeConfig = company.llmConfigurations?.find(c => c.isActive);

        if (activeConfig && activeConfig.apiKey?.encrypted && activeConfig.apiKey?.iv && activeConfig.apiKey?.tag) {
          try {
            const apiKey = decrypt(activeConfig.apiKey);
            const llm = createLLM(activeConfig.provider, activeConfig.model, apiKey);
            llmCache.set(companyId, { llm, createdAt: Date.now() });
            logger.info(`LLM initialized: ${activeConfig.provider}/${activeConfig.model} for company ${companyId}`);
            return llm;
          } catch (decryptErr) {
            logger.warn(`Failed to decrypt active LLM config: ${decryptErr.message}`);
          }
        } else if (activeConfig) {
          logger.warn(`Active LLM config found for ${activeConfig.provider} but apiKey is incomplete (missing iv/tag). Trying fallbacks.`);
        }

        // Fallback: use llmSettings (legacy single config)
        if (company.llmSettings?.isConfigured && company.llmSettings?.apiKey?.encrypted && company.llmSettings?.apiKey?.iv && company.llmSettings?.apiKey?.tag) {
          try {
            const apiKey = company.getLLMApiKey();
            if (apiKey) {
              const llm = createLLM(
                company.llmSettings.provider,
                company.llmSettings.model,
                apiKey
              );
              llmCache.set(companyId, { llm, createdAt: Date.now() });
              logger.info(`LLM initialized (legacy): ${company.llmSettings.provider}/${company.llmSettings.model} for company ${companyId}`);
              return llm;
            }
          } catch (legacyErr) {
            logger.warn(`Failed to decrypt legacy LLM config: ${legacyErr.message}`);
          }
        }

        // Fallback 2: try any config from llmConfigurations that has valid encryption data
        for (const cfg of (company.llmConfigurations || [])) {
          if (cfg.apiKey?.encrypted && cfg.apiKey?.iv && cfg.apiKey?.tag) {
            try {
              const apiKey = decrypt(cfg.apiKey);
              const llm = createLLM(cfg.provider, cfg.model, apiKey);
              llmCache.set(companyId, { llm, createdAt: Date.now() });
              logger.info(`LLM initialized (fallback config): ${cfg.provider}/${cfg.model} for company ${companyId}`);
              return llm;
            } catch (cfgErr) {
              logger.warn(`Failed to decrypt config ${cfg.provider}: ${cfgErr.message}`);
            }
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`Failed to load company LLM config: ${error.message}`);
  }

  // Final fallback: environment variable based OpenAI
  return getFallbackLLM();
}

// Fallback LLM using env vars (backward compatible)
let fallbackLLM = null;

function getFallbackLLM() {
  if (!fallbackLLM && process.env.OPENAI_API_KEY) {
    fallbackLLM = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 2000,
    });
    logger.info('Fallback LLM initialized with OPENAI_API_KEY env var');
  }
  return fallbackLLM;
}

/**
 * Initialize LangChain — creates the fallback LLM from env vars.
 * Company-specific LLMs are created on demand.
 */
export const initializeLangChain = () => {
  try {
    getFallbackLLM();
    logger.info('LangChain initialized');
  } catch (error) {
    logger.error('Error initializing LangChain:', error.message);
  }
};

export const getLLM = () => fallbackLLM;

/**
 * Clear cached LLM for a company (call when LLM settings change)
 */
export const clearLLMCache = (companyId) => {
  llmCache.delete(companyId);
};

/**
 * Query LLM using the company's active configuration.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Object} options - { companyId, ...langchainOptions }
 */
export const queryLLM = async (systemPrompt, userPrompt, options = {}) => {
  const { companyId, ...llmOptions } = options;

  const llm = await getLLMForCompany(companyId);

  if (!llm) {
    logger.warn('No LLM available (no API key configured)');
    return null;
  }

  try {
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    const response = await llm.invoke(messages, llmOptions);
    return response.content;
  } catch (error) {
    logger.error(`Error querying LLM: ${error.message}`);
    throw error;
  }
};

/**
 * Structured output query using the company's active configuration.
 */
export const queryLLMStructured = async (systemPrompt, userPrompt, schema, options = {}) => {
  const { companyId, ...llmOptions } = options;

  const llm = await getLLMForCompany(companyId);

  if (!llm) {
    logger.warn('No LLM available for structured query');
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
