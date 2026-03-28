import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Clock, CheckCircle2, XCircle, AlertTriangle, Server,
  Zap, Database, Activity, RefreshCw, ChevronDown, ChevronRight,
  Terminal, Eye, ThumbsUp, ThumbsDown, CloudLightning, Cpu,
  HardDrive, Globe, Search, Filter, ArrowRight, Loader2, Bell
} from 'lucide-react';
import { recoveryService } from '../services/api';
import { onRecoveryPending, onRecoveryExecuted } from '../services/socket';

/* ─── Design Tokens ─────────────────────────────────────────────────── */
const riskStyles = {
  Low:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400', label: 'Low Risk' },
  High: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-400', label: 'High Risk' },
};

const statusStyles = {
  pending:    { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: Clock, label: 'Pending Approval' },
  approved:   { bg: 'bg-blue-500/15', text: 'text-blue-400', icon: CheckCircle2, label: 'Approved' },
  executing:  { bg: 'bg-cyan-500/15', text: 'text-cyan-400', icon: Loader2, label: 'Executing...' },
  completed:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: CheckCircle2, label: 'Completed' },
  failed:     { bg: 'bg-red-500/15', text: 'text-red-400', icon: XCircle, label: 'Failed' },
  rejected:   { bg: 'bg-slate-500/15', text: 'text-slate-400', icon: XCircle, label: 'Rejected' },
};

const serviceIcons = { ec2: Server, lambda: Zap, rds: Database, cloudwatch: Activity };

const stateColors = {
  running:   'text-emerald-400',
  stopped:   'text-red-400',
  pending:   'text-amber-400',
  available: 'text-emerald-400',
  Active:    'text-emerald-400',
  ALARM:     'text-red-400',
  OK:        'text-emerald-400',
};

