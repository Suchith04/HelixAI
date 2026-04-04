/**
 * WidgetRenderer — resolves a widget ID → renders the correct widget component
 * with the shared dashboard data props.
 */

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { Bot, AlertTriangle, Activity, Server, DollarSign, BarChart3,
         PieChart as PieChartIcon, Cpu, Zap, Shield } from 'lucide-react';
import StatCard from './widgets/StatCard';

// ─── Shared chart helpers ─────────────────────────────────────────────────────

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#8b5cf6', '#06b6d4', '#f97316'];
const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 4px' }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, display: 'inline-block' }} />
          {e.name}: {e.value}
        </p>
      ))}
    </div>
  );
};

const ChartWrapper = ({ title, children, icon: Icon, iconColor, badge, editMode }) => (
  <div style={{
    height: '100%', display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(10,15,30,0.99))',
    borderRadius: 16, padding: 20, boxSizing: 'border-box',
    border: editMode ? '2px dashed rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={16} color={iconColor || '#818cf8'} />}
        <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, margin: 0 }}>{title}</h3>
      </div>
      {badge && (
        <span style={{
          background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 10, fontWeight: 600,
          borderRadius: 999, padding: '2px 8px', border: '1px solid rgba(99,102,241,0.2)',
        }}>{badge}</span>
      )}
    </div>
    <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
    <div style={{ textAlign: 'center' }}>
      {Icon && <Icon size={32} style={{ marginBottom: 8, opacity: 0.4 }} />}
      <p style={{ fontSize: 12, margin: 0 }}>{message}</p>
    </div>
  </div>
);

// ─── Individual widget renderers ──────────────────────────────────────────────

