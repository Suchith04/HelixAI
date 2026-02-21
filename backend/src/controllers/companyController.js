import { Company } from '../models/index.js';

// Get company details
export const getCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.companyId).select('-awsCredentials.accessKeyId -awsCredentials.secretAccessKey -llmSettings.apiKey');
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
      .select('-awsCredentials.accessKeyId -awsCredentials.secretAccessKey -llmSettings.apiKey');
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

// Set LLM API key
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
