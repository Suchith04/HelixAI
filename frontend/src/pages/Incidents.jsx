import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, Zap, Shield, Filter, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { incidentService } from '../services/api';

const severityColors = { critical: 'text-red-400 bg-red-500/20', high: 'text-orange-400 bg-orange-500/20', medium: 'text-amber-400 bg-amber-500/20', low: 'text-green-400 bg-green-500/20' };
const severityChartColors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
const statusIcons = { open: Clock, investigating: AlertTriangle, resolved: CheckCircle, closed: XCircle };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
      <p className="text-dark-300 text-xs mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-white font-semibold text-sm">{entry.name}: {entry.value}</p>
      ))}
    </div>
  );
};

const IncidentDetailPanel = ({ incident }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    incidentService.getIncidentDetails(incident._id)
      .then(res => setDetails(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [incident._id]);

  if (loading) return (
    <div className="p-6 flex justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500" />
    </div>
  );

  return (
    <div className="p-6 bg-dark-800/30 space-y-6 expand-row">
      {/* Description & Root Cause */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-dark-400 mb-2">Description</h4>
          <p className="text-dark-200 text-sm">{incident.description || 'No description available'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-dark-400 mb-2">Root Cause</h4>
          <p className="text-dark-200 text-sm">{incident.rootCause?.description || incident.rootCause?.category || 'Not determined'}</p>
        </div>
      </div>

      {/* Timeline */}
      {incident.timeline?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-dark-400 mb-3">Timeline</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {incident.timeline.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-dark-200">{entry.description}</p>
                  <p className="text-dark-500 text-xs">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary-400" />
            <h4 className="text-sm font-medium text-dark-300">Related Logs</h4>
          </div>
          <p className="text-2xl font-bold text-white">{details?.logs?.length || 0}</p>
          {details?.logs?.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
              {details.logs.slice(0, 5).map((log, i) => (
                <p key={i} className="text-xs text-dark-400 truncate font-mono">{log.message || log.content}</p>
              ))}
            </div>
          )}
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-medium text-dark-300">Anomalies</h4>
          </div>
          <p className="text-2xl font-bold text-white">{details?.anomalies?.length || 0}</p>
          {details?.anomalies?.length > 0 && (
            <div className="mt-2 space-y-1">
              {details.anomalies.slice(0, 3).map((a, i) => (
                <p key={i} className="text-xs text-dark-400 truncate">{a.type}: {a.description || a.metric}</p>
              ))}
            </div>
          )}
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-400" />
            <h4 className="text-sm font-medium text-dark-300">Recoveries</h4>
          </div>
          <p className="text-2xl font-bold text-white">{details?.recoveries?.length || 0}</p>
          {details?.recoveries?.length > 0 && (
            <div className="mt-2 space-y-1">
              {details.recoveries.map((r, i) => (
                <p key={i} className="text-xs text-dark-400 truncate">{r.action}: {r.status}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', severity: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    setLoading(true);
    Promise.all([incidentService.getIncidents({ ...filter, limit: 100 }), incidentService.getStats()])
      .then(([incRes, statsRes]) => { setIncidents(incRes.data.incidents); setStats(statsRes.data.stats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>;

  const totalIncidents = stats?.total?.[0]?.count || 0;
  const severityData = stats?.bySeverity?.map(s => ({ name: s._id, value: s.count, fill: severityChartColors[s._id] || '#64748b' })) || [];
  const categoryData = stats?.byCategory?.map(c => ({ name: c._id || 'Other', count: c.count })) || [];

  // Pagination
  const paginatedIncidents = incidents.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(incidents.length / pageSize);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Incidents</h1>
        <p className="text-dark-400 mt-1">Track and manage detected issues</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: totalIncidents, color: 'bg-dark-800/50 border-dark-700' },
          { label: 'Open', count: stats?.byStatus?.find(x => x._id === 'open')?.count || 0, color: 'bg-amber-500/10 border-amber-500/30' },
          { label: 'Investigating', count: stats?.byStatus?.find(x => x._id === 'investigating')?.count || 0, color: 'bg-blue-500/10 border-blue-500/30' },
          { label: 'Resolved', count: stats?.byStatus?.find(x => x._id === 'resolved')?.count || 0, color: 'bg-green-500/10 border-green-500/30' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} border rounded-xl p-4`}>
            <p className="text-dark-400 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution */}
        {severityData.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Severity Distribution</h2>
            </div>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={4} stroke="none">
                    {severityData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {severityData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.fill }} />
                      <span className="text-dark-300 text-sm capitalize">{s.name}</span>
                    </div>
                    <span className="text-white font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Category Breakdown</h2>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Incidents" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select value={filter.status} onChange={(e) => { setFilter({...filter, status: e.target.value}); setPage(1); }} className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500">
          <option value="">All Statuses</option>
          {['open', 'investigating', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.severity} onChange={(e) => { setFilter({...filter, severity: e.target.value}); setPage(1); }} className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500">
          <option value="">All Severities</option>
          {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-dark-400 text-sm self-center">{incidents.length} incidents</span>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-800/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase w-8"></th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Incident</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Category</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Severity</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Resource</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {paginatedIncidents.length > 0 ? paginatedIncidents.map(incident => {
              const StatusIcon = statusIcons[incident.status] || Clock;
              const isExpanded = expandedId === incident._id;
              return (
                <> 
                  <tr key={incident._id} onClick={() => setExpandedId(isExpanded ? null : incident._id)} className="hover:bg-dark-800/50 transition-colors cursor-pointer">
                    <td className="px-4 py-4">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-dark-400" /> : <ChevronDown className="w-4 h-4 text-dark-400" />}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{incident.title}</p>
                      <p className="text-dark-500 text-xs font-mono">{incident.incidentId}</p>
                    </td>
                    <td className="px-6 py-4 text-dark-300 text-sm">{incident.category || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityColors[incident.severity]}`}>{incident.severity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-dark-300">
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm">{incident.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-dark-400 text-sm">{incident.affectedResource?.name || incident.affectedResource || '—'}</td>
                    <td className="px-6 py-4 text-dark-400 text-sm">{new Date(incident.createdAt).toLocaleDateString()}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${incident._id}-detail`}>
                      <td colSpan={7}>
                        <IncidentDetailPanel incident={incident} />
                      </td>
                    </tr>
                  )}
                </>
              );
            }) : (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-dark-400">No incidents found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-dark-800 text-dark-300 rounded-lg disabled:opacity-30 hover:bg-dark-700 transition-colors text-sm">Prev</button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = page <= 3 ? i + 1 : page + i - 2;
            if (p < 1 || p > totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${page === p ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'}`}>{p}</button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 bg-dark-800 text-dark-300 rounded-lg disabled:opacity-30 hover:bg-dark-700 transition-colors text-sm">Next</button>
        </div>
      )}
    </div>
  );
};

export default Incidents;
