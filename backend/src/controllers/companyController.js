import { Company } from '../models/index.js';

// Get company details
export const getCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId).select('-awsCredentials.accessKeyId -awsCredentials.secretAccessKey -llmSettings.apiKey -llmConfigurations.apiKey');
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json({ company });
  } catch (error) {
    next(error);
  }
};

// Update company
export const updateCompany = async (req, res, next) => {
  try {
    const updates = req.body;
    const company = await Company.findByIdAndUpdate(req.companyId, updates, { new: true, runValidators: true })
      .select('-awsCredentials.accessKeyId -awsCredentials.secretAccessKey -llmSettings.apiKey -llmConfigurations.apiKey');
    res.json({ company });
  } catch (error) {
    next(error);
  }
};

// Set AWS credentials
export const setAwsCredentials = async (req, res, next) => {
  try {
    const { accessKeyId, secretAccessKey, region } = req.body;
    const company = await Company.findById(req.companyId);
    
    company.setAwsCredentials(accessKeyId, secretAccessKey);
    company.awsCredentials.region = region || 'us-east-1';
    await company.save();

    res.json({ message: 'AWS credentials saved successfully', configured: true });
  } catch (error) {
    next(error);
  }
};

// Get AWS credentials (masked)
export const getAwsCredentialsMasked = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const masked = company.getAwsCredentialsMasked();
    if (!masked) return res.json({ configured: false });

    res.json({ configured: true, credentials: masked });
  } catch (error) {
    next(error);
  }
};

// Decrypt AWS credentials (returns actual values)
export const decryptAwsCredentials = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const creds = company.getAwsCredentials();
    if (!creds) return res.json({ configured: false });

    res.json({ configured: true, credentials: creds });
  } catch (error) {
    next(error);
  }
};

// Update infrastructure config
export const updateInfrastructure = async (req, res, next) => {
  try {
    const { cloudProvider, services, kubernetesEnabled, kubernetesConfig } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.companyId,
      { infrastructure: { cloudProvider, services, kubernetesEnabled, kubernetesConfig } },
      { new: true }
    );
    res.json({ infrastructure: company.infrastructure });
  } catch (error) {
    next(error);
  }
};

// Update agent settings
export const updateAgentSettings = async (req, res, next) => {
  try {
    const { enabledAgents, autoRecoveryEnabled, alertThresholds } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.companyId,
      { agentSettings: { enabledAgents, autoRecoveryEnabled, alertThresholds } },
      { new: true }
    );
    res.json({ agentSettings: company.agentSettings });
  } catch (error) {
    next(error);
  }
};

// Set LLM API key (legacy single config)
export const setLlmApiKey = async (req, res, next) => {
  try {
    const { apiKey, provider, model } = req.body;
    const company = await Company.findById(req.companyId);
    
    company.setLLMApiKey(apiKey);
    company.llmSettings.provider = provider || 'openai';
    company.llmSettings.model = model || 'gpt-4o-mini';
    await company.save();

    res.json({ message: 'LLM API key saved successfully' });
  } catch (error) {
    next(error);
  }
};

// Save a new LLM configuration to the list
export const saveLlmConfig = async (req, res, next) => {
  try {
    const { provider, model, apiKey } = req.body;
    if (!provider || !model || !apiKey) {
      return res.status(400).json({ error: 'Provider, model, and API key are required' });
    }

    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    company.addLLMConfig(provider, model, apiKey);

    // If this is the first config, set it as active
    if (company.llmConfigurations.length === 1) {
      company.llmConfigurations[0].isActive = true;
      company.llmSettings.provider = provider;
      company.llmSettings.model = model;
      company.llmSettings.apiKey = company.llmConfigurations[0].apiKey;
      company.llmSettings.isConfigured = true;
    }

    await company.save();

    const configs = company.getLLMConfigsMasked();
    res.json({ message: 'LLM configuration saved successfully', configs });
  } catch (error) {
    next(error);
  }
};

// Get all saved LLM configurations (masked keys)
export const getLlmConfigs = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const configs = company.getLLMConfigsMasked();
    res.json({ configs });
  } catch (error) {
    next(error);
  }
};

// Set one config as the active LLM configuration
export const setActiveLlmConfig = async (req, res, next) => {
  try {
    const { index } = req.body;
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    if (index < 0 || index >= company.llmConfigurations.length) {
      return res.status(400).json({ error: 'Invalid configuration index' });
    }

    // Deactivate all and activate selected
    company.llmConfigurations.forEach((cfg, i) => {
      cfg.isActive = (i === index);
    });

    // Sync to llmSettings for backward compatibility
    const activeConfig = company.llmConfigurations[index];
    company.llmSettings.provider = activeConfig.provider;
    company.llmSettings.model = activeConfig.model;
    company.llmSettings.apiKey = activeConfig.apiKey;
    company.llmSettings.isConfigured = true;

    await company.save();

    const configs = company.getLLMConfigsMasked();
    res.json({ message: 'Active LLM configuration updated', configs });
  } catch (error) {
    next(error);
  }
};

// Delete an LLM configuration by index
export const deleteLlmConfig = async (req, res, next) => {
  try {
    const index = parseInt(req.params.index);
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    if (index < 0 || index >= company.llmConfigurations.length) {
      return res.status(400).json({ error: 'Invalid configuration index' });
    }

    const wasActive = company.llmConfigurations[index].isActive;
    company.llmConfigurations.splice(index, 1);

    // If deleted config was active, activate the first remaining one
    if (wasActive && company.llmConfigurations.length > 0) {
      company.llmConfigurations[0].isActive = true;
      company.llmSettings.provider = company.llmConfigurations[0].provider;
      company.llmSettings.model = company.llmConfigurations[0].model;
      company.llmSettings.apiKey = company.llmConfigurations[0].apiKey;
    } else if (company.llmConfigurations.length === 0) {
      company.llmSettings.isConfigured = false;
    }

    await company.save();

    const configs = company.getLLMConfigsMasked();
    res.json({ message: 'LLM configuration deleted', configs });
  } catch (error) {
    next(error);
  }
};
