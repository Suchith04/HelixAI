import { useState, useEffect } from 'react';
import { CloudLightning, Search, BarChart3, RefreshCw, Clock, Filter, AlertTriangle, AlertCircle, Info, ChevronDown, Loader2, TrendingUp, Layers } from 'lucide-react';
import { cloudwatchService } from '../services/api';

const levelConfig = {
  fatal:   { color: 'bg-red-600',    text: 'text-red-300',    border: 'border-red-500/40',  bg: 'bg-red-500/10' },
  error:   { color: 'bg-red-500',    text: 'text-red-400',    border: 'border-red-500/30',  bg: 'bg-red-500/10' },
  warn:    { color: 'bg-amber-500',  text: 'text-amber-400',  border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  warning: { color: 'bg-amber-500',  text: 'text-amber-400',  border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  info:    { color: 'bg-blue-500',   text: 'text-blue-400',   border: 'border-blue-500/30',  bg: 'bg-blue-500/10' },
  debug:   { color: 'bg-gray-500',   text: 'text-gray-400',   border: 'border-gray-500/30',  bg: 'bg-gray-500/10' },
};

const LevelBadge = ({ level }) => {
  const cfg = levelConfig[level] || levelConfig.info;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
      {level.toUpperCase()}
    </span>
  );
};

const Logs = () => {
  // ── State ──────────────────────────────────────────────────────────────
  const [logGroups, setLogGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [logs, setLogs] = useState(null);        // full response from /cloudwatch/logs
  const [analysis, setAnalysis] = useState(null); // full response from /cloudwatch/analyze
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Filter controls
  const [hours, setHours] = useState(24);
  const [filterPattern, setFilterPattern] = useState('');
  const [limit, setLimit] = useState(500);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Load log groups ────────────────────────────────────────────────────
  const loadLogGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const res = await cloudwatchService.getLogGroups();
      setLogGroups(res.data.logGroups || []);
      if (res.data.logGroups?.length > 0) setSelectedGroup(res.data.logGroups[0].logGroupName);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load log groups. Check your AWS credentials in Settings.');
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => { loadLogGroups(); }, []);

  // ── Fetch logs ─────────────────────────────────────────────────────────
  const fetchLogs = async () => {
    if (!selectedGroup) return;
    setLoadingLogs(true);
    setError('');
    setAnalysis(null);
    try {
      const res = await cloudwatchService.fetchLogs({
        logGroupName: selectedGroup,
        startTime: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        filterPattern: filterPattern || undefined,
        limit,
      });
      setLogs(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch logs.');
    } finally {
      setLoadingLogs(false);
    }
  };

  // ── Analyze logs ───────────────────────────────────────────────────────
  const analyzeLogs = async () => {
    if (!selectedGroup) return;
    setAnalyzing(true);
    setError('');
    try {
      const res = await cloudwatchService.analyzeLogs({
        logGroupName: selectedGroup,
        startTime: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        filterPattern: filterPattern || undefined,
        limit: limit || 1000,
      });
      setAnalysis(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────
  const grouped = logs?.grouped || analysis?.grouped;
  const meta = logs?.meta || analysis?.meta;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CloudLightning className="w-8 h-8 text-primary-400" />
            CloudWatch Logs
          </h1>
          <p className="text-dark-400 mt-1">Fetch, filter &amp; analyze real AWS CloudWatch logs with AI</p>
        </div>
        <button
          onClick={loadLogGroups}
          disabled={loadingGroups}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg border border-dark-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingGroups ? 'animate-spin' : ''}`} />
          Refresh Groups
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Log Group selector */}
          <div className="lg:col-span-2">
            <label className="block text-dark-400 text-sm mb-1.5">Log Group</label>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm hover:border-primary-500/50 transition-colors"
              >
                <span className="truncate">{selectedGroup || 'Select a log group…'}</span>
                <ChevronDown className="w-4 h-4 text-dark-400 flex-shrink-0 ml-2" />
              </button>
              {showDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                  {logGroups.length === 0 && (
                    <p className="px-4 py-3 text-dark-500 text-sm">No log groups found</p>
                  )}
                  {logGroups.map((lg) => (
                    <button
                      key={lg.logGroupName}
                      onClick={() => { setSelectedGroup(lg.logGroupName); setShowDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-dark-700 transition-colors ${
                        selectedGroup === lg.logGroupName ? 'bg-primary-600/20 text-primary-400' : 'text-white'
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

          {/* Time range */}
          <div>
            <label className="block text-dark-400 text-sm mb-1.5">Time Range</label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-dark-500" />
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="flex-1 px-3 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500/50"
              >
                <option value={1}>Last 1 hour</option>
                <option value={6}>Last 6 hours</option>
                <option value={12}>Last 12 hours</option>
                <option value={24}>Last 24 hours</option>
                <option value={72}>Last 3 days</option>
                <option value={168}>Last 7 days</option>
              </select>
            </div>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-dark-400 text-sm mb-1.5">Max Events</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500/50"
            >
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
            </select>
          </div>
        </div>

        {/* Filter pattern */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder='CloudWatch filter pattern (e.g. "ERROR" or "{ $.statusCode = 500 }")'
              value={filterPattern}
              onChange={(e) => setFilterPattern(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500/50"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchLogs}
              disabled={loadingLogs || !selectedGroup}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {loadingLogs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Fetch Logs
            </button>
            <button
              onClick={analyzeLogs}
              disabled={analyzing || !selectedGroup}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-primary-600 hover:from-violet-700 hover:to-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Analyze with AI
            </button>
          </div>
        </div>
      </div>

      {/* ── Meta summary ────────────────────────────────────────────────── */}
      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
            <p className="text-dark-400 text-sm">Total Raw Logs</p>
            <p className="text-2xl font-bold text-white">{meta.totalRaw}</p>
          </div>
          <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
            <p className="text-dark-400 text-sm">Important (Fed to AI)</p>
            <p className="text-2xl font-bold text-primary-400">{meta.totalImportant}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-dark-400 text-sm">Critical / Errors</p>
            <p className="text-2xl font-bold text-red-400">{grouped?.critical?.count || 0}</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <p className="text-dark-400 text-sm">Warnings</p>
            <p className="text-2xl font-bold text-amber-400">{grouped?.warnings?.count || 0}</p>
          </div>
        </div>
      )}

      {/* ── AI Analysis Results ──────────────────────────────────────────── */}
      {analysis?.analysis && (
        <div className="glass-card p-6 border-l-4 border-primary-500">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-bold text-white">AI Analysis Results</h2>
            <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
              analysis.analysis.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
              analysis.analysis.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
              analysis.analysis.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {analysis.analysis.severity?.toUpperCase()} severity
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-dark-400 text-xs mb-1">Total Analyzed</p>
              <p className="text-white font-bold text-lg">{analysis.analysis.totalLogs}</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-dark-400 text-xs mb-1">Confidence</p>
              <p className="text-white font-bold text-lg">{(analysis.analysis.confidence * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4">
              <p className="text-dark-400 text-xs mb-1">Noise Reduction</p>
              <p className="text-white font-bold text-lg">{analysis.meta?.reductionRatio}</p>
            </div>
          </div>

          {/* Patterns */}
          {analysis.analysis.patterns?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-dark-400 mb-2">Detected Patterns</h3>
              <div className="space-y-2">
                {analysis.analysis.patterns.map((p, i) => (
                  <div key={i} className="bg-dark-800/50 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <span className="text-white text-sm font-medium">{p.description}</span>
                      <span className="text-dark-500 text-xs ml-2">({p.type})</span>
                    </div>
                    {p.count && <span className="text-primary-400 text-sm font-mono">{p.count}×</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LLM Insights */}
          {analysis.analysis.llmInsights && (
            <div>
              <h3 className="text-sm font-medium text-dark-400 mb-2">LLM Insights</h3>
              <div className="bg-dark-800/50 rounded-xl p-4 text-dark-300 text-sm whitespace-pre-wrap font-mono max-h-64 overflow-y-auto custom-scrollbar">
                {typeof analysis.analysis.llmInsights === 'string'
                  ? analysis.analysis.llmInsights
                  : JSON.stringify(analysis.analysis.llmInsights, null, 2)}
              </div>
            </div>
          )}
        </div>
      )}

      {analysis && !analysis.analysis && (
        <div className="glass-card p-6 text-center">
          <Info className="w-10 h-10 text-blue-400 mx-auto mb-2" />
          <p className="text-dark-300">{analysis.message || 'No important logs found in the selected time range.'}</p>
        </div>
      )}

      {/* ── Grouped Error Logs ──────────────────────────────────────────── */}
      {grouped?.critical?.logs?.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">Critical / Error Logs</h2>
            <span className="text-dark-500 text-sm">({grouped.critical.count} total)</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {grouped.critical.logs.map((log, i) => (
              <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-1">
                  <LevelBadge level={log.level} />
                  <span className="text-dark-500 text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="text-dark-600 text-xs truncate">{log.source?.instance}</span>
                </div>
                <p className="text-dark-200 text-sm font-mono break-all">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Warning Groups ──────────────────────────────────────────────── */}
      {grouped?.warnings?.groups?.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Warning Groups</h2>
            <span className="text-dark-500 text-sm">({grouped.warnings.count} total, {grouped.warnings.groups.length} unique patterns)</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {grouped.warnings.groups.map((grp, i) => (
              <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <LevelBadge level="warn" />
                    <span className="text-amber-300 text-sm font-bold">{grp.count}×</span>
                  </div>
                  <span className="text-dark-500 text-xs">
                    {new Date(grp.firstSeen).toLocaleTimeString()} – {new Date(grp.lastSeen).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-dark-300 text-sm font-mono break-all">{grp.sample?.message || grp.signature}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Info samples ────────────────────────────────────────────────── */}
      {grouped?.info?.samples?.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Info Log Samples</h2>
            <span className="text-dark-500 text-sm">({grouped.info.count} total, showing {grouped.info.samples.length} unique patterns)</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {grouped.info.samples.map((grp, i) => (
              <div key={i} className="bg-dark-800/50 border border-dark-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <LevelBadge level="info" />
                    <span className="text-blue-300 text-sm font-bold">{grp.count}×</span>
                  </div>
                </div>
                <p className="text-dark-300 text-sm font-mono break-all">{grp.sample?.message || grp.signature}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!logs && !analysis && !error && !loadingLogs && !analyzing && (
        <div className="glass-card p-12 text-center">
          <CloudLightning className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-300 mb-2">Select a Log Group to Get Started</h3>
          <p className="text-dark-500 text-sm max-w-md mx-auto">
            Choose a CloudWatch log group from the dropdown above, then click <strong>Fetch Logs</strong> to view filtered logs or <strong>Analyze with AI</strong> to get intelligent insights.
          </p>
        </div>
      )}
    </div>
  );
};

export default Logs;
