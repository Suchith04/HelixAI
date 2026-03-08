import { useState, useEffect } from 'react';
import { Building, Key, Cloud, Save, Shield, Server, Cpu, CheckCircle, XCircle, Lock, Eye, EyeOff, Trash2, Star, Plus } from 'lucide-react';
import { companyService, authService } from '../services/api';

const ToggleSwitch = ({ active, onChange }) => (
  <button onClick={onChange} className={`toggle-switch ${active ? 'active' : ''}`} />
);

const ConnectionStatus = ({ configured, label }) => (
  <div className="flex items-center gap-2">
    {configured ? (
      <div className="flex items-center gap-1.5">
        <div className="status-dot active" />
        <span className="text-green-400 text-xs font-medium">Connected</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5">
        <div className="status-dot inactive" />
        <span className="text-dark-400 text-xs font-medium">Not configured</span>
      </div>
    )}
  </div>
);

// Provider → model mapping
const PROVIDER_MODELS = {
  openai: { label: 'OpenAI (ChatGPT)', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  google: { label: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  anthropic: { label: 'Anthropic Claude (Paid)', models: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-haiku'] },
  groq: { label: 'Groq (Free Tier)', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
};

const Settings = () => {
  const [company, setCompany] = useState(null);
  const [awsCreds, setAwsCreds] = useState({ accessKeyId: '', secretAccessKey: '', region: 'us-east-1' });
  const [awsDisplay, setAwsDisplay] = useState(null); // masked or decrypted creds display
  const [awsDecrypted, setAwsDecrypted] = useState(false);
  const [llmKey, setLlmKey] = useState({ apiKey: '', provider: 'openai', model: 'gpt-4o-mini' });
  const [llmConfigs, setLlmConfigs] = useState([]);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [infrastructure, setInfrastructure] = useState({ cloudProvider: 'aws', services: [], kubernetesEnabled: false });
  const [agentSettings, setAgentSettings] = useState({ enabledAgents: [], autoRecoveryEnabled: false });

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    // Load company
    companyService.getCompany()
      .then(res => {
        const c = res.data.company;
        setCompany(c);
        if (c?.infrastructure) setInfrastructure(c.infrastructure);
        if (c?.agentSettings) setAgentSettings(c.agentSettings);
      })
      .catch(console.error);

    // Load LLM configs
    companyService.getLlmConfigs()
      .then(res => setLlmConfigs(res.data.configs || []))
      .catch(console.error);

    // Load masked AWS credentials
    companyService.getAwsCredentials()
      .then(res => {
        if (res.data.configured) {
          setAwsDisplay(res.data.credentials);
        }
      })
      .catch(console.error);
  }, []);

  // Update model when provider changes
  const handleProviderChange = (provider) => {
    const firstModel = PROVIDER_MODELS[provider]?.models[0] || '';
    setLlmKey({ ...llmKey, provider, model: firstModel });
  };

  const handleSaveAws = async () => {
    setSaving(true);
    try {
      await companyService.setAwsCredentials(awsCreds);
      showMessage('AWS credentials saved successfully!');
      setAwsCreds({ accessKeyId: '', secretAccessKey: '', region: awsCreds.region });
      // Refresh masked display
      const res = await companyService.getAwsCredentials();
      if (res.data.configured) {
        setAwsDisplay(res.data.credentials);
        setAwsDecrypted(false);
      }
      // Refresh company to update status badge
      const companyRes = await companyService.getCompany();
      setCompany(companyRes.data.company);
    } catch (e) { showMessage(e.response?.data?.error || 'Failed to save AWS credentials', 'error'); }
    finally { setSaving(false); }
  };

  const handleDecryptAws = async () => {
    try {
      const res = await companyService.decryptAwsCredentials();
      if (res.data.configured) {
        setAwsDisplay(res.data.credentials);
        setAwsDecrypted(true);
      }
    } catch (e) { showMessage(e.response?.data?.error || 'Failed to decrypt credentials', 'error'); }
  };

  const handleHideAws = async () => {
    try {
      const res = await companyService.getAwsCredentials();
      if (res.data.configured) {
        setAwsDisplay(res.data.credentials);
        setAwsDecrypted(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveLlmConfig = async () => {
    setSaving(true);
    try {
      const res = await companyService.saveLlmConfig(llmKey);
      showMessage('LLM configuration saved successfully!');
      setLlmConfigs(res.data.configs || []);
      setLlmKey({ ...llmKey, apiKey: '' });
      // Refresh company to update status
      const companyRes = await companyService.getCompany();
      setCompany(companyRes.data.company);
    } catch (e) { showMessage(e.response?.data?.error || 'Failed to save LLM config', 'error'); }
    finally { setSaving(false); }
  };

  const handleSetActiveLlm = async (index) => {
    try {
      const res = await companyService.setActiveLlmConfig({ index });
      setLlmConfigs(res.data.configs || []);
      showMessage('Active LLM model updated!');
    } catch (e) { showMessage(e.response?.data?.error || 'Failed to set active config', 'error'); }
  };

  const handleDeleteLlmConfig = async (index) => {
    try {
      const res = await companyService.deleteLlmConfig(index);
      setLlmConfigs(res.data.configs || []);
      showMessage('LLM configuration removed');
      const companyRes = await companyService.getCompany();
      setCompany(companyRes.data.company);
    } catch (e) { showMessage(e.response?.data?.error || 'Failed to delete config', 'error'); }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      showMessage('Password must be at least 8 characters', 'error');
      return;
    }
    setSaving(true);
    try {
      await authService.updatePassword?.({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      showMessage('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { showMessage(e.response?.data?.error || 'Failed to update password', 'error'); }
    finally { setSaving(false); }
  };

  const allAgentTypes = ['log_intelligence', 'crash_diagnostic', 'anomaly_detection', 'resource_optimization', 'recovery', 'recommendation', 'cost_optimization'];
  const agentDisplayNames = {
    log_intelligence: 'Log Intelligence',
    crash_diagnostic: 'Crash Diagnostic',
    anomaly_detection: 'Anomaly Detection',
    resource_optimization: 'Resource Optimization',
    recovery: 'Auto Recovery',
    recommendation: 'Recommendations',
    cost_optimization: 'Cost Optimization',
  };

  const toggleAgent = (agentName) => {
    const newEnabled = agentSettings.enabledAgents?.includes(agentName)
      ? agentSettings.enabledAgents.filter(a => a !== agentName)
      : [...(agentSettings.enabledAgents || []), agentName];
    setAgentSettings({ ...agentSettings, enabledAgents: newEnabled });
  };

  const providerIcon = (provider) => {
    const icons = { openai: '🤖', google: '🔷', anthropic: '🟠', groq: '⚡' };
    return icons[provider] || '🤖';
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-dark-400 mt-1">Configure your HelixAI instance</p>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-slide-in ${
          message.type === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-400' : 'bg-green-500/20 border border-green-500/50 text-green-400'
        }`}>
          {message.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Company Details */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-500/20 rounded-lg"><Building className="w-5 h-5 text-primary-400" /></div>
          <div>
            <h2 className="text-xl font-semibold text-white">Company Details</h2>
            <p className="text-dark-500 text-xs">Your organization information</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">Company Name</label>
            <input type="text" value={company?.name || ''} readOnly className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white" />
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">Industry</label>
            <input type="text" value={company?.industry || ''} readOnly className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white capitalize" />
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">Company Size</label>
            <input type="text" value={company?.size || '—'} readOnly className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white capitalize" />
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">Created</label>
            <input type="text" value={company?.createdAt ? new Date(company.createdAt).toLocaleDateString() : '—'} readOnly className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white" />
          </div>
        </div>
      </div>

      {/* AWS Credentials */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg"><Cloud className="w-5 h-5 text-orange-400" /></div>
            <div>
              <h2 className="text-xl font-semibold text-white">AWS Credentials</h2>
              <p className="text-dark-500 text-xs">Connect your AWS infrastructure</p>
            </div>
          </div>
          <ConnectionStatus configured={company?.awsCredentials?.isConfigured} />
        </div>

        {/* Display saved credentials (masked or decrypted) */}
        {awsDisplay && (
          <div className="mb-6 p-4 bg-dark-800/60 border border-dark-600 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-sm font-medium">Saved Credentials</h3>
              {awsDecrypted ? (
                <button onClick={handleHideAws} className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 transition-colors text-xs">
                  <EyeOff className="w-3.5 h-3.5" /> Hide
                </button>
              ) : (
                <button onClick={handleDecryptAws} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-xs">
                  <Eye className="w-3.5 h-3.5" /> Decrypt
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-dark-500 text-xs mb-1">Access Key ID</label>
                <div className={`px-3 py-2 bg-dark-900 overflow-auto rounded-lg text-sm font-mono ${awsDecrypted ? 'text-orange-300' : 'text-dark-300'}`}>
                  {awsDisplay.accessKeyId}
                </div>
              </div>
              <div>
                <label className="block text-dark-500 text-xs mb-1">Secret Access Key</label>
                <div className={`px-3 py-2 bg-dark-900 overflow-hidden rounded-lg text-sm font-mono ${awsDecrypted ? 'text-orange-300' : 'text-dark-300'}`}>
                  {awsDisplay.secretAccessKey}
                </div>
              </div>
              <div>
                <label className="block text-dark-500 text-xs mb-1">Region</label>
                <div className="px-3 py-2 bg-dark-900 rounded-lg text-dark-300 text-sm font-mono">
                  {awsDisplay.region}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form to update credentials */}
        <div className="space-y-4">
          <p className="text-dark-400 text-xs">{awsDisplay ? 'Update credentials:' : 'Configure credentials:'}</p>
          <input type="text" value={awsCreds.accessKeyId} onChange={(e) => setAwsCreds({...awsCreds, accessKeyId: e.target.value})} placeholder="Access Key ID" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" />
          <input type="password" value={awsCreds.secretAccessKey} onChange={(e) => setAwsCreds({...awsCreds, secretAccessKey: e.target.value})} placeholder="Secret Access Key" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" />
          <select value={awsCreds.region} onChange={(e) => setAwsCreds({...awsCreds, region: e.target.value})} className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-primary-500">
            {['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-south-1', 'ap-southeast-1'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={handleSaveAws} disabled={saving || !awsCreds.accessKeyId} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" /> Save AWS Credentials
          </button>
        </div>
      </div>

      {/* LLM Configuration */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg"><Key className="w-5 h-5 text-green-400" /></div>
            <div>
              <h2 className="text-xl font-semibold text-white">LLM Configuration</h2>
              <p className="text-dark-500 text-xs">AI model provider settings</p>
            </div>
          </div>
          <ConnectionStatus configured={company?.llmSettings?.isConfigured} />
        </div>

        {/* Saved LLM Configurations List */}
        {llmConfigs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white text-sm font-medium mb-3">Configured Models</h3>
            <div className="space-y-2">
              {llmConfigs.map((cfg) => (
                <div key={cfg.index} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${cfg.isActive ? 'bg-green-500/10 border border-green-500/30' : 'bg-dark-800/50 border border-dark-700'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{providerIcon(cfg.provider)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{PROVIDER_MODELS[cfg.provider]?.label || cfg.provider}</span>
                        {cfg.isActive && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">Active</span>
                        )}
                      </div>
                      <div className="text-dark-400 text-xs mt-0.5">
                        Model: <span className="text-dark-300">{cfg.model}</span> · Key: <span className="text-dark-300 font-mono">{cfg.maskedKey}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!cfg.isActive && (
                      <button onClick={() => handleSetActiveLlm(cfg.index)} className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-xs" title="Set as active model">
                        <Star className="w-3.5 h-3.5" /> Set Active
                      </button>
                    )}
                    <button onClick={() => handleDeleteLlmConfig(cfg.index)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-xs" title="Delete configuration">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Configuration */}
        <div className="space-y-4">
          <h3 className="text-white text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-400" /> Add New Configuration
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <select value={llmKey.provider} onChange={(e) => handleProviderChange(e.target.value)} className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-primary-500">
              {Object.entries(PROVIDER_MODELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
            <select value={llmKey.model} onChange={(e) => setLlmKey({...llmKey, model: e.target.value})} className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-primary-500">
              {PROVIDER_MODELS[llmKey.provider]?.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <input type="password" value={llmKey.apiKey} onChange={(e) => setLlmKey({...llmKey, apiKey: e.target.value})} placeholder={`${PROVIDER_MODELS[llmKey.provider]?.label || 'Provider'} API Key`} className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" />
          <button onClick={handleSaveLlmConfig} disabled={saving || !llmKey.apiKey} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </div>

      {/* Agent Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg"><Cpu className="w-5 h-5 text-purple-400" /></div>
          <div>
            <h2 className="text-xl font-semibold text-white">Agent Settings</h2>
            <p className="text-dark-500 text-xs">Enable or disable individual agents</p>
          </div>
        </div>

        {/* Auto-recovery toggle */}
        <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl mb-4">
          <div>
            <p className="text-white font-medium">Auto-Recovery</p>
            <p className="text-dark-400 text-xs">Allow agents to automatically remediate issues</p>
          </div>
          <ToggleSwitch active={agentSettings.autoRecoveryEnabled} onChange={() => setAgentSettings({ ...agentSettings, autoRecoveryEnabled: !agentSettings.autoRecoveryEnabled })} />
        </div>

        {/* Agent toggles */}
        <div className="space-y-3">
          {allAgentTypes.map(agent => (
            <div key={agent} className="flex items-center justify-between p-3 bg-dark-800/30 rounded-xl hover:bg-dark-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">{
                  { log_intelligence: '📊', crash_diagnostic: '🔍', anomaly_detection: '🎯', resource_optimization: '⚡', recovery: '🔄', recommendation: '💡', cost_optimization: '💰' }[agent]
                }</span>
                <span className="text-white text-sm font-medium">{agentDisplayNames[agent]}</span>
              </div>
              <ToggleSwitch active={agentSettings.enabledAgents?.includes(agent)} onChange={() => toggleAgent(agent)} />
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-500/20 rounded-lg"><Server className="w-5 h-5 text-cyan-400" /></div>
          <div>
            <h2 className="text-xl font-semibold text-white">Infrastructure</h2>
            <p className="text-dark-500 text-xs">Cloud provider and service configuration</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">Cloud Provider</label>
            <select value={infrastructure.cloudProvider || 'aws'} onChange={(e) => setInfrastructure({ ...infrastructure, cloudProvider: e.target.value })} className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-primary-500">
              <option value="aws">Amazon Web Services</option>
              <option value="gcp">Google Cloud Platform</option>
              <option value="azure">Microsoft Azure</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
            <div>
              <p className="text-white text-sm font-medium">Kubernetes</p>
              <p className="text-dark-400 text-xs">Enable K8s monitoring</p>
            </div>
            <ToggleSwitch active={infrastructure.kubernetesEnabled} onChange={() => setInfrastructure({ ...infrastructure, kubernetesEnabled: !infrastructure.kubernetesEnabled })} />
          </div>
        </div>
        {infrastructure.services?.length > 0 && (
          <div>
            <label className="block text-dark-400 text-sm mb-2">Monitored Services</label>
            <div className="flex flex-wrap gap-2">
              {infrastructure.services.map((svc, i) => (
                <span key={i} className="px-3 py-1.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-300 text-xs">{svc}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/20 rounded-lg"><Lock className="w-5 h-5 text-red-400" /></div>
          <div>
            <h2 className="text-xl font-semibold text-white">Change Password</h2>
            <p className="text-dark-500 text-xs">Update your account password</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <input type={showPasswords.current ? "text" : "password"} value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} placeholder="Current Password" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 pr-12" />
            <button type="button" onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-300">
              {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <input type={showPasswords.new ? "text" : "password"} value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} placeholder="New Password" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 pr-12" />
            <button type="button" onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-300">
              {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} placeholder="Confirm New Password" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500" />
          <button onClick={handleChangePassword} disabled={saving || !passwordData.currentPassword || !passwordData.newPassword} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" /> Update Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
