import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, Play, Plus, Clock, CheckCircle2, XCircle, AlertCircle,
  BarChart3, ArrowRight, Activity, X, Brain, Zap, ChevronRight,
  Shield, TrendingUp, Eye, Cpu, Database, RefreshCw, Layers,
  ChevronDown, Circle, AlertTriangle, Info, Sparkles, Network,
  ArrowDownRight, Filter, ExternalLink,
} from 'lucide-react';
import { workflowService } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_META = {
  LogIntelligence:      { icon: '📊', color: '#6366f1', label: 'Log Intelligence' },
  CrashDiagnostic:      { icon: '🔍', color: '#ef4444', label: 'Crash Diagnostic' },
  ResourceOptimization: { icon: '⚡', color: '#f59e0b', label: 'Resource Opt.' },
  AnomalyDetection:     { icon: '🎯', color: '#8b5cf6', label: 'Anomaly Detection' },
  Recovery:             { icon: '🔄', color: '#10b981', label: 'Recovery Agent' },
  Recommendation:       { icon: '💡', color: '#06b6d4', label: 'Recommendation' },
  CostOptimization:     { icon: '💰', color: '#f97316', label: 'Cost Optimization' },
};

const SEVERITY_CONFIG = {
  critical: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#f87171', glow: '0 0 20px rgba(239,68,68,0.4)', label: 'Critical' },
  high:     { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#fbbf24', glow: '0 0 20px rgba(245,158,11,0.4)', label: 'High' },
  medium:   { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#818cf8', glow: '0 0 20px rgba(99,102,241,0.3)', label: 'Medium' },
  low:      { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#34d399', glow: '0 0 20px rgba(16,185,129,0.3)', label: 'Low' },
};

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Completed' },
  failed:    { icon: XCircle,      color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  label: 'Failed' },
  running:   { icon: Activity,     color: '#6366f1', bg: 'rgba(99,102,241,0.15)', label: 'Running' },
  pending:   { icon: Clock,        color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Pending' },
  skipped:   { icon: ChevronRight, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Skipped' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Confidence Ring (SVG animated)
// ─────────────────────────────────────────────────────────────────────────────

const ConfidenceRing = ({ value = 0, size = 56, color = '#6366f1' }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  const dashOffset = circ * (1 - pct);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(pct * 100)}%</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Insight Text Renderer
// ─────────────────────────────────────────────────────────────────────────────

const InsightText = ({ insight }) => {
  if (!insight) return <span style={{ color: '#6b7280', fontStyle: 'italic' }}>No AI insights generated for this step.</span>;

  if (typeof insight === 'string') {
    // Try to parse JSON if the LLM returned JSON string
    try {
      const parsed = JSON.parse(insight);
      return <InsightText insight={parsed} />;
    } catch {
      return <p style={{ color: '#cbd5e1', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{insight}</p>;
    }
  }

  if (typeof insight === 'object') {
    const fields = ['summary', 'headline', 'rootCause', 'patterns', 'keyFindings', 'recommendations', 'crossAgentInsights', 'prioritizedActions'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map(f => {
          const val = insight[f];
          if (!val) return null;
          return (
            <div key={f}>
              <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{f}</p>
              {Array.isArray(val) ? (
                <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', lineHeight: 1.8 }}>
                  {val.map((item, i) => (
                    <li key={i} style={{ fontSize: 13 }}>
                      {typeof item === 'object' ? JSON.stringify(item) : item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#cbd5e1', margin: 0, lineHeight: 1.7, fontSize: 13 }}>{String(val)}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Step Card (in modal)
// ─────────────────────────────────────────────────────────────────────────────

const StepCard = ({ step, index, isLast, isActive }) => {
  const [expanded, setExpanded] = useState(false);
  const agentMeta = AGENT_META[step.agent] || { icon: '🤖', color: '#6366f1', label: step.agent };
  const sevCfg = SEVERITY_CONFIG[step.severity] || SEVERITY_CONFIG.low;
  const statCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
  const StatusIcon = statCfg.icon;

  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
      {/* Vertical connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute',
          left: 27, top: 60,
          width: 2,
          height: 'calc(100% + 16px)',
          background: 'linear-gradient(to bottom, rgba(99,102,241,0.4), rgba(99,102,241,0.05))',
          zIndex: 0,
        }} />
      )}

      {/* Step number bubble */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
        background: `linear-gradient(135deg, ${agentMeta.color}22, ${agentMeta.color}44)`,
        border: `2px solid ${agentMeta.color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, zIndex: 1, position: 'relative',
        boxShadow: isActive ? `0 0 20px ${agentMeta.color}66` : 'none',
        animation: isActive ? 'pulse 2s infinite' : 'none',
      }}>
        {step.status === 'running' ? (
          <Activity size={24} color={agentMeta.color} style={{ animation: 'spin 1.5s linear infinite' }} />
        ) : step.status === 'skipped' ? (
          <ChevronRight size={22} color="#6b7280" />
        ) : (
          <span>{agentMeta.icon}</span>
        )}
      </div>

      {/* Card body */}
      <div style={{
        flex: 1, marginBottom: 16,
        background: sevCfg.bg,
        border: `1px solid ${sevCfg.border}33`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: expanded ? sevCfg.glow : 'none',
        transition: 'box-shadow 0.3s ease',
      }}>
        {/* Header */}
        <div
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
            cursor: 'pointer', userSelect: 'none',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>
                Step {step.stepOrder} — {agentMeta.label}
              </span>
              {/* Status badge */}
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: statCfg.bg, color: statCfg.color,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <StatusIcon size={10} />
                {statCfg.label}
              </span>
              {/* Severity badge */}
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: sevCfg.bg, color: sevCfg.text, border: `1px solid ${sevCfg.border}44`,
              }}>
                {sevCfg.label}
              </span>
              {/* Duration */}
              {step.duration && (
                <span style={{ color: '#64748b', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} />
                  {(step.duration / 1000).toFixed(2)}s
                </span>
              )}
              {/* CW badge */}
              {step.cloudwatchLogsMeta?.injected && (
                <span style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                  background: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Database size={9} />
                  {step.cloudwatchLogsMeta.logCount} CW logs
                </span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {step.action}
            </p>
          </div>

          {/* Confidence ring */}
          <ConfidenceRing value={step.confidence || 0} size={52} color={agentMeta.color} />

          {/* Expand chevron */}
          <ChevronDown
            size={16} color="#64748b"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
          />
        </div>

        {/* Expanded body */}
        {expanded && (
          <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Context received */}
            {step.contextReceived?.fromAgent && (
              <div style={{
                margin: '14px 0 8px',
                padding: '10px 14px',
                background: 'rgba(99,102,241,0.08)',
                borderRadius: 10,
                border: '1px solid rgba(99,102,241,0.2)',
              }}>
                <p style={{ color: '#a5b4fc', fontSize: 11, fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Network size={12} /> Context received from Step {step.contextReceived.fromStep} ({step.contextReceived.fromAgent})
                </p>
                <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>
                  Keys: {step.contextReceived.keys?.join(', ') || 'none'}
                </p>
              </div>
            )}

            {/* LLM Insights */}
            <div style={{ marginTop: 14 }}>
              <p style={{
                color: '#94a3b8', fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
              }}>
                <Brain size={12} color="#a78bfa" /> AI Insights
              </p>
              <div style={{
                background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <InsightText insight={step.llmInsights} />
              </div>
            </div>

            {/* Error */}
            {step.error?.message && (
              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'rgba(239,68,68,0.08)', borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.3)',
              }}>
                <p style={{ color: '#f87171', fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>Error</p>
                <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>{step.error.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Context Flow Visualization
// ─────────────────────────────────────────────────────────────────────────────

const ContextFlowViz = ({ pipeline, steps }) => {
  if (!pipeline?.length || !steps?.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{
        color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
      }}>
        <Network size={12} color="#6366f1" /> Context Flow Pipeline
      </p>
      <div style={{
        background: 'rgba(99,102,241,0.05)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 16, padding: '16px 20px',
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 'max-content' }}>
          {steps.map((step, i) => {
            const agentMeta = AGENT_META[step.agent] || { icon: '🤖', color: '#6366f1' };
            const isLast = i === steps.length - 1;
            const pipeEntry = pipeline.find(p => p.fromStep === step.stepOrder);

            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Node */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${agentMeta.color}22, ${agentMeta.color}44)`,
                    border: `2px solid ${agentMeta.color}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}>
                    {agentMeta.icon}
                  </div>
                  <p style={{ color: '#64748b', fontSize: 10, margin: 0, textAlign: 'center', whiteSpace: 'nowrap', maxWidth: 70 }}>
                    {step.agent}
                  </p>
                </div>

                {/* Arrow + keys label */}
                {!isLast && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <div style={{ width: 30, height: 2, background: 'rgba(99,102,241,0.5)' }} />
                      <ArrowRight size={14} color="#6366f1" />
                    </div>
                    {pipeEntry?.keys?.slice(0, 2).map((k, ki) => (
                      <span key={ki} style={{
                        fontSize: 9, color: '#6366f1', background: 'rgba(99,102,241,0.15)',
                        borderRadius: 4, padding: '1px 5px',
                      }}>{k}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Consolidated Insight Card
// ─────────────────────────────────────────────────────────────────────────────

const ConsolidatedCard = ({ insight, severity, confidence }) => {
  const sevCfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.low;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
      border: `1px solid rgba(99,102,241,0.3)`,
      borderRadius: 20, padding: 24,
      boxShadow: '0 0 40px rgba(99,102,241,0.2)',
      marginTop: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.5)',
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <div>
            <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, margin: 0 }}>Consolidated AI Insight</p>
            <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>Cross-agent synthesis by Helix AI</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: sevCfg.bg, color: sevCfg.text, border: `1px solid ${sevCfg.border}44`,
          }}>
            {sevCfg.label} Severity
          </span>
          <ConfidenceRing value={confidence || 0} size={58} color="#8b5cf6" />
        </div>
      </div>

      {insight ? (
        <div style={{
          background: 'rgba(0,0,0,0.2)', borderRadius: 14,
          padding: '16px 18px', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <InsightText insight={insight} />
        </div>
      ) : (
        <div style={{
          padding: '20px', textAlign: 'center', color: '#475569', fontStyle: 'italic',
        }}>
          Consolidated insight not available (LLM may not be configured or workflow is still running)
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Execution Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

const ExecutionDetailModal = ({ executionId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await workflowService.getExecution(executionId);
      setData(res.data);
      // Poll if still running
      if (res.data?.execution?.status === 'running' || res.data?.execution?.status === 'pending') {
        pollRef.current = setTimeout(fetchDetail, 3000);
      }
    } catch (err) {
      console.error('Failed to fetch execution detail', err);
    } finally {
      setLoading(false);
    }
  }, [executionId]);

  useEffect(() => {
    fetchDetail();
    return () => clearTimeout(pollRef.current);
  }, [fetchDetail]);

  const exec = data?.execution;
  const summary = data?.summary;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px',
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.25s ease',
      overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 860, marginTop: 20, marginBottom: 40,
        background: 'linear-gradient(135deg, rgba(15,20,40,0.97), rgba(10,15,30,0.99))',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: 24,
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.1)',
        animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 28px',
          background: 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
          borderBottom: '1px solid rgba(99,102,241,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99,102,241,0.5)',
            }}>
              <Layers size={20} color="white" />
            </div>
            <div>
              <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17, margin: 0 }}>
                {exec?.workflowName || 'Workflow Execution'}
              </p>
              <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                {exec?.startTime ? new Date(exec.startTime).toLocaleString() : ''}
                {exec?.duration ? ` · ${(exec.duration / 1000).toFixed(1)}s total` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', transition: 'background 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.2)',
              borderTop: '3px solid #6366f1',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        ) : exec ? (
          <div style={{ padding: '28px' }}>
            {/* Summary stats bar */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: 12, marginBottom: 28,
            }}>
              {[
                { label: 'Total Steps', value: summary?.totalSteps ?? exec.steps?.length, icon: Layers, color: '#6366f1' },
                { label: 'Completed', value: summary?.completedSteps, icon: CheckCircle2, color: '#10b981' },
                { label: 'Failed', value: summary?.failedSteps, icon: XCircle, color: '#ef4444' },
                { label: 'Severity', value: (summary?.overallSeverity || 'N/A').toUpperCase(), icon: Shield, color: SEVERITY_CONFIG[summary?.overallSeverity]?.text || '#64748b' },
                { label: 'Confidence', value: summary?.overallConfidence ? `${Math.round(summary.overallConfidence * 100)}%` : 'N/A', icon: TrendingUp, color: '#8b5cf6' },
              ].map(({ label, value, icon: Icon, color }, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '12px 14px', textAlign: 'center',
                }}>
                  <Icon size={16} color={color} style={{ marginBottom: 4 }} />
                  <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18, margin: 0 }}>{value ?? '—'}</p>
                  <p style={{ color: '#475569', fontSize: 10, margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Context flow visualization */}
            {exec.contextPipeline?.length > 0 && (
              <ContextFlowViz pipeline={exec.contextPipeline} steps={exec.steps} />
            )}

            {/* Step timeline */}
            <p style={{
              color: '#94a3b8', fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
            }}>
              <Activity size={12} color="#6366f1" /> Step-by-Step Timeline
            </p>

            <div style={{ marginBottom: 24 }}>
              {exec.steps?.length > 0 ? (
                exec.steps.map((step, i) => (
                  <StepCard
                    key={step._id || i}
                    step={step}
                    index={i}
                    isLast={i === exec.steps.length - 1}
                    isActive={step.status === 'running'}
                  />
                ))
              ) : (
                <p style={{ color: '#475569', textAlign: 'center', padding: 20 }}>No step data available.</p>
              )}
            </div>

            {/* Consolidated insight */}
            <ConsolidatedCard
              insight={exec.consolidatedInsight}
              severity={exec.overallSeverity}
              confidence={exec.overallConfidence}
            />

            {/* Running indicator */}
            {(exec.status === 'running' || exec.status === 'pending') && (
              <div style={{
                marginTop: 20, padding: '12px 16px',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#6366f1',
                  animation: 'pulse 1.5s infinite',
                }} />
                <p style={{ color: '#a5b4fc', fontSize: 13, margin: 0 }}>
                  Workflow is running — auto-refreshing every 3 seconds…
                </p>
                <RefreshCw size={14} color="#6366f1" style={{ marginLeft: 'auto', animation: 'spin 2s linear infinite' }} />
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            Failed to load execution details.
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step Pipeline (workflow card preview)
// ─────────────────────────────────────────────────────────────────────────────

const StepPipeline = ({ steps }) => {
  if (!steps?.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '6px 0' }}>
      {steps.map((step, i) => {
        const meta = AGENT_META[step.agent] || { icon: '🤖', color: '#6366f1' };
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 8,
              background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
            }}>
              <span style={{ fontSize: 13 }}>{meta.icon}</span>
              <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {step.action || step.agent}
              </span>
            </div>
            {i < steps.length - 1 && <ArrowRight size={12} color="#334155" />}
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Workflows Page
// ─────────────────────────────────────────────────────────────────────────────

const Workflows = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [executing, setExecuting] = useState(null);
  const [selectedExecId, setSelectedExecId] = useState(null);

  const load = useCallback(() => {
    Promise.all([workflowService.getWorkflows(), workflowService.getExecutions()])
      .then(([wfRes, execRes]) => {
        setWorkflows(wfRes.data.workflows || []);
        setExecutions(execRes.data.executions || []);
      })
      .catch(err => { console.error(err); setError('Failed to load workflows'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExecute = async (id, e) => {
    e.stopPropagation();
    setExecuting(id);
    setError(null);
    try {
      const res = await workflowService.executeWorkflow(id, {});
      // Open execution detail immediately
      setSelectedExecId(res.data.execution._id);
      load();
    } catch (err) {
      console.error('Workflow execution failed:', err);
      setError(err.response?.data?.error || 'Workflow execution failed');
    } finally {
      setExecuting(null);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 380 }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid rgba(99,102,241,0.2)',
        borderTop: '3px solid #6366f1',
        animation: 'spin 1s linear infinite',
      }} />
    </div>
  );

  const completedCount = executions.filter(e => e.status === 'completed').length;
  const failedCount    = executions.filter(e => e.status === 'failed').length;
  const runningCount   = executions.filter(e => e.status === 'running' || e.status === 'pending').length;
  const avgDuration    = executions.filter(e => e.duration).reduce((s, e) => s + e.duration, 0) /
    (executions.filter(e => e.duration).length || 1);

  return (
    <>
      {/* Keyframes injected globally */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes shimmer {
          0%{background-position:-200% 0}
          100%{background-position:200% 0}
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{
              fontSize: 32, fontWeight: 800, margin: 0,
              background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Workflows
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              Intelligent multi-agent automation with AI-powered insights
            </p>
          </div>
          <button
            onClick={() => navigate('/workflows/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontWeight: 600, fontSize: 14,
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <Plus size={16} /> Create Workflow
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px', marginBottom: 24,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 14, color: '#f87171',
          }}>
            <AlertCircle size={18} />
            <span style={{ flex: 1, fontSize: 14 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 36 }}>
          {[
            { label: 'Total Runs', value: executions.length, icon: BarChart3, grad: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', textColor: '#818cf8' },
            { label: 'Completed', value: completedCount, icon: CheckCircle2, grad: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', textColor: '#34d399' },
            { label: 'Failed', value: failedCount, icon: XCircle, grad: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', textColor: '#f87171' },
            { label: 'Running', value: runningCount, icon: Activity, grad: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', textColor: '#fbbf24' },
            { label: 'Avg Duration', value: avgDuration > 0 ? `${(avgDuration / 1000).toFixed(1)}s` : '—', icon: Clock, grad: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', textColor: '#a78bfa' },
          ].map(({ label, value, icon: Icon, grad, border, textColor }, i) => (
            <div key={i} style={{
              background: grad, border: `1px solid ${border}`,
              borderRadius: 18, padding: '18px 20px',
              transition: 'transform 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={15} color={textColor} />
                <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{label}</p>
              </div>
              <p style={{ color: textColor, fontSize: 28, fontWeight: 800, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Workflow Cards */}
        <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Active Workflows</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 44 }}>
          {workflows.length > 0 ? workflows.map(workflow => (
            <div
              key={workflow._id}
              onClick={() => navigate(`/workflows/${workflow._id}`)}
              style={{
                background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,20,40,0.95))',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 20, padding: 24, cursor: 'pointer',
                transition: 'border-color 0.3s, transform 0.2s, box-shadow 0.3s',
                backdropFilter: 'blur(20px)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                e.currentTarget.style.boxShadow = '0 8px 40px rgba(99,102,241,0.2)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(99,102,241,0.4)',
                  }}>
                    <GitBranch size={20} color="#818cf8" />
                  </div>
                  <div>
                    <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: 0 }}>{workflow.name}</h3>
                    <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{workflow.steps?.length || 0} steps</p>
                  </div>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: workflow.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                  color: workflow.isActive ? '#34d399' : '#6b7280',
                  border: `1px solid ${workflow.isActive ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.2)'}`,
                }}>
                  {workflow.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p style={{ color: '#475569', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
                {workflow.description || 'No description provided.'}
              </p>

              <StepPipeline steps={workflow.steps} />

              {workflow.trigger && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, color: '#475569', fontSize: 12 }}>
                  <Clock size={12} />
                  <span>Trigger: {workflow.trigger.type}{workflow.trigger.schedule ? ` (${workflow.trigger.schedule})` : ''}</span>
                </div>
              )}

              <button
                onClick={(e) => handleExecute(workflow._id, e)}
                disabled={executing === workflow._id}
                style={{
                  width: '100%', marginTop: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px', borderRadius: 12, cursor: 'pointer',
                  background: executing === workflow._id
                    ? 'rgba(99,102,241,0.15)'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))',
                  color: '#a5b4fc', fontWeight: 600, fontSize: 13,
                  transition: 'background 0.2s',
                  opacity: executing === workflow._id ? 0.7 : 1,
                  border: '1px solid rgba(99,102,241,0.3)',
                }}
              >
                {executing === workflow._id ? (
                  <><Activity size={15} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
                ) : (
                  <><Play size={15} /> Execute Workflow</>
                )}
              </button>
            </div>
          )) : (
            <div style={{
              gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px',
              color: '#475569',
            }}>
              <GitBranch size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ margin: 0 }}>No workflows created yet.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Create a workflow to automate multi-agent orchestration.</p>
            </div>
          )}
        </div>

        {/* Executions Table */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700, margin: 0 }}>Recent Executions</h2>
          <button
            onClick={load}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.1)', color: '#818cf8', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'background 0.2s',
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div style={{
          background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                {['Workflow', 'Status', 'Severity', 'Confidence', 'Trigger', 'Started', 'Duration', 'Insight', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '14px 20px', textAlign: 'left',
                    color: '#475569', fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {executions.length > 0 ? executions.slice(0, 25).map(exec => {
                const sevCfg = SEVERITY_CONFIG[exec.overallSeverity] || SEVERITY_CONFIG.low;
                const statCfg = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending;
                const StatusIcon = statCfg.icon;

                return (
                  <tr
                    key={exec._id}
                    onClick={() => setSelectedExecId(exec._id)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 20px', color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>
                      {exec.workflowName || exec.workflow?.name || '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: statCfg.bg, color: statCfg.color,
                      }}>
                        <StatusIcon size={11} />
                        {statCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {exec.overallSeverity ? (
                        <span style={{
                          padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: sevCfg.bg, color: sevCfg.text,
                        }}>
                          {sevCfg.label}
                        </span>
                      ) : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {exec.overallConfidence != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${Math.round(exec.overallConfidence * 100)}%`,
                              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                              transition: 'width 0.3s',
                            }} />
                          </div>
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>
                            {Math.round(exec.overallConfidence * 100)}%
                          </span>
                        </div>
                      ) : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: 13 }}>
                      {exec.triggeredBy?.type || '—'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: 13 }}>
                      {exec.startTime ? new Date(exec.startTime).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        fontSize: 13, fontWeight: 600,
                        color: exec.duration > 30000 ? '#f87171' : exec.duration > 10000 ? '#fbbf24' : '#34d399',
                      }}>
                        {exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {exec.consolidatedInsight ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                        }}>
                          <Sparkles size={10} /> AI
                        </span>
                      ) : <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <Eye size={16} color="#475569" />
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} style={{ padding: '50px 20px', textAlign: 'center', color: '#475569' }}>
                    No executions yet. Run a workflow to see AI-powered insights here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution detail modal */}
      {selectedExecId && (
        <ExecutionDetailModal
          executionId={selectedExecId}
          onClose={() => setSelectedExecId(null)}
        />
      )}
    </>
  );
};

export default Workflows;
