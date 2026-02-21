import { useState, useEffect } from 'react';
import { GitBranch, Play, Plus, Clock } from 'lucide-react';
import { workflowService } from '../services/api';

const Workflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Workflows</h1>
          <p className="text-dark-400 mt-1">Manage multi-agent automation workflows</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" /> Create Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.length > 0 ? workflows.map(workflow => (
          <div key={workflow._id} className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6 hover:border-dark-600 transition-all">
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
            <p className="text-dark-300 text-sm mb-4">{workflow.description || 'No description'}</p>
            <button onClick={() => handleExecute(workflow._id)} className="w-full flex items-center justify-center gap-2 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors">
              <Play className="w-4 h-4" /> Execute
            </button>
          </div>
        )) : (
          <div className="col-span-full text-center py-12 text-dark-400">No workflows created yet</div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Executions</h2>
        <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Workflow</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Started</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {executions.length > 0 ? executions.slice(0, 10).map(exec => (
                <tr key={exec._id} className="hover:bg-dark-800/50">
                  <td className="px-6 py-4 text-white">{exec.workflowName || exec.workflow?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${exec.status === 'completed' ? 'bg-green-500/20 text-green-400' : exec.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{exec.status}</span>
                  </td>
                  <td className="px-6 py-4 text-dark-400">{new Date(exec.startTime).toLocaleString()}</td>
                  <td className="px-6 py-4 text-dark-400">{exec.duration ? `${(exec.duration/1000).toFixed(1)}s` : '-'}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-dark-400">No executions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Workflows;
