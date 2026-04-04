import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, color, subtitle, editMode }) => (
  <div style={{
    height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,20,40,0.98))',
    borderRadius: 16,
    border: editMode ? '2px dashed rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
    boxSizing: 'border-box',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ color: '#64748b', fontSize: 13, fontWeight: 500, margin: 0 }}>{title}</p>
        <p style={{ color: '#f1f5f9', fontSize: 30, fontWeight: 800, margin: '6px 0 0' }}>{value}</p>
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 13,
            color: trend > 0 ? '#4ade80' : trend < 0 ? '#f87171' : '#64748b',
          }}>
            {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : null}
            <span>{trend !== 0 ? `${Math.abs(trend)}%` : 'No change'}</span>
          </div>
        )}
        {subtitle && <p style={{ color: '#475569', fontSize: 11, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}>
        {Icon && <Icon size={24} color="white" />}
      </div>
    </div>
  </div>
);

export default StatCard;
