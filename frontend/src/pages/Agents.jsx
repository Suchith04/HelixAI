import { useState, useEffect } from 'react';
import { Bot, Play, Activity, X, Clock, TrendingUp, AlertCircle, CheckCircle2, Gauge, CloudLightning, ChevronDown, Info } from 'lucide-react';
import { agentService, cloudwatchService } from '../services/api';
import { onAgentState } from '../services/socket';

const agentIcons = { LogIntelligence: '📊', CrashDiagnostic: '🔍', ResourceOptimization: '⚡', AnomalyDetection: '🎯', Recovery: '🔄', Recommendation: '💡', CostOptimization: '💰' };

// Map backend AgentState status values to display-friendly values
const statusMap = {
  idle: { label: 'active', colorClass: 'bg-green-500/20 text-green-400', dotClass: 'active' },
  working: { label: 'processing', colorClass: 'bg-blue-500/20 text-blue-400', dotClass: 'active' },
  error: { label: 'error', colorClass: 'bg-red-500/20 text-red-400', dotClass: 'inactive' },
  waiting: { label: 'waiting', colorClass: 'bg-amber-500/20 text-amber-400', dotClass: 'active' },
  paused: { label: 'paused', colorClass: 'bg-dark-700 text-dark-400', dotClass: 'inactive' },
};
const getStatus = (agent) => {
  const raw = agent.currentState?.status;
  return statusMap[raw] || { label: raw || 'inactive', colorClass: 'bg-dark-700 text-dark-400', dotClass: 'inactive' };
};
const getMetric = (agent, key) => agent.currentState?.metrics?.[key] || 0;

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
            <p className="text-dark-400 text-sm">{agent.type} • {getStatus(agent).label}</p>
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
          <p className="text-white font-bold text-xl">{getMetric(agent, 'tasksCompleted')}</p>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            <p className="text-dark-400 text-xs">Success Rate</p>
          </div>
          <p className="text-white font-bold text-xl">{((getMetric(agent, 'successRate')) * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-dark-400 text-xs">Errors</p>
          </div>
          <p className="text-white font-bold text-xl">{getMetric(agent, 'errorCount')}</p>
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

  // CloudWatch log group state
  const [logGroups, setLogGroups] = useState([]);
  const [selectedLogGroup, setSelectedLogGroup] = useState('');
  const [showLogGroupDropdown, setShowLogGroupDropdown] = useState(false);
  const [logGroupsLoading, setLogGroupsLoading] = useState(false);
  const [cwError, setCwError] = useState('');

  // Last trigger result state
  const [lastResult, setLastResult] = useState(null);
  const [lastCloudwatchMeta, setLastCloudwatchMeta] = useState(null);
  const [lastTriggeredAgent, setLastTriggeredAgent] = useState('');

  useEffect(() => {
    agentService.getAgents()
      .then(res => setAgents(res.data.agents))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load CloudWatch log groups
    setLogGroupsLoading(true);
    cloudwatchService.getLogGroups()
      .then(res => {
        const groups = res.data.logGroups || [];
        setLogGroups(groups);
        if (groups.length > 0) setSelectedLogGroup(groups[0].logGroupName);
      })
      .catch(() => setCwError('AWS credentials not configured. Agents will use database logs as fallback.'))
      .finally(() => setLogGroupsLoading(false));

    onAgentState((data) => {
      setAgents(prev => prev.map(a => a.name === data.agentName ? { ...a, currentState: { ...a.currentState, ...data } } : a));
    });
  }, []);

  const handleTrigger = async (e, agent) => {
    e.stopPropagation();
    setTriggering(agent.name);
    setLastResult(null);
    setLastCloudwatchMeta(null);
    setLastTriggeredAgent(agent.displayName || agent.name);
    try {
      const res = await agentService.triggerAgent({
        agentName: agent.name,
        action: 'process',
        data: {},
        logGroupName: selectedLogGroup || undefined,
      });
      setLastResult(res.data.result);
      setLastCloudwatchMeta(res.data.cloudwatchMeta);
    } catch (e) { console.error(e); }
    finally { setTriggering(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>;

  // Summary stats
  const activeCount = agents.filter(a => ['idle', 'working', 'waiting'].includes(a.currentState?.status)).length;
  const processingCount = agents.filter(a => a.currentState?.status === 'working').length;
  const totalTasks = agents.reduce((s, a) => s + (getMetric(a, 'tasksCompleted')), 0);
  const avgSuccess = agents.length > 0 ? agents.reduce((s, a) => s + (getMetric(a, 'successRate')), 0) / agents.length : 0;

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

      {/* ── CloudWatch Log Group Selector ──────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <CloudLightning className="w-5 h-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-white">CloudWatch Log Source</h2>
          <span className="text-dark-500 text-sm">Select which log group agents will analyze</span>
        </div>

        {cwError && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2.5 rounded-lg text-sm mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            {cwError}
          </div>
        )}

        <div className="relative max-w-2xl">
          <button
            onClick={() => setShowLogGroupDropdown(!showLogGroupDropdown)}
            disabled={logGroupsLoading || logGroups.length === 0}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm hover:border-primary-500/50 transition-colors disabled:opacity-50"
          >
            <span className="truncate">
              {logGroupsLoading ? 'Loading log groups...' : selectedLogGroup || 'No log groups available (using DB fallback)'}
            </span>
            <ChevronDown className="w-4 h-4 text-dark-400 flex-shrink-0 ml-2" />
          </button>
          {showLogGroupDropdown && logGroups.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
              {logGroups.map((lg) => (
                <button
                  key={lg.logGroupName}
                  onClick={() => { setSelectedLogGroup(lg.logGroupName); setShowLogGroupDropdown(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-dark-700 transition-colors ${
                    selectedLogGroup === lg.logGroupName ? 'bg-primary-600/20 text-primary-400' : 'text-white'
                  }`}
                >
                  <span className="block truncate font-medium">{lg.logGroupName}</span>
                  <span className="text-dark-500 text-xs">
                    {lg.retentionInDays === 'Never expire' ? 'No expiry' : `${lg.retentionInDays}d retention`}
                    {lg.storedBytes ? ` • ${(lg.storedBytes / 1024 / 1024).toFixed(1)} MB` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CloudWatch Meta & Last Result ──────────────────────────────────── */}
      {lastCloudwatchMeta && (
        <div className="glass-card p-5 border-l-4 border-primary-500">
          <div className="flex items-center gap-3 mb-3">
            <CloudLightning className="w-5 h-5 text-primary-400" />
            <h3 className="text-white font-semibold">CloudWatch Logs Used — {lastTriggeredAgent}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-800/50 rounded-xl p-3">
              <p className="text-dark-400 text-xs">Log Group</p>
              <p className="text-white text-sm font-mono truncate">{lastCloudwatchMeta.logGroupName}</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-3">
              <p className="text-dark-400 text-xs">Total Raw Logs</p>
              <p className="text-white font-bold text-lg">{lastCloudwatchMeta.totalRaw}</p>
            </div>
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-3">
              <p className="text-dark-400 text-xs">Important (Fed to AI)</p>
              <p className="text-primary-400 font-bold text-lg">{lastCloudwatchMeta.totalImportant}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <p className="text-dark-400 text-xs">Noise Reduction</p>
              <p className="text-green-400 font-bold text-lg">{lastCloudwatchMeta.reductionRatio}</p>
            </div>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="glass-card p-5 animate-slide-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
            <h3 className="text-white text-lg font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary-400" />
              Agent Analysis Result — {lastTriggeredAgent}
            </h3>
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg ${
              lastResult.severity === 'critical' || lastResult.severity === 'high' || (lastResult.errors && lastResult.errors.length > 0)
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-red-500/10'
                : 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-green-500/10'
            }`}>
              {lastResult.severity === 'critical' || lastResult.severity === 'high' || (lastResult.errors && lastResult.errors.length > 0) ? (
                <><AlertCircle className="w-4 h-4" /> Issues Detected (Failed)</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> All Clear (Passed)</>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-dark-800/70 rounded-xl p-4 border border-dark-700 flex flex-col justify-center">
              <h4 className="text-dark-400 text-xs uppercase tracking-wider mb-1 font-semibold">Severity Assessment</h4>
              <p className={`text-xl font-bold capitalize mt-1 ${
                lastResult.severity === 'critical' ? 'text-red-500' :
                lastResult.severity === 'high' ? 'text-amber-500' :
                lastResult.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
              }`}>{lastResult.severity || 'Unknown'}</p>
            </div>
            {lastResult.confidence !== undefined && (
              <div className="bg-dark-800/70 rounded-xl p-4 border border-dark-700 flex flex-col justify-center">
                 <h4 className="text-dark-400 text-xs uppercase tracking-wider mb-2 font-semibold">AI Confidence Score</h4>
                 <div className="flex items-center gap-3">
                   <div className="flex-1 bg-dark-900 rounded-full h-2.5 overflow-hidden shadow-inner tracking-wide">
                     <div className={`h-full rounded-full ${lastResult.confidence > 0.7 ? 'bg-green-500' : lastResult.confidence > 0.4 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${(lastResult.confidence * 100).toFixed(0)}%` }}></div>
                   </div>
                   <span className="text-white font-bold text-lg">{(lastResult.confidence * 100).toFixed(0)}%</span>
                 </div>
              </div>
            )}
          </div>

          {(lastResult.llmInsights || lastResult.llmInsights === "") && (
            <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/30 rounded-xl p-5 mb-5 shadow-lg shadow-primary-500/5">
              <h4 className="text-primary-400 text-sm font-semibold mb-3 flex items-center gap-2">
                <CloudLightning className="w-5 h-5" /> AI Log Intelligence Insights
              </h4>
              <p className="text-dark-100 text-sm leading-relaxed whitespace-pre-wrap">{typeof lastResult.llmInsights === 'string' ? lastResult.llmInsights : JSON.stringify(lastResult.llmInsights, null, 2)}</p>
            </div>
          )}

          <div className="bg-dark-800/40 border border-dark-700 hover:border-dark-600 transition-colors rounded-xl overflow-hidden">
            <details className="group">
              <summary className="p-4 cursor-pointer text-dark-300 hover:text-white transition-colors text-sm font-medium flex items-center outline-none select-none">
                <ChevronDown className="w-4 h-4 mr-2 group-open:-rotate-180 transition-transform duration-200" />
                Raw Data Payload
              </summary>
              <div className="p-4 pt-0 border-t border-dark-700/50 bg-dark-900/50 text-dark-400 text-xs whitespace-pre-wrap font-mono max-h-60 overflow-y-auto custom-scrollbar">
                {JSON.stringify(lastResult, null, 2)}
              </div>
            </details>
          </div>
        </div>
      )}

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
                <div className={`status-dot ${getStatus(agent).dotClass}`} />
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatus(agent).colorClass}`}>
                  {getStatus(agent).label}
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
                  <span className="text-white font-semibold">{getMetric(agent, 'tasksCompleted')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Success</span>
                  <span className="text-white font-semibold">{((getMetric(agent, 'successRate')) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Errors</span>
                  <span className="text-white font-semibold">{getMetric(agent, 'errorCount')}</span>
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

