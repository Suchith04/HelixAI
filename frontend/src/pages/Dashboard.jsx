import { useState, useEffect, useCallback, useRef } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  Settings2, Lock, RotateCcw, Layers, Grid3X3, Save, CheckCircle2,
  RefreshCw, ChevronDown,
} from 'lucide-react';

import { dashboardService, incidentService } from '../services/api';
import { useDashboardLayout } from '../components/dashboard/hooks/useDashboardLayout';
import { WIDGET_REGISTRY, DEFAULT_LAYOUT, getWidgetMeta } from '../components/dashboard/widgetRegistry';
import WidgetRenderer from '../components/dashboard/WidgetRenderer';
import WidgetSelector from '../components/dashboard/WidgetSelector';

// ─── Hook: track container width for GridLayout ───────────────────────────────

function useContainerWidth(ref) {
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(ref.current);
    setWidth(ref.current.offsetWidth);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

// ─── Edit Mode Toolbar ────────────────────────────────────────────────────────

const EditToolbar = ({ onSave, onReset, onToggleSelector, onExit, hasUnsaved }) => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 20px',
    background: 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: 16, marginBottom: 20,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 4px 24px rgba(99,102,241,0.15)',
    animation: 'slideDown 0.3s cubic-bezier(0.34,1.2,0.64,1)',
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 16px rgba(99,102,241,0.5)',
    }}>
      <Grid3X3 size={16} color="white" />
    </div>

    <div>
      <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, margin: 0 }}>Edit Mode Active</p>
      <p style={{ color: '#818cf8', fontSize: 11, margin: 0 }}>Drag to move · Resize at corners · Toggle widgets on right →</p>
    </div>

    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
      {hasUnsaved && (
        <span style={{
          background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
          fontSize: 11, fontWeight: 600, padding: '3px 10px',
          borderRadius: 99, border: '1px solid rgba(245,158,11,0.3)',
        }}>Unsaved changes</span>
      )}

      <button onClick={onToggleSelector} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.4)',
        background: 'rgba(99,102,241,0.15)', color: '#818cf8', cursor: 'pointer',
        fontSize: 12, fontWeight: 600,
      }}>
        <Layers size={13} /> Widgets
      </button>

      <button onClick={onReset} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)',
        background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer',
        fontSize: 12, fontWeight: 600,
      }}>
        <RotateCcw size={13} /> Reset
      </button>

      <button onClick={onSave} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)',
        background: 'rgba(16,185,129,0.1)', color: '#34d399', cursor: 'pointer',
        fontSize: 12, fontWeight: 600,
      }}>
        <Save size={13} /> Save
      </button>

      <button onClick={onExit} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer',
        fontSize: 12, fontWeight: 600,
      }}>
        <Lock size={13} /> Done
      </button>
    </div>
  </div>
);

// ─── Save Toast ───────────────────────────────────────────────────────────────

