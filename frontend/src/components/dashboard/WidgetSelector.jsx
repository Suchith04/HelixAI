import { X, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { useState } from 'react';
import { WIDGET_REGISTRY, CATEGORIES } from './widgetRegistry';

const WidgetSelector = ({ enabled, onToggle, onClose }) => {
  const [search, setSearch] = useState('');

  const filtered = WIDGET_REGISTRY.filter(w =>
    w.label.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = Object.entries(CATEGORIES).map(([cat, label]) => ({
    cat, label,
    widgets: filtered.filter(w => w.category === cat),
  })).filter(g => g.widgets.length > 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 380, height: '100%',
          background: 'linear-gradient(180deg, rgba(15,20,40,0.99) 0%, rgba(10,14,28,0.99) 100%)',
          borderLeft: '1px solid rgba(99,102,241,0.3)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.34,1.1,0.64,1)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(90deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
        }}>
          <div>
            <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, margin: 0 }}>Widget Library</p>
            <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0' }}>
              {enabled.length} of {WIDGET_REGISTRY.length} widgets active
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 12px',
          }}>
            <Search size={14} color="#64748b" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search widgets…"
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#f1f5f9', fontSize: 13, flex: 1,
              }}
            />
          </div>
        </div>

        {/* Widget groups */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px' }}>
          {grouped.map(({ cat, label, widgets }) => (
            <div key={cat} style={{ marginTop: 20 }}>
              <p style={{
                color: '#475569', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
              }}>{label}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {widgets.map(w => {
                  const isOn = enabled.includes(w.id);
                  return (
                    <div
                      key={w.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                        background: isOn ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isOn ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all 0.2s',
                      }}
                      onClick={() => onToggle(w.id)}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{w.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, margin: 0 }}>{w.label}</p>
                        <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.description}
                        </p>
                      </div>
                      <div style={{ color: isOn ? '#818cf8' : '#334155', flexShrink: 0 }}>
                        {isOn ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(99,102,241,0.05)',
        }}>
          <p style={{ color: '#475569', fontSize: 11, margin: 0, textAlign: 'center' }}>
            Toggle widgets on/off · Drag to rearrange · Resize by dragging corners
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
};

export default WidgetSelector;
