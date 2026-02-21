import { useState, useEffect } from 'react';
import { Bot, Play, Settings, Activity } from 'lucide-react';
import { agentService } from '../services/api';
import { onAgentState } from '../services/socket';

const agentIcons = { LogIntelligence: '📊', CrashDiagnostic: '🔍', ResourceOptimization: '⚡', AnomalyDetection: '🎯', Recovery: '🔄', Recommendation: '💡', CostOptimization: '💰' };

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(null);

  useEffect(() => {
    agentService.getAgents()
      .then(res => setAgents(res.data.agents))
      .catch(console.error)
      .finally(() => setLoading(false));

    onAgentState((data) => {
      setAgents(prev => prev.map(a => a.name === data.agentName ? { ...a, currentState: { ...a.currentState, ...data } } : a));
    });
  }, []);

  const handleTrigger = async (agent) => {
    setTriggering(agent.name);
    try {
      await agentService.triggerAgent({ agentName: agent.name, action: 'process', data: {} });
    } catch (e) { console.error(e); }
    finally { setTriggering(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Agents</h1>
          <p className="text-dark-400 mt-1">Monitor and control your intelligent agents</p>
        </div>
        <button onClick={() => agentService.initializeAgents().then(() => window.location.reload())} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Initialize Agents</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (
          <div key={agent._id} className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6 hover:border-dark-600 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agentIcons[agent.name] || '🤖'}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{agent.displayName || agent.name}</h3>
                  <p className="text-dark-400 text-sm">{agent.type}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                agent.currentState?.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                agent.currentState?.status === 'processing' ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-700 text-dark-400'
              }`}>
                {agent.currentState?.status || 'inactive'}
              </span>
            </div>

            <p className="text-dark-300 text-sm mb-4">{agent.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="bg-dark-800/50 rounded-lg p-3">
                <p className="text-dark-400">Tasks</p>
                <p className="text-white font-semibold">{agent.currentState?.metrics?.tasksCompleted || 0}</p>
              </div>
              <div className="bg-dark-800/50 rounded-lg p-3">
                <p className="text-dark-400">Success</p>
                <p className="text-white font-semibold">{(agent.currentState?.metrics?.successRate * 100 || 0).toFixed(0)}%</p>
              </div>
            </div>

            <button onClick={() => handleTrigger(agent)} disabled={triggering === agent.name} className="w-full flex items-center justify-center gap-2 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {triggering === agent.name ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {triggering === agent.name ? 'Running...' : 'Trigger'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Agents;
