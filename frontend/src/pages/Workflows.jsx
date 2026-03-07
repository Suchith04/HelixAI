import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Play, Plus, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, BarChart3, ArrowRight } from 'lucide-react';
import { workflowService } from '../services/api';

const agentIcons = { LogIntelligence: '📊', CrashDiagnostic: '🔍', ResourceOptimization: '⚡', AnomalyDetection: '🎯', Recovery: '🔄', Recommendation: '💡', CostOptimization: '💰' };

const StepPipeline = ({ steps }) => {
  if (!steps?.length) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 custom-scrollbar">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/80 rounded-lg border border-dark-600">
            <span className="text-sm">{agentIcons[step.agent] || '🤖'}</span>
            <span className="text-xs text-dark-300 whitespace-nowrap">{step.action || step.agent}</span>
          </div>
          {i < steps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-dark-500 mx-1 shrink-0" />}
        </div>
      ))}
    </div>
  );
};

const Workflows = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedExecId, setExpandedExecId] = useState(null);

  useEffect(() => {
    Promise.all([workflowService.getWorkflows(), workflowService.getExecutions()])
      .then(([wfRes, execRes]) => { setWorkflows(wfRes.data.workflows); setExecutions(execRes.data.executions); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExecute = async (id) => {
    await workflowService.executeWorkflow(id, {});
    const execRes = await workflowService.getExecutions();
    setExecutions(execRes.data.executions);
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>;

  // Execution stats
  const completedCount = executions.filter(e => e.status === 'completed').length;
  const failedCount = executions.filter(e => e.status === 'failed').length;
  const runningCount = executions.filter(e => e.status === 'running' || e.status === 'pending').length;
  const avgDuration = executions.filter(e => e.duration).reduce((s, e) => s + e.duration, 0) / (executions.filter(e => e.duration).length || 1);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Workflows</h1>
          <p className="text-dark-400 mt-1">Manage multi-agent automation workflows</p>
        </div>
        <button onClick={() => navigate('/workflows/new')} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Workflow
        </button>
      </div>

      {/* Execution Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-dark-400" />
            <p className="text-dark-400 text-sm">Total Runs</p>
          </div>
          <p className="text-2xl font-bold text-white">{executions.length}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <p className="text-dark-400 text-sm">Completed</p>
          </div>
          <p className="text-2xl font-bold text-green-400">{completedCount}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-400" />
            <p className="text-dark-400 text-sm">Failed</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{failedCount}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <p className="text-dark-400 text-sm">Avg Duration</p>
          </div>
          <p className="text-2xl font-bold text-amber-400">{avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : '—'}</p>
        </div>
      </div>

      {/* Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.length > 0 ? workflows.map(workflow => (
          <div key={workflow._id} className="glass-card p-6 cursor-pointer" onClick={() => navigate(`/workflows/${workflow._id}`)}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-lg"><GitBranch className="w-5 h-5 text-primary-400" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{workflow.name}</h3>
                  <p className="text-dark-400 text-sm">{workflow.steps?.length || 0} steps</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${workflow.isActive ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'}`}>
                {workflow.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-dark-300 text-sm mb-3">{workflow.description || 'No description'}</p>

            {/* Step Pipeline */}
            <StepPipeline steps={workflow.steps} />

            {/* Trigger Config */}
            {workflow.trigger && (
              <div className="mt-3 flex items-center gap-2 text-xs text-dark-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Trigger: {workflow.trigger.type}{workflow.trigger.schedule ? ` (${workflow.trigger.schedule})` : ''}</span>
              </div>
            )}

            <button onClick={(e) => { e.stopPropagation(); handleExecute(workflow._id); }} className="w-full flex items-center justify-center gap-2 py-2.5 mt-4 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors">
              <Play className="w-4 h-4" /> Execute
            </button>
          </div>
        )) : (
          <div className="col-span-full text-center py-12 text-dark-400">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No workflows created yet</p>
            <p className="text-xs mt-1">Create a workflow to automate agent orchestration</p>
          </div>
        )}
      </div>

      {/* Executions Table */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Executions</h2>
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-dark-400 uppercase w-8"></th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Workflow</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Trigger</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Started</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {executions.length > 0 ? executions.slice(0, 20).map(exec => {
                const isExpanded = expandedExecId === exec._id;
                return (
                  <>
                    <tr key={exec._id} onClick={() => setExpandedExecId(isExpanded ? null : exec._id)} className="hover:bg-dark-800/50 cursor-pointer transition-colors">
                      <td className="px-4 py-4">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-dark-400" /> : <ChevronDown className="w-4 h-4 text-dark-400" />}
                      </td>
                      <td className="px-6 py-4 text-white font-medium">{exec.workflowName || exec.workflow?.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          exec.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          exec.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>{exec.status}</span>
                      </td>
                      <td className="px-6 py-4 text-dark-400 text-sm">{exec.triggeredBy?.type || '—'}</td>
                      <td className="px-6 py-4 text-dark-400 text-sm">{new Date(exec.startTime).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${
                          exec.duration > 30000 ? 'text-red-400' : exec.duration > 10000 ? 'text-amber-400' : 'text-green-400'
                        }`}>
                          {exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : '—'}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && exec.steps?.length > 0 && (
                      <tr key={`${exec._id}-steps`}>
                        <td colSpan={6} className="px-6 py-4 bg-dark-800/30">
                          <div className="expand-row space-y-2">
                            <h4 className="text-sm font-medium text-dark-400 mb-3">Step Results</h4>
                            {exec.steps.map((step, i) => (
                              <div key={i} className="flex items-center gap-4 p-3 bg-dark-800/50 rounded-lg text-sm">
                                <span className="text-lg">{agentIcons[step.agent] || '🤖'}</span>
                                <div className="flex-1">
                                  <p className="text-white font-medium">{step.agent} → {step.action}</p>
                                  {step.error && <p className="text-red-400 text-xs mt-1">{step.error}</p>}
                                </div>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  step.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                  step.status === 'skipped' ? 'bg-dark-700 text-dark-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>{step.status}</span>
                                {step.duration && <span className="text-dark-500 text-xs">{(step.duration / 1000).toFixed(1)}s</span>}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              }) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-dark-400">No executions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Workflows;
