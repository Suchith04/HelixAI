import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Bot, DollarSign, TrendingUp, TrendingDown, Shield, Cpu, Zap, BarChart3, PieChart as PieChartIcon, Server } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar } from 'recharts';
import { dashboardService, incidentService } from '../services/api';

const COLORS = ['#0ea5e9', '#f59e0b', '#ef4444', '#22c55e', '#8b5cf6', '#ec4899', '#14b8a6'];
const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };

const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }) => (
  <div className="glass-card p-6 animate-fade-in">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-dark-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-dark-400'}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : trend < 0 ? <TrendingDown className="w-4 h-4" /> : null}
            <span>{trend !== 0 ? `${Math.abs(trend)}%` : 'No change'}</span>
          </div>
        )}
        {subtitle && <p className="text-dark-500 text-xs mt-1">{subtitle}</p>}
      </div>
      <div className={`p-4 rounded-xl bg-gradient-to-br ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
      <p className="text-dark-300 text-xs mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-white font-semibold text-sm">
          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

const HealthBadge = ({ status, count }) => {
  const colors = {
    healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    unknown: 'bg-dark-700 text-dark-400 border-dark-600',
  };
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${colors[status] || colors.unknown}`}>
      <div className="flex items-center gap-3">
        <div className={`status-dot ${status === 'healthy' ? 'active' : status === 'critical' ? 'error' : 'inactive'}`} />
        <span className="font-medium capitalize">{status}</span>
      </div>
      <span className="text-2xl font-bold">{count}</span>
    </div>
  );
};

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [agentPerformance, setAgentPerformance] = useState(null);
  const [costData, setCostData] = useState(null);
  const [incidentStats, setIncidentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7);

  useEffect(() => {
    Promise.all([
      dashboardService.getOverview(),
      dashboardService.getMetrics(timeRange),
      dashboardService.getAgentPerformance().catch(() => ({ data: { performance: [] } })),
      dashboardService.getCostOverview().catch(() => ({ data: { resourceCosts: [], latestAnalysis: null } })),
      incidentService.getStats().catch(() => ({ data: { stats: null } })),
    ])
      .then(([overviewRes, metricsRes, perfRes, costRes, statsRes]) => {
        setOverview(overviewRes.data);
        setMetrics(metricsRes.data);
        setAgentPerformance(perfRes.data.performance || []);
        setCostData(costRes.data);
        setIncidentStats(statsRes.data.stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto" />
          <p className="text-dark-400 mt-4">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const incidentCount = overview?.incidents?.open?.[0]?.count || 0;
  const criticalCount = overview?.incidents?.critical?.[0]?.count || 0;
  const todayCount = overview?.incidents?.today?.[0]?.count || 0;
  const agentActive = overview?.agents?.filter(a => a._id === 'active').reduce((s, a) => s + a.count, 0) || 0;
  const totalAgents = overview?.agents?.reduce((s, a) => s + a.count, 0) || 0;
  const healthyResources = overview?.resources?.filter(r => r._id === 'healthy').reduce((s, a) => s + a.count, 0) || 0;
  const totalResources = overview?.resources?.reduce((s, a) => s + a.count, 0) || 0;

  // Prepare severity data for pie chart
  const severityData = incidentStats?.bySeverity?.map(s => ({
    name: s._id?.charAt(0).toUpperCase() + s._id?.slice(1),
    value: s.count,
    color: SEVERITY_COLORS[s._id] || '#64748b',
  })) || [];

  // Prepare resource health data
  const resourceHealth = overview?.resources || [];

  // Prepare cost data for pie chart
  const costChartData = costData?.resourceCosts?.map((r, i) => ({
    name: r._id || 'Other',
    value: r.totalCost || 0,
    count: r.count,
    color: COLORS[i % COLORS.length],
  })) || [];

  const totalCost = costChartData.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-dark-400 mt-1">Monitor your infrastructure health at a glance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
          >
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Active Agents" value={`${agentActive}/${totalAgents}`} icon={Bot} color="from-primary-500 to-primary-700" subtitle="Running agents" />
        <StatCard title="Open Incidents" value={incidentCount} icon={AlertTriangle} color="from-amber-500 to-amber-700" subtitle={`${todayCount} today`} />
        <StatCard title="Critical Issues" value={criticalCount} icon={Activity} color="from-red-500 to-red-700" subtitle="Requires attention" />
        <StatCard title="Resources Healthy" value={`${healthyResources}/${totalResources}`} icon={Server} color="from-green-500 to-green-700" subtitle={`${totalResources > 0 ? ((healthyResources / totalResources) * 100).toFixed(0) : 0}% uptime`} />
        <StatCard title="Est. Monthly Cost" value={totalCost > 0 ? `$${totalCost.toLocaleString()}` : '—'} icon={DollarSign} color="from-purple-500 to-purple-700" subtitle={`${costChartData.length} resource types`} />
      </div>

      {/* Charts Row 1: Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Incident Trend</h2>
            <span className="text-xs text-dark-400 bg-dark-800 px-3 py-1 rounded-full">{timeRange}d window</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={metrics?.incidentTrend || []}>
              <defs>
                <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="_id" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Incidents" stroke="#0ea5e9" fill="url(#incidentGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Anomalies Detected</h2>
            <span className="text-xs text-dark-400 bg-dark-800 px-3 py-1 rounded-full">{timeRange}d window</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={metrics?.anomalyTrend || []}>
              <defs>
                <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="_id" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Anomalies" stroke="#f59e0b" fill="url(#anomalyGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Agent Performance + Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Performance */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Agent Performance</h2>
          </div>
          {agentPerformance && agentPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentPerformance} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tasksCompleted" name="Tasks Completed" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16} />
                <Bar dataKey="successRate" name="Success Rate %" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-dark-400">
              <div className="text-center">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No agent performance data yet</p>
                <p className="text-xs mt-1">Initialize agents to start collecting metrics</p>
              </div>
            </div>
          )}
        </div>

        {/* Severity Distribution */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Severity Breakdown</h2>
          </div>
          {severityData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} stroke="none">
                    {severityData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {severityData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-dark-300">{s.name}</span>
                    </div>
                    <span className="text-white font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-dark-400">
              <div className="text-center">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No incident data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: System Health + Cost Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">System Health</h2>
          </div>
          <div className="space-y-3">
            {resourceHealth.length > 0 ? (
              resourceHealth.map((r, i) => (
                <HealthBadge key={i} status={r._id} count={r.count} />
              ))
            ) : (
              <div className="text-center py-8 text-dark-400">
                <Server className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No resources monitored</p>
              </div>
            )}
          </div>
          {totalResources > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-700">
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Health Score</span>
                <span className="text-white font-bold">{((healthyResources / totalResources) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-400 rounded-full h-2 transition-all duration-700"
                  style={{ width: `${(healthyResources / totalResources) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Cost by Resource</h2>
          </div>
          {costChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={costChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3} stroke="none">
                    {costChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {costChartData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-dark-300 capitalize">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold">${c.value.toLocaleString()}</span>
                      <span className="text-dark-500 text-xs ml-1">({c.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-dark-400">
              <div className="text-center">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No cost data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {overview?.recentActivity?.length > 0 ? (
              overview.recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg hover:bg-dark-800 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm truncate">{activity.workflowName}</p>
                    <p className="text-dark-400 text-xs">{new Date(activity.startTime).toLocaleString()}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                    activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    activity.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-dark-400">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown from incident stats */}
      {incidentStats?.byCategory?.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Incidents by Category</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={incidentStats.byCategory.map(c => ({ name: c._id || 'Uncategorized', count: c.count }))}>
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Incidents" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