const WIDGET_RENDERERS = {

  kpi_agents: ({ data, editMode }) => {
    const agentActive = data.overview?.agents?.filter(a => a._id === 'active').reduce((s, a) => s + a.count, 0) || 0;
    const totalAgents  = data.overview?.agents?.reduce((s, a) => s + a.count, 0) || 0;
    return <StatCard title="Active Agents" value={`${agentActive}/${totalAgents}`}
      icon={Bot} color="linear-gradient(135deg, #6366f1, #8b5cf6)" subtitle="Running agents" editMode={editMode} />;
  },

  kpi_incidents: ({ data, editMode }) => {
    const count = data.overview?.incidents?.open?.[0]?.count || 0;
    const today = data.overview?.incidents?.today?.[0]?.count || 0;
    return <StatCard title="Open Incidents" value={count}
      icon={AlertTriangle} color="linear-gradient(135deg, #f59e0b, #b45309)" subtitle={`${today} today`} editMode={editMode} />;
  },

  kpi_critical: ({ data, editMode }) => {
    const critical = data.overview?.incidents?.critical?.[0]?.count || 0;
    return <StatCard title="Critical Issues" value={critical}
      icon={Activity} color="linear-gradient(135deg, #ef4444, #b91c1c)" subtitle="Requires attention" editMode={editMode} />;
  },

  kpi_resources: ({ data, editMode }) => {
    const healthy = data.overview?.resources?.filter(r => r._id === 'healthy').reduce((s, a) => s + a.count, 0) || 0;
    const total   = data.overview?.resources?.reduce((s, a) => s + a.count, 0) || 0;
    return <StatCard title="Resources Healthy" value={`${healthy}/${total}`}
      icon={Server} color="linear-gradient(135deg, #10b981, #047857)"
      subtitle={`${total > 0 ? ((healthy / total) * 100).toFixed(0) : 0}% uptime`} editMode={editMode} />;
  },

  kpi_cost: ({ data, editMode }) => {
    const total = (data.costData?.resourceCosts || []).reduce((s, r) => s + (r.totalCost || 0), 0);
    const types = data.costData?.resourceCosts?.length || 0;
    return <StatCard title="Est. Monthly Cost" value={total > 0 ? `$${total.toLocaleString()}` : '—'}
      icon={DollarSign} color="linear-gradient(135deg, #8b5cf6, #6d28d9)" subtitle={`${types} resource types`} editMode={editMode} />;
  },

  chart_incident_trend: ({ data, timeRange, editMode }) => (
    <ChartWrapper title="Incident Trend" icon={Activity} iconColor="#6366f1" badge={`${timeRange}d`} editMode={editMode}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.metrics?.incidentTrend || []}>
          <defs>
            <linearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="_id" stroke="#334155" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis stroke="#334155" tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="count" name="Incidents" stroke="#6366f1" fill="url(#ig)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  ),

  chart_anomaly_trend: ({ data, timeRange, editMode }) => (
    <ChartWrapper title="Anomalies Detected" icon={Activity} iconColor="#f59e0b" badge={`${timeRange}d`} editMode={editMode}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.metrics?.anomalyTrend || []}>
          <defs>
            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="_id" stroke="#334155" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis stroke="#334155" tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="count" name="Anomalies" stroke="#f59e0b" fill="url(#ag)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  ),

  chart_agent_perf: ({ data, editMode }) => (
    <ChartWrapper title="Agent Performance" icon={BarChart3} iconColor="#6366f1" editMode={editMode}>
      {data.agentPerformance?.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.agentPerformance} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" stroke="#334155" tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis type="category" dataKey="name" stroke="#334155" tick={{ fontSize: 10, fill: '#64748b' }} width={130} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="tasksCompleted" name="Tasks Completed" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
            <Bar dataKey="successRate"    name="Success Rate %"  fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      ) : <EmptyState icon={Bot} message="No agent data yet — initialize agents" />}
    </ChartWrapper>
  ),

  chart_severity: ({ data, editMode }) => {
    const sevData = (data.incidentStats?.bySeverity || []).map(s => ({
      name: s._id?.charAt(0).toUpperCase() + s._id?.slice(1),
      value: s.count, color: SEVERITY_COLORS[s._id] || '#64748b',
    }));
    return (
      <ChartWrapper title="Severity Breakdown" icon={PieChartIcon} iconColor="#f59e0b" editMode={editMode}>
        {sevData.length > 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sevData} cx="50%" cy="50%" innerRadius="35%" outerRadius="60%"
                    dataKey="value" paddingAngle={4} stroke="none">
                    {sevData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ paddingTop: 8 }}>
              {sevData.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{s.name}</span>
                  </div>
                  <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 12 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <EmptyState icon={Shield} message="No incident data" />}
      </ChartWrapper>
    );
  },

  chart_cost: ({ data, editMode }) => {
    const costData = (data.costData?.resourceCosts || []).map((r, i) => ({
      name: r._id || 'Other', value: r.totalCost || 0, count: r.count, color: COLORS[i % COLORS.length],
    }));
    return (
      <ChartWrapper title="Cost by Resource" icon={DollarSign} iconColor="#8b5cf6" editMode={editMode}>
        {costData.length > 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={costData} cx="50%" cy="50%" innerRadius="30%" outerRadius="55%"
                    dataKey="value" paddingAngle={3} stroke="none">
                    {costData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ paddingTop: 6 }}>
              {costData.slice(0, 4).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                    <span style={{ color: '#94a3b8', fontSize: 11, textTransform: 'capitalize' }}>{c.name}</span>
                  </div>
                  <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 11 }}>${c.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <EmptyState icon={DollarSign} message="No cost data" />}
      </ChartWrapper>
    );
  },

  panel_system_health: ({ data, editMode }) => {
    const resources = data.overview?.resources || [];
    const healthy   = resources.filter(r => r._id === 'healthy').reduce((s, a) => s + a.count, 0);
    const total     = resources.reduce((s, a) => s + a.count, 0);
    const STATUS_COLORS = {
      healthy: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '#34d399', dot: '#10b981' },
      warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', dot: '#f59e0b' },
      critical: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#f87171', dot: '#ef4444' },
      unknown: { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', text: '#9ca3af', dot: '#6b7280' },
    };
    return (
      <ChartWrapper title="System Health" icon={Cpu} iconColor="#10b981" editMode={editMode}>
        {resources.length > 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resources.map((r, i) => {
              const c = STATUS_COLORS[r._id] || STATUS_COLORS.unknown;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: c.bg, border: `1px solid ${c.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot }} />
                    <span style={{ color: c.text, fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{r._id}</span>
                  </div>
                  <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18 }}>{r.count}</span>
                </div>
              );
            })}
            {total > 0 && (
              <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#64748b', fontSize: 12 }}>Health Score</span>
                  <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 12 }}>{((healthy / total) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${(healthy / total) * 100}%`,
                    background: 'linear-gradient(90deg, #10b981, #34d399)',
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>
            )}
          </div>
        ) : <EmptyState icon={Server} message="No resources monitored" />}
      </ChartWrapper>
    );
  },

  panel_activity: ({ data, editMode }) => (
    <ChartWrapper title="Recent Activity" icon={Zap} iconColor="#f59e0b" editMode={editMode}>
      {data.overview?.recentActivity?.length > 0 ? (
        <div style={{ overflowY: 'auto', height: '100%' }}>
          {data.overview.recentActivity.map((a, i) => {
            const c = a.status === 'completed' ? { bg: 'rgba(16,185,129,0.15)', text: '#34d399' }
                    : a.status === 'failed'    ? { bg: 'rgba(239,68,68,0.15)',   text: '#f87171' }
                    :                            { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' };
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 10, marginBottom: 6,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.2s',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.workflowName}
                  </p>
                  <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0' }}>
                    {new Date(a.startTime).toLocaleString()}
                  </p>
                </div>
                <span style={{
                  padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  background: c.bg, color: c.text, flexShrink: 0, marginLeft: 8,
                }}>
                  {a.status}
                </span>
              </div>
            );
          })}
        </div>
      ) : <EmptyState icon={Activity} message="No recent activity" />}
    </ChartWrapper>
  ),

  chart_category: ({ data, editMode }) => {
    const catData = (data.incidentStats?.byCategory || []).map(c => ({
      name: c._id || 'Uncategorized', count: c.count,
    }));
    return (
      <ChartWrapper title="Incidents by Category" icon={BarChart3} iconColor="#8b5cf6" editMode={editMode}>
        {catData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={catData}>
              <XAxis dataKey="name" stroke="#334155" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis stroke="#334155" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" name="Incidents" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState icon={BarChart3} message="No category data yet" />}
      </ChartWrapper>
    );
  },
};

// ─── Main Export ──────────────────────────────────────────────────────────────

const WidgetRenderer = ({ widgetId, data, timeRange, editMode }) => {
  const Renderer = WIDGET_RENDERERS[widgetId];
  if (!Renderer) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(239,68,68,0.05)', border: '1px dashed rgba(239,68,68,0.3)',
        borderRadius: 16, color: '#f87171', fontSize: 12,
      }}>
        Unknown widget: {widgetId}
      </div>
    );
  }
  return <Renderer data={data} timeRange={timeRange} editMode={editMode} />;
};

export default WidgetRenderer;