const SaveToast = ({ show }) => (
  <div style={{
    position: 'fixed', bottom: 28, right: 28, zIndex: 3000,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 20px', borderRadius: 14,
    background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
    backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    transition: 'all 0.4s cubic-bezier(0.34,1.2,0.64,1)',
    transform: show ? 'translateY(0)' : 'translateY(100px)',
    opacity: show ? 1 : 0,
    pointerEvents: 'none',
  }}>
    <CheckCircle2 size={18} color="#34d399" />
    <span style={{ color: '#34d399', fontWeight: 600, fontSize: 13 }}>Layout saved!</span>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  // Data
  const [overview, setOverview]           = useState(null);
  const [metrics, setMetrics]             = useState(null);
  const [agentPerformance, setAgentPerf]  = useState(null);
  const [costData, setCostData]           = useState(null);
  const [incidentStats, setIncidentStats] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [timeRange, setTimeRange]         = useState(7);

  // Grid state
  const { layout, enabled, saveLayout, resetToDefault, toggleWidget } = useDashboardLayout();
  const [editMode, setEditMode]           = useState(false);
  const [showSelector, setShowSelector]   = useState(false);
  const [stagingLayout, setStagingLayout] = useState(null);
  const [hasUnsaved, setHasUnsaved]       = useState(false);
  const [showToast, setShowToast]         = useState(false);

  // Container ref for width tracking (replaces WidthProvider)
  const containerRef = useRef(null);
  const containerWidth = useContainerWidth(containerRef);

  // Load dashboard data
  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      dashboardService.getOverview(),
      dashboardService.getMetrics(timeRange),
      dashboardService.getAgentPerformance().catch(() => ({ data: { performance: [] } })),
      dashboardService.getCostOverview().catch(() => ({ data: { resourceCosts: [], latestAnalysis: null } })),
      incidentService.getStats().catch(() => ({ data: { stats: null } })),
    ]).then(([ovRes, mRes, pRes, cRes, sRes]) => {
      setOverview(ovRes.data);
      setMetrics(mRes.data);
      setAgentPerf(pRes.data.performance || []);
      setCostData(cRes.data);
      setIncidentStats(sRes.data.stats);
    }).catch(console.error).finally(() => setLoading(false));
  }, [timeRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const dashData = { overview, metrics, agentPerformance, costData, incidentStats };

  const activeLayout = (stagingLayout || layout).filter(l => enabled.includes(l.i));

  const handleLayoutChange = useCallback((newLayout) => {
    if (editMode) {
      setStagingLayout(newLayout);
      setHasUnsaved(true);
    }
  }, [editMode]);

  const handleSave = useCallback(() => {
    if (stagingLayout) {
      saveLayout(stagingLayout);
      setStagingLayout(null);
    }
    setHasUnsaved(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  }, [stagingLayout, saveLayout]);

  const handleReset = useCallback(() => {
    resetToDefault();
    setStagingLayout(null);
    setHasUnsaved(false);
  }, [resetToDefault]);

  const handleToggleWidget = useCallback((id) => {
    toggleWidget(id);
    setHasUnsaved(true);
  }, [toggleWidget]);

  const handleExitEdit = useCallback(() => {
    if (stagingLayout) {
      saveLayout(stagingLayout);
      setStagingLayout(null);
    }
    setHasUnsaved(false);
    setEditMode(false);
    setShowSelector(false);
  }, [stagingLayout, saveLayout]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid rgba(99,102,241,0.2)',
          borderTop: '3px solid #6366f1',
          animation: 'spin 1s linear infinite',
          margin: '0 auto',
        }} />
        <p style={{ color: '#64748b', marginTop: 16, fontSize: 14 }}>Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        .react-grid-item.react-grid-placeholder {
          background: rgba(99,102,241,0.15) !important;
          border: 2px dashed rgba(99,102,241,0.5) !important;
          border-radius: 16px !important;
          opacity: 1 !important;
        }
        .react-resizable-handle {
          background: none !important;
        }
        .react-resizable-handle::after {
          border-color: rgba(99,102,241,0.6) !important;
          width: 8px !important; height: 8px !important;
          border-width: 0 2px 2px 0 !important;
        }
        .react-grid-item.react-draggable-dragging {
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(99,102,241,0.6) !important;
          border-radius: 16px !important;
          z-index: 999 !important;
        }
        .helix-widget { transition: box-shadow 0.2s, transform 0.1s; }
        .helix-widget:hover {
          box-shadow: 0 0 0 1px rgba(99,102,241,0.2);
          border-radius: 16px;
        }
        .helix-widget-edit:hover {
          box-shadow: 0 0 0 2px rgba(99,102,241,0.5), 0 8px 24px rgba(0,0,0,0.3);
          border-radius: 16px;
          cursor: grab;
        }
        .helix-widget-edit:active { cursor: grabbing; }
      `}</style>

      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{
              fontSize: 32, fontWeight: 800, margin: 0,
              background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Dashboard</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              Monitor your infrastructure health at a glance
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Time range */}
            <div style={{ position: 'relative' }}>
              <select
                value={timeRange}
                onChange={e => setTimeRange(Number(e.target.value))}
                style={{
                  padding: '8px 32px 8px 14px', borderRadius: 10,
                  background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9', fontSize: 13, outline: 'none', cursor: 'pointer',
                  appearance: 'none', WebkitAppearance: 'none',
                }}
              >
                <option value={1}>Last 24h</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
              <ChevronDown size={13} color="#64748b" style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
            </div>

            {/* Refresh */}
            <button onClick={loadData} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
              cursor: 'pointer', fontSize: 13,
            }}>
              <RefreshCw size={13} /> Refresh
            </button>

            {/* Edit toggle */}
            <button
              onClick={() => editMode ? handleExitEdit() : setEditMode(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: editMode
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(99,102,241,0.1)',
                color: editMode ? 'white' : '#818cf8',
                border: editMode ? 'none' : '1px solid rgba(99,102,241,0.3)',
                boxShadow: editMode ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Settings2 size={14} />
              {editMode ? 'Exit Edit' : 'Customize'}
            </button>
          </div>
        </div>

        {/* Edit Mode Toolbar */}
        {editMode && (
          <EditToolbar
            onSave={handleSave}
            onReset={handleReset}
            onToggleSelector={() => setShowSelector(s => !s)}
            onExit={handleExitEdit}
            hasUnsaved={hasUnsaved}
          />
        )}

        {/* Grid — uses plain GridLayout + ResizeObserver width instead of WidthProvider */}
        <div ref={containerRef} style={{ width: '100%' }}>
          <GridLayout
            className="layout"
            layout={activeLayout}
            cols={12}
            rowHeight={80}
            width={containerWidth}
            margin={[14, 14]}
            containerPadding={[0, 0]}
            isDraggable={editMode}
            isResizable={editMode}
            useCSSTransforms={true}
            compactType="vertical"
            preventCollision={false}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".widget-drag-handle"
          >
            {activeLayout.map(item => {
              const meta = getWidgetMeta(item.i);
              return (
                <div
                  key={item.i}
                  className={`helix-widget ${editMode ? 'helix-widget-edit' : ''}`}
                  style={{ position: 'relative' }}
                >
                  {editMode && (
                    <div
                      className="widget-drag-handle"
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: 28, zIndex: 5, cursor: 'grab',
                        background: 'linear-gradient(180deg, rgba(99,102,241,0.2), transparent)',
                        borderRadius: '16px 16px 0 0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 3 }}>
                        {[...Array(6)].map((_, i) => (
                          <div key={i} style={{
                            width: 4, height: 4, borderRadius: '50%',
                            background: 'rgba(99,102,241,0.7)',
                          }} />
                        ))}
                      </div>
                      {meta && (
                        <span style={{
                          color: 'rgba(99,102,241,0.9)', fontSize: 9, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {meta.label}
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ height: '100%', paddingTop: editMode ? 4 : 0 }}>
                    <WidgetRenderer
                      widgetId={item.i}
                      data={dashData}
                      timeRange={timeRange}
                      editMode={editMode}
                    />
                  </div>
                </div>
              );
            })}
          </GridLayout>
        </div>

        {/* Empty state */}
        {activeLayout.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'rgba(99,102,241,0.05)',
            border: '2px dashed rgba(99,102,241,0.2)',
            borderRadius: 24, color: '#475569',
          }}>
            <Layers size={48} style={{ opacity: 0.4, marginBottom: 16 }} />
            <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#64748b' }}>No widgets enabled</p>
            <p style={{ margin: '8px 0 20px', fontSize: 14 }}>Add some widgets to see your infrastructure data.</p>
            <button
              onClick={() => { setEditMode(true); setShowSelector(true); }}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontWeight: 600, fontSize: 14,
              }}
            >
              Open Widget Library
            </button>
          </div>
        )}
      </div>

      {showSelector && (
        <WidgetSelector
          enabled={enabled}
          onToggle={handleToggleWidget}
          onClose={() => setShowSelector(false)}
        />
      )}

      <SaveToast show={showToast} />
    </>
  );
};

export default Dashboard;