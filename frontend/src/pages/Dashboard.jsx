import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Bot, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { dashboardService, incidentService } from '../services/api';

const StatCard = ({ title, value, icon: Icon, trend, color }) => (
  <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6 hover:border-dark-600 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-dark-400 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className={`p-4 rounded-xl bg-gradient-to-br ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardService.getOverview(), dashboardService.getMetrics()])
      .then(([overviewRes, metricsRes]) => {
        setOverview(overviewRes.data);
        setMetrics(metricsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  const incidentCount = overview?.incidents?.open?.[0]?.count || 0;
  const criticalCount = overview?.incidents?.critical?.[0]?.count || 0;
  const agentActive = overview?.agents?.filter(a => a._id === 'active').reduce((s, a) => s + a.count, 0) || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-400 mt-1">Monitor your infrastructure health at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Agents" value={agentActive} icon={Bot} color="from-primary-500 to-primary-700" />
        <StatCard title="Open Incidents" value={incidentCount} icon={AlertTriangle} color="from-amber-500 to-amber-700" />
        <StatCard title="Critical Issues" value={criticalCount} icon={Activity} color="from-red-500 to-red-700" />
        <StatCard title="Resources Healthy" value={overview?.resources?.filter(r => r._id === 'healthy').reduce((s, a) => s + a.count, 0) || 0} icon={DollarSign} color="from-green-500 to-green-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Incident Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics?.incidentTrend || []}>
              <defs>
                <linearGradient id="incidientGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="_id" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="count" stroke="#0ea5e9" fill="url(#incidientGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Anomalies Detected</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics?.anomalyTrend || []}>
              <defs>
                <linearGradient id="anomalyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="_id" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="url(#anomalyGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {overview?.recentActivity?.length > 0 ? (
            overview.recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{activity.workflowName}</p>
                  <p className="text-dark-400 text-sm">{new Date(activity.startTime).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  activity.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                  activity.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {activity.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-dark-400 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
