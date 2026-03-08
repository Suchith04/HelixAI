import mongoose from "mongoose";
import { encrypt, decrypt } from '../utils/encryption.js';

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Company email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  industry: {
    type: String,
    enum: ['technology', 'finance', 'healthcare', 'retail', 'manufacturing', 'other'],
    default: 'technology',
  },
  size: {
    type: String,
    enum: ['startup', 'small', 'medium', 'enterprise'],
    default: 'small',
  },
  website: {
    type: String,
    trim: true,
  },
  // AWS Credentials (encrypted)
  awsCredentials: {
    accessKeyId: {
      iv: String,
      encrypted: String,
      tag: String,
    },
    secretAccessKey: {
      iv: String,
      encrypted: String,
      tag: String,
    },
    region: {
      type: String,
      default: 'us-east-1',
    },
    isConfigured: {
      type: Boolean,
      default: false,
    },
  },
  // Infrastructure Configuration
  infrastructure: {
    cloudProvider: {
      type: String,
      enum: ['aws', 'gcp', 'azure', 'hybrid'],
      default: 'aws',
    },
    services: [{
      type: String,
      enum: ['ec2', 'eks', 'ecs', 'lambda', 'rds', 's3', 'cloudwatch', 'sqs', 'sns'],
    }],
    kubernetesEnabled: {
      type: Boolean,
      default: false,
    },
    kubernetesConfig: {
      clusterName: String,
      clusterArn: String,
    },
  },
  // Agent Configuration
  agentSettings: {
    enabledAgents: [{
      type: String,
      enum: ['log_intelligence', 'crash_diagnostic', 'resource_optimization', 
             'anomaly_detection', 'recovery', 'recommendation', 'cost_optimization'],
    }],
    autoRecoveryEnabled: {
      type: Boolean,
      default: false,
    },
    alertThresholds: {
      cpu: { type: Number, default: 80 },
      memory: { type: Number, default: 85 },
      disk: { type: Number, default: 90 },
    },
  },
  // LLM Settings (active config synced here for backward compat)
  llmSettings: {
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'google', 'groq'],
      default: 'openai',
    },
    apiKey: {
      iv: String,
      encrypted: String,
      tag: String,
    },
    model: {
      type: String,
      default: 'gpt-4o-mini',
    },
    isConfigured: {
      type: Boolean,
      default: false,
    },
  },
  // Saved LLM Configurations (multiple)
  llmConfigurations: [{
    provider: {
      type: String,
      enum: ['openai', 'anthropic', 'google', 'groq'],
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    apiKey: {
      iv: String,
      encrypted: String,
      tag: String,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  // Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    startDate: Date,
    endDate: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Methods to handle encryption
companySchema.methods.setAwsCredentials = function(accessKeyId, secretAccessKey) {
  this.awsCredentials.accessKeyId = encrypt(accessKeyId);
  this.awsCredentials.secretAccessKey = encrypt(secretAccessKey);
  this.awsCredentials.isConfigured = true;
};

companySchema.methods.getAwsCredentials = function() {
  if (!this.awsCredentials.isConfigured) return null;
  return {
    accessKeyId: decrypt(this.awsCredentials.accessKeyId),
    secretAccessKey: decrypt(this.awsCredentials.secretAccessKey),
    region: this.awsCredentials.region,
  };
};

companySchema.methods.getAwsCredentialsMasked = function() {
  if (!this.awsCredentials.isConfigured || !this.awsCredentials.accessKeyId) return null;
  const awsCredSmall = this.awsCredentials.accessKeyId.encrypted.slice(0, 4)+"****"+this.awsCredentials.accessKeyId.encrypted.slice(-2);
  const awsSecrSmall =this.awsCredentials.secretAccessKey.encrypted.slice(0, 4)+"****"+this.awsCredentials.secretAccessKey.encrypted.slice(-2);
  return {
    accessKeyId: awsCredSmall,
    secretAccessKey: awsSecrSmall,
    region: this.awsCredentials.region,
  };
};

companySchema.methods.setLLMApiKey = function(apiKey) {
  this.llmSettings.apiKey = encrypt(apiKey);
  this.llmSettings.isConfigured = true;
};

companySchema.methods.getLLMApiKey = function() {
  if (!this.llmSettings.apiKey?.encrypted) return null;
  return decrypt(this.llmSettings.apiKey);
};

// Add a new LLM configuration to the saved list
companySchema.methods.addLLMConfig = function(provider, model, apiKey) {
  const encryptedKey = encrypt(apiKey);
  this.llmConfigurations.push({
    provider,
    model,
    apiKey: encryptedKey,
    isActive: false,
    addedAt: new Date(),
  });
};

// Get all saved LLM configs with masked API keys
companySchema.methods.getLLMConfigsMasked = function() {
  return this.llmConfigurations.map((config, index) => {
    let maskedKey = '••••••••';
    try {
      const decryptedKey = decrypt(config.apiKey);
      maskedKey = decryptedKey.slice(0, 4) + '••••••••' + decryptedKey.slice(-4);
    } catch (e) { /* keep default mask */ }
    return {
      index,
      provider: config.provider,
      model: config.model,
      maskedKey,
      isActive: config.isActive,
      addedAt: config.addedAt,
    };
  });
};

// Index for faster queries
companySchema.index({ 'subscription.status': 1 });

const Company = mongoose.model('Company', companySchema);
export default Company;