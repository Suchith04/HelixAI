import { useState, useEffect } from 'react';
import { Building, Key, Cloud, Save } from 'lucide-react';
import { companyService } from '../services/api';

const Settings = () => {
  const [company, setCompany] = useState(null);
  const [awsCreds, setAwsCreds] = useState({ accessKeyId: '', secretAccessKey: '', region: 'us-east-1' });
  const [llmKey, setLlmKey] = useState({ apiKey: '', provider: 'openai', model: 'gpt-4o-mini' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    companyService.getCompany().then(res => setCompany(res.data.company)).catch(console.error);
  }, []);

  const handleSaveAws = async () => {
    setSaving(true);
    try {
      await companyService.setAwsCredentials(awsCreds);
      setMessage('AWS credentials saved!');
      setAwsCreds({ accessKeyId: '', secretAccessKey: '', region: awsCreds.region });
    } catch (e) { setMessage(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); setTimeout(() => setMessage(''), 3000); }
  };

  const handleSaveLlm = async () => {
    setSaving(true);
    try {
      await companyService.setLlmKey(llmKey);
      setMessage('LLM API key saved!');
      setLlmKey({ ...llmKey, apiKey: '' });
    } catch (e) { setMessage(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); setTimeout(() => setMessage(''), 3000); }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-dark-400 mt-1">Configure your HelixAI instance</p>
      </div>

      {message && <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">{message}</div>}

      <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-500/20 rounded-lg"><Building className="w-5 h-5 text-primary-400" /></div>
          <h2 className="text-xl font-semibold text-white">Company Details</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">Company Name</label>
            <input type="text" value={company?.name || ''} readOnly className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white" />
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">Industry</label>
            <input type="text" value={company?.industry || ''} readOnly className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white" />
          </div>
        </div>
      </div>

      <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg"><Cloud className="w-5 h-5 text-orange-400" /></div>
          <h2 className="text-xl font-semibold text-white">AWS Credentials</h2>
        </div>
        <div className="space-y-4">
          <input type="text" value={awsCreds.accessKeyId} onChange={(e) => setAwsCreds({...awsCreds, accessKeyId: e.target.value})} placeholder="Access Key ID" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400" />
          <input type="password" value={awsCreds.secretAccessKey} onChange={(e) => setAwsCreds({...awsCreds, secretAccessKey: e.target.value})} placeholder="Secret Access Key" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400" />
          <select value={awsCreds.region} onChange={(e) => setAwsCreds({...awsCreds, region: e.target.value})} className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white">
            {['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={handleSaveAws} disabled={saving || !awsCreds.accessKeyId} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> Save AWS Credentials
          </button>
        </div>
      </div>

      <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg"><Key className="w-5 h-5 text-green-400" /></div>
          <h2 className="text-xl font-semibold text-white">LLM Configuration</h2>
        </div>
        <div className="space-y-4">
          <input type="password" value={llmKey.apiKey} onChange={(e) => setLlmKey({...llmKey, apiKey: e.target.value})} placeholder="OpenAI API Key" className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400" />
          <select value={llmKey.model} onChange={(e) => setLlmKey({...llmKey, model: e.target.value})} className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white">
            {['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={handleSaveLlm} disabled={saving || !llmKey.apiKey} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> Save LLM Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
