import { useState, useEffect } from 'react';
import { Bot, Play, Activity, X, Clock, TrendingUp, AlertCircle, CheckCircle2, Gauge } from 'lucide-react';
import { agentService } from '../services/api';
import { onAgentState } from '../services/socket';

const agentIcons = { LogIntelligence: '📊', CrashDiagnostic: '🔍', ResourceOptimization: '⚡', AnomalyDetection: '🎯', Recovery: '🔄', Recommendation: '💡', CostOptimization: '💰' };

const ConfidenceGauge = ({ value = 0 }) => {
  const percentage = Math.round(value * 100);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="progress-ring-circle"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-white font-bold text-sm">{percentage}%</span>
      </div>
    </div>
  );
};

const AgentDetailModal = ({ agent, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl animate-slide-in" onClick={e => e.stopPropagation()}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{agentIcons[agent.name] || '🤖'}</span>
          <div>
            <h2 className="text-xl font-bold text-white">{agent.displayName || agent.name}</h2>
            <p className="text-dark-400 text-sm">{agent.type} • {agent.currentState?.status || 'inactive'}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-dark-800 rounded-lg transition-colors">
          <X className="w-5 h-5 text-dark-400" />
        </button>
      </div>

      <p className="text-dark-300 text-sm mb-6">{agent.description}</p>

      {/* Confidence */}
      <div className="flex items-center justify-center mb-6">
        <ConfidenceGauge value={agent.currentState?.confidence || 0} />
        <div className="ml-4">
          <p className="text-dark-400 text-xs">Confidence Level</p>
          <p className="text-white font-semibold">{((agent.currentState?.confidence || 0) * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <p className="text-dark-400 text-xs">Tasks Completed</p>
          </div>
          <p className="text-white font-bold text-xl">{agent.currentState?.metrics?.tasksCompleted || 0}</p>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            <p className="text-dark-400 text-xs">Success Rate</p>
          </div>
          <p className="text-white font-bold text-xl">{((agent.currentState?.metrics?.successRate || 0) * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-dark-400 text-xs">Errors</p>
          </div>
          <p className="text-white font-bold text-xl">{agent.currentState?.metrics?.errorsEncountered || 0}</p>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <p className="text-dark-400 text-xs">Avg Response</p>
          </div>
          <p className="text-white font-bold text-xl">{agent.currentState?.metrics?.averageResponseTime ? `${(agent.currentState.metrics.averageResponseTime / 1000).toFixed(1)}s` : '—'}</p>
        </div>
      </div>

      {/* Configuration */}
      {agent.configuration && (
        <div>
          <h4 className="text-sm font-medium text-dark-400 mb-2">Configuration</h4>
          <div className="bg-dark-800/50 rounded-xl p-4 font-mono text-xs text-dark-300 max-h-32 overflow-y-auto custom-scrollbar">
            {Object.entries(agent.configuration).map(([key, val]) => (
              <div key={key} className="flex justify-between py-1">
                <span className="text-dark-400">{key}:</span>
                <span className="text-white">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Active */}
      {agent.currentState?.lastActive && (
        <p className="text-dark-500 text-xs mt-4">Last active: {new Date(agent.currentState.lastActive).toLocaleString()}</p>
      )}
    </div>
  </div>
);

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    agentService.getAgents()
      .then(res => setAgents(res.data.agents))
      .catch(console.error)
      .finally(() => setLoading(false));

    onAgentState((data) => {
      setAgents(prev => prev.map(a => a.name === data.agentName ? { ...a, currentState: { ...a.currentState, ...data } } : a));
    });
  }, []);

  const handleTrigger = async (e, agent) => {
    e.stopPropagation();
    setTriggering(agent.name);
    try {
      await agentService.triggerAgent({ agentName: agent.name, action: 'process', data: {} });
    } catch (e) { console.error(e); }
    finally { setTriggering(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>;

  // Summary stats
  const activeCount = agents.filter(a => a.currentState?.status === 'active').length;
  const processingCount = agents.filter(a => a.currentState?.status === 'processing').length;
  const totalTasks = agents.reduce((s, a) => s + (a.currentState?.metrics?.tasksCompleted || 0), 0);
  const avgSuccess = agents.length > 0 ? agents.reduce((s, a) => s + (a.currentState?.metrics?.successRate || 0), 0) / agents.length : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Agents</h1>
          <p className="text-dark-400 mt-1">Monitor and control your intelligent agents</p>
        </div>
        <button onClick={() => agentService.initializeAgents().then(() => window.location.reload())} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">Initialize Agents</button>
      </div>

      {/* Agent Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
          <p className="text-dark-400 text-sm">Total Agents</p>
          <p className="text-2xl font-bold text-white">{agents.length}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-dark-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
        </div>
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
          <p className="text-dark-400 text-sm">Total Tasks</p>
          <p className="text-2xl font-bold text-primary-400">{totalTasks}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-dark-400 text-sm">Avg Success</p>
          <p className="text-2xl font-bold text-amber-400">{(avgSuccess * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => (
          <div key={agent._id} onClick={() => setSelectedAgent(agent)} className="glass-card p-6 cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{agentIcons[agent.name] || '🤖'}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{agent.displayName || agent.name}</h3>
                  <p className="text-dark-400 text-sm">{agent.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`status-dot ${agent.currentState?.status === 'active' ? 'active' : agent.currentState?.status === 'processing' ? 'active' : 'inactive'}`} />
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  agent.currentState?.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  agent.currentState?.status === 'processing' ? 'bg-blue-500/20 text-blue-400' : 'bg-dark-700 text-dark-400'
                }`}>
                  {agent.currentState?.status || 'inactive'}
                </span>
              </div>
            </div>

            <p className="text-dark-300 text-sm mb-4">{agent.description}</p>

            {/* Confidence Gauge + Metrics */}
            <div className="flex items-center gap-4 mb-4">
              <ConfidenceGauge value={agent.currentState?.confidence || 0} />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Tasks</span>
                  <span className="text-white font-semibold">{agent.currentState?.metrics?.tasksCompleted || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Success</span>
                  <span className="text-white font-semibold">{((agent.currentState?.metrics?.successRate || 0) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Errors</span>
                  <span className="text-white font-semibold">{agent.currentState?.metrics?.errorsEncountered || 0}</span>
                </div>
              </div>
            </div>

            <button onClick={(e) => handleTrigger(e, agent)} disabled={triggering === agent.name} className="w-full flex items-center justify-center gap-2 py-2.5 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors disabled:opacity-50">
              {triggering === agent.name ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {triggering === agent.name ? 'Running...' : 'Trigger'}
            </button>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedAgent && <AgentDetailModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
    </div>
  );
};

export default Agents;