/* ─── Tab Button ────────────────────────────────────────────────────── */
const TabBtn = ({ active, icon: Icon, label, count, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
      active
        ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-lg shadow-primary-500/5'
        : 'text-dark-400 hover:bg-dark-800 hover:text-white border border-transparent'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
    {count > 0 && (
      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${active ? 'bg-primary-500/30 text-primary-300' : 'bg-dark-700 text-dark-300'}`}>
        {count}
      </span>
    )}
  </button>
);

/* ─── Execution Log Terminal ────────────────────────────────────────── */
const LogTerminal = ({ logs = [] }) => (
  <div className="bg-dark-950 rounded-lg border border-dark-700 p-3 mt-3 max-h-48 overflow-y-auto custom-scrollbar font-mono text-xs">
    {logs.map((log, i) => {
      const color = log.level === 'error' ? 'text-red-400' : log.level === 'success' ? 'text-emerald-400' : log.level === 'warn' ? 'text-amber-400' : 'text-dark-300';
      return (
        <div key={i} className={`flex gap-2 py-0.5 ${color}`}>
          <span className="text-dark-600 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
          <span className="uppercase w-12 flex-shrink-0 font-bold">{log.level}</span>
          <span>{log.message}</span>
        </div>
      );
    })}
    {logs.length === 0 && <div className="text-dark-600 italic">No logs yet</div>}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   PENDING ACTIONS TAB
   ═══════════════════════════════════════════════════════════════════════ */
const PendingActionsTab = ({ actions, onApprove, onReject, loading }) => {
  const [expandedId, setExpandedId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  if (loading) return <LoadingState label="Loading pending actions..." />;
  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-dark-400">
        <Shield className="w-16 h-16 mb-4 text-dark-600" />
        <p className="text-lg font-medium mb-1">No Pending Actions</p>
        <p className="text-sm">All recovery actions have been processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actions.map((action) => {
        const risk = riskStyles[action.riskLevel] || riskStyles.High;
        const expanded = expandedId === action.actionId;
        return (
          <div key={action.actionId} className={`glass-card p-5 border ${risk.border} animate-slide-in`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${risk.bg} flex items-center justify-center`}>
                  <AlertTriangle className={`w-5 h-5 ${risk.text}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">{action.recommendedAction?.type?.replace(/_/g, ' ')?.toUpperCase()}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${risk.bg} ${risk.text}`}>{risk.label}</span>
                  </div>
                  <p className="text-dark-400 text-sm mt-0.5">
                    {action.recommendedAction?.target?.resourceType?.toUpperCase()} — {action.recommendedAction?.target?.resourceId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-dark-500 text-xs">{new Date(action.createdAt).toLocaleString()}</span>
                <span className="text-dark-600 text-xs">by {action.agentName}</span>
              </div>
            </div>

            {/* AI Reasoning */}
            <div className="bg-dark-800/60 rounded-lg p-4 mb-4 border border-dark-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary-400" />
                <span className="text-primary-400 text-sm font-semibold">AI Reasoning</span>
              </div>
              <p className="text-dark-300 text-sm leading-relaxed">{action.reasoning}</p>
            </div>

            {/* Dry Run Result */}
            {action.dryRunResult && (
              <div className={`rounded-lg p-3 mb-4 border ${action.dryRunResult.success ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-dark-400" />
                  <span className="text-dark-300 text-xs font-medium">Dry Run: </span>
                  <span className={`text-xs font-bold ${action.dryRunResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {action.dryRunResult.success ? 'PASSED' : 'FAILED'}
                  </span>
                  {action.dryRunResult.message && <span className="text-dark-500 text-xs ml-2">— {action.dryRunResult.message}</span>}
                </div>
              </div>
            )}

            {/* Expand / Collapse logs */}
            <button onClick={() => setExpandedId(expanded ? null : action.actionId)} className="flex items-center gap-1 text-dark-500 text-xs hover:text-white transition mb-3">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Execution Logs ({action.executionLogs?.length || 0})
            </button>
            {expanded && <LogTerminal logs={action.executionLogs} />}

            {/* Action Buttons */}
            {action.status === 'pending' && (
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700/50">
                {confirmAction === action.actionId ? (
                  <>
                    <span className="text-amber-400 text-sm font-medium">Are you sure?</span>
                    <button onClick={() => { onApprove(action.actionId); setConfirmAction(null); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition">
                      <ThumbsUp className="w-4 h-4" /> Yes, Execute
                    </button>
                    <button onClick={() => setConfirmAction(null)} className="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg text-sm transition">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setConfirmAction(action.actionId)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold transition-all">
                      <ThumbsUp className="w-4 h-4" /> Approve & Execute
                    </button>
                    <button onClick={() => onReject(action.actionId)} className="flex items-center gap-2 px-5 py-2.5 bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-red-400 border border-dark-700 rounded-xl text-sm font-medium transition-all">
                      <ThumbsDown className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   AWS RESOURCES TAB
   ═══════════════════════════════════════════════════════════════════════ */
const AwsResourcesTab = ({ resources, loading, onRefresh }) => {
  if (loading) return <LoadingState label="Fetching AWS resources..." />;
  if (!resources) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-dark-400">
        <CloudLightning className="w-16 h-16 mb-4 text-dark-600" />
        <p className="text-lg font-medium mb-1">AWS Not Connected</p>
        <p className="text-sm">Configure AWS credentials in Settings to view resources</p>
      </div>
    );
  }

  const { ec2, lambda, rds, alarms } = resources;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard icon={Server} label="EC2 Instances" value={ec2?.total || 0} detail={`${ec2?.running || 0} running`} color="cyan" />
        <SummaryCard icon={Zap} label="Lambda Functions" value={lambda?.total || 0} detail={`Active`} color="violet" />
        <SummaryCard icon={Database} label="RDS Databases" value={rds?.total || 0} detail={`${rds?.available || 0} available`} color="amber" />
        <SummaryCard icon={Activity} label="Alarms" value={alarms?.total || 0} detail={`${alarms?.inAlarm || 0} in alarm`} color={alarms?.inAlarm > 0 ? 'red' : 'emerald'} />
      </div>

      {/* EC2 Instances Table */}
      {ec2?.instances?.length > 0 && (
        <ResourceSection title="EC2 Instances" icon={Server} count={ec2.total}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-dark-400 text-left border-b border-dark-700">
                <th className="pb-2 font-medium">Instance</th><th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">State</th><th className="pb-2 font-medium">Public IP</th>
                <th className="pb-2 font-medium">AZ</th><th className="pb-2 font-medium">Launched</th>
              </tr></thead>
              <tbody>
                {ec2.instances.map((inst) => (
                  <tr key={inst.instanceId} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition">
                    <td className="py-3"><div className="text-white font-medium">{inst.name}</div><div className="text-dark-500 text-xs">{inst.instanceId}</div></td>
                    <td className="py-3 text-dark-300">{inst.instanceType}</td>
                    <td className="py-3"><span className={`font-semibold ${stateColors[inst.state] || 'text-dark-400'}`}>{inst.state}</span></td>
                    <td className="py-3 text-dark-300 font-mono text-xs">{inst.publicIp || '—'}</td>
                    <td className="py-3 text-dark-400 text-xs">{inst.availabilityZone}</td>
                    <td className="py-3 text-dark-400 text-xs">{inst.launchTime ? new Date(inst.launchTime).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ResourceSection>
      )}

      {/* Lambda Functions */}
      {lambda?.functions?.length > 0 && (
        <ResourceSection title="Lambda Functions" icon={Zap} count={lambda.total}>
          <div className="grid grid-cols-2 gap-3">
            {lambda.functions.map((fn) => (
              <div key={fn.functionName} className="bg-dark-800/40 rounded-lg p-3 border border-dark-700/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium truncate">{fn.functionName}</span>
                  <span className={`text-xs font-semibold ${stateColors[fn.state] || 'text-dark-400'}`}>{fn.state}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-dark-400">
                  <span>{fn.runtime}</span>
                  <span>{fn.memorySize}MB</span>
                  <span>{fn.timeout}s timeout</span>
                </div>
              </div>
            ))}
          </div>
        </ResourceSection>
      )}

      {/* RDS Instances */}
      {rds?.instances?.length > 0 && (
        <ResourceSection title="RDS Databases" icon={Database} count={rds.total}>
          <div className="space-y-3">
            {rds.instances.map((db) => (
              <div key={db.dbInstanceId} className="bg-dark-800/40 rounded-lg p-4 border border-dark-700/30 flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{db.dbInstanceId}</div>
                  <div className="text-dark-400 text-xs mt-1 flex items-center gap-3">
                    <span>{db.engine} {db.engineVersion}</span>
                    <span>{db.instanceClass}</span>
                    {db.multiAZ && <span className="text-emerald-400">Multi-AZ</span>}
                    <span>{db.allocatedStorage}GB</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-semibold text-sm ${stateColors[db.status] || 'text-dark-400'}`}>{db.status}</span>
                  {db.endpoint && <div className="text-dark-500 text-xs mt-1 font-mono">{db.endpoint}</div>}
                </div>
              </div>
            ))}
          </div>
        </ResourceSection>
      )}

      {/* Active Alarms */}
      {alarms?.list?.filter(a => a.state === 'ALARM').length > 0 && (
        <ResourceSection title="Active Alarms" icon={Bell} count={alarms.inAlarm} alert>
          <div className="space-y-2">
            {alarms.list.filter(a => a.state === 'ALARM').map((alarm, i) => (
              <div key={i} className="bg-red-500/5 rounded-lg p-3 border border-red-500/20 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-red-400 font-medium text-sm">{alarm.alarmName}</div>
                  <div className="text-dark-400 text-xs mt-0.5 truncate">{alarm.stateReason}</div>
                </div>
                <span className="text-dark-500 text-xs flex-shrink-0">{alarm.metricName}</span>
              </div>
            ))}
          </div>
        </ResourceSection>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   AUDIT TRAIL TAB
   ═══════════════════════════════════════════════════════════════════════ */
const AuditTrailTab = ({ actions, loading }) => {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  if (loading) return <LoadingState label="Loading audit trail..." />;

  const filtered = filter === 'all' ? actions : actions.filter(a => a.status === filter);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        {['all', 'completed', 'failed', 'rejected', 'pending'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' : 'text-dark-400 hover:text-white bg-dark-800'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-dark-500">No actions found for this filter</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((action) => {
            const st = statusStyles[action.status] || statusStyles.pending;
            const StIcon = st.icon;
            const expanded = expandedId === action.actionId;
            return (
              <div key={action.actionId} className="glass-card p-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : action.actionId)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${st.bg} flex items-center justify-center`}>
                      <StIcon className={`w-4 h-4 ${st.text} ${action.status === 'executing' ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{action.recommendedAction?.type?.replace(/_/g, ' ')}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${riskStyles[action.riskLevel]?.bg} ${riskStyles[action.riskLevel]?.text}`}>{action.riskLevel}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                      <div className="text-dark-500 text-xs mt-0.5">
                        {action.recommendedAction?.target?.resourceId} • {action.agentName} • {new Date(action.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.approvedBy && <span className="text-dark-500 text-xs">by {action.approvedBy.firstName || 'User'}</span>}
                    {expanded ? <ChevronDown className="w-4 h-4 text-dark-500" /> : <ChevronRight className="w-4 h-4 text-dark-500" />}
                  </div>
                </div>
                {expanded && (
                  <div className="mt-4 pt-4 border-t border-dark-700/50 animate-slide-in">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div><span className="text-dark-500 text-xs block mb-1">Reasoning</span><p className="text-dark-300 text-sm">{action.reasoning}</p></div>
                      <div><span className="text-dark-500 text-xs block mb-1">Analysis</span><p className="text-dark-300 text-sm">{typeof action.analysis === 'string' ? action.analysis : JSON.stringify(action.analysis)?.substring(0, 200)}</p></div>
                    </div>
                    {action.executionLogs?.length > 0 && <LogTerminal logs={action.executionLogs} />}
                    {action.executionResult && (
                      <div className="mt-3 bg-dark-800/60 rounded-lg p-3 border border-dark-700/50">
                        <span className="text-dark-500 text-xs block mb-1">Execution Result</span>
                        <pre className="text-dark-300 text-xs font-mono overflow-x-auto">{JSON.stringify(action.executionResult, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Reusable Components ─────────────────────────────────────────── */
const SummaryCard = ({ icon: Icon, label, value, detail, color }) => (
  <div className="glass-card p-4">
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-9 h-9 rounded-lg bg-${color}-500/15 flex items-center justify-center`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
      <span className="text-dark-400 text-sm">{label}</span>
    </div>
    <div className="text-white text-2xl font-bold">{value}</div>
    <div className="text-dark-500 text-xs mt-1">{detail}</div>
  </div>
);

const ResourceSection = ({ title, icon: Icon, count, children, alert }) => (
  <div className={`glass-card p-5 ${alert ? 'border-red-500/30' : ''}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${alert ? 'text-red-400' : 'text-primary-400'}`} />
        <h3 className="text-white font-semibold">{title}</h3>
        <span className="text-dark-500 text-xs">({count})</span>
      </div>
    </div>
    {children}
  </div>
);

const LoadingState = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <Loader2 className="w-10 h-10 text-primary-400 animate-spin mb-4" />
    <p className="text-dark-400">{label}</p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   MAIN ACTION CENTER PAGE
   ═══════════════════════════════════════════════════════════════════════ */
const ActionCenter = () => {
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [audit, setAudit] = useState([]);
  const [resources, setResources] = useState(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const { data } = await recoveryService.getPending();
      setPending(data.data || []);
    } catch (err) { console.error('Failed to fetch pending', err); }
    setLoadingPending(false);
  }, []);

  const fetchAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const { data } = await recoveryService.getAuditTrail({ limit: 50 });
      setAudit(data.data || []);
    } catch (err) { console.error('Failed to fetch audit', err); }
    setLoadingAudit(false);
  }, []);

  const fetchResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const { data } = await recoveryService.getAwsResources();
      setResources(data.data || null);
    } catch (err) { console.error('Failed to fetch resources', err); setResources(null); }
    setLoadingResources(false);
  }, []);

  useEffect(() => {
    fetchPending();
    fetchAudit();
    fetchResources();
  }, [fetchPending, fetchAudit, fetchResources]);

  // Real-time WebSocket updates
  useEffect(() => {
    onRecoveryPending((data) => {
      setPending((prev) => [data, ...prev.filter(a => a.actionId !== data.actionId)]);
    });
    onRecoveryExecuted((data) => {
      setPending((prev) => prev.filter(a => a.actionId !== data.actionId));
      fetchAudit();
    });
  }, [fetchAudit]);

  const handleApprove = async (actionId) => {
    try {
      await recoveryService.approveAction(actionId);
      fetchPending();
      fetchAudit();
    } catch (err) { console.error('Approve failed', err); }
  };

  const handleReject = async (actionId) => {
    const reason = prompt('Rejection reason (optional):') || '';
    try {
      await recoveryService.rejectAction(actionId, reason);
      fetchPending();
      fetchAudit();
    } catch (err) { console.error('Reject failed', err); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-violet-600 rounded-xl shadow-lg shadow-primary-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            Action Center
          </h1>
          <p className="text-dark-400 mt-1 ml-14">Recovery actions, AWS infrastructure, and audit trail</p>
        </div>
        <button onClick={() => { fetchPending(); fetchAudit(); fetchResources(); }}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white rounded-xl border border-dark-700 transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl text-white font-bold">{pending.length}</div>
            <div className="text-dark-400 text-xs">Pending</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl text-white font-bold">{audit.filter(a => a.status === 'completed').length}</div>
            <div className="text-dark-400 text-xs">Completed</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-2xl text-white font-bold">{audit.filter(a => a.status === 'failed').length}</div>
            <div className="text-dark-400 text-xs">Failed</div>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <Server className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl text-white font-bold">{resources ? (resources.ec2?.total || 0) + (resources.lambda?.total || 0) + (resources.rds?.total || 0) : '—'}</div>
            <div className="text-dark-400 text-xs">AWS Resources</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabBtn active={tab === 'pending'} icon={AlertTriangle} label="Pending Actions" count={pending.length} onClick={() => setTab('pending')} />
        <TabBtn active={tab === 'resources'} icon={CloudLightning} label="AWS Resources" count={0} onClick={() => setTab('resources')} />
        <TabBtn active={tab === 'audit'} icon={Activity} label="Audit Trail" count={audit.length} onClick={() => setTab('audit')} />
      </div>

      {/* Tab Content */}
      {tab === 'pending' && <PendingActionsTab actions={pending} onApprove={handleApprove} onReject={handleReject} loading={loadingPending} />}
      {tab === 'resources' && <AwsResourcesTab resources={resources} loading={loadingResources} onRefresh={fetchResources} />}
      {tab === 'audit' && <AuditTrailTab actions={audit} loading={loadingAudit} />}
    </div>
  );
};

export default ActionCenter;
