import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { incidentService } from '../services/api';

const severityColors = { critical: 'text-red-400 bg-red-500/20', high: 'text-orange-400 bg-orange-500/20', medium: 'text-amber-400 bg-amber-500/20', low: 'text-green-400 bg-green-500/20' };
const statusIcons = { open: Clock, investigating: AlertTriangle, resolved: CheckCircle, closed: XCircle };

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', severity: '' });

  useEffect(() => {
    Promise.all([incidentService.getIncidents(filter), incidentService.getStats()])
      .then(([incRes, statsRes]) => { setIncidents(incRes.data.incidents); setStats(statsRes.data.stats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Incidents</h1>
        <p className="text-dark-400 mt-1">Track and manage detected issues</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ label: 'Total', count: stats?.total?.[0]?.count || 0, color: 'bg-dark-700' },
          ...['open', 'investigating', 'resolved'].map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), count: stats?.byStatus?.find(x => x._id === s)?.count || 0, color: s === 'open' ? 'bg-amber-500/20' : s === 'resolved' ? 'bg-green-500/20' : 'bg-blue-500/20' }))
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
            <p className="text-dark-400 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <select value={filter.status} onChange={(e) => setFilter({...filter, status: e.target.value})} className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white">
          <option value="">All Statuses</option>
          {['open', 'investigating', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.severity} onChange={(e) => setFilter({...filter, severity: e.target.value})} className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white">
          <option value="">All Severities</option>
          {['critical', 'high', 'medium', 'low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-dark-900/50 backdrop-blur-xl border border-dark-700 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-800/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Incident</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Severity</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-dark-400 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {incidents.length > 0 ? incidents.map(incident => {
              const StatusIcon = statusIcons[incident.status] || Clock;
              return (
                <tr key={incident._id} className="hover:bg-dark-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{incident.title}</p>
                    <p className="text-dark-400 text-sm">{incident.incidentId}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityColors[incident.severity]}`}>{incident.severity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-dark-300">
                      <StatusIcon className="w-4 h-4" />
                      <span>{incident.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-dark-400">{new Date(incident.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            }) : (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-dark-400">No incidents found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Incidents;
