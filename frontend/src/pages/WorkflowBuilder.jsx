import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, AlertTriangle, X, ZoomIn, ZoomOut, MousePointer2, Edit3, Clock, Zap, Settings2 } from 'lucide-react';
import { workflowService } from '../services/api';

const AGENTS = [
  { name: 'LogIntelligence', label: 'Log Intelligence', icon: '📊', color: '#3b82f6' },
  { name: 'CrashDiagnostic', label: 'Crash Diagnostic', icon: '🔍', color: '#ef4444' },
  { name: 'ResourceOptimization', label: 'Resource Optimization', icon: '⚡', color: '#f59e0b' },
  { name: 'AnomalyDetection', label: 'Anomaly Detection', icon: '🎯', color: '#8b5cf6' },
  { name: 'Recovery', label: 'Recovery', icon: '🔄', color: '#22c55e' },
  { name: 'Recommendation', label: 'Recommendation', icon: '💡', color: '#06b6d4' },
  { name: 'CostOptimization', label: 'Cost Optimization', icon: '💰', color: '#ec4899' },
];

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual', icon: '👆', desc: 'Triggered manually by a user' },
  { value: 'scheduled', label: 'Scheduled', icon: '🕐', desc: 'Runs on a cron schedule' },
  { value: 'event', label: 'Event', icon: '⚡', desc: 'Triggered by a system event' },
  { value: 'condition', label: 'Condition', icon: '🔀', desc: 'Triggered when a condition is met' },
];

const WORKFLOW_TYPES = [
  { value: 'custom', label: 'Custom' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'optimization', label: 'Optimization' },
];

const NODE_W = 220;
const NODE_H = 80;
const PORT_R = 8;

let idCounter = 0;
const uid = () => `n_${Date.now()}_${++idCounter}`;
const edgeId = () => `e_${Date.now()}_${++idCounter}`;

/* ── cycle detection (DFS) ── */
const hasCycle = (nodes, edges) => {
  if (!nodes.length || !edges.length) return false;
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => { if (adj[e.source]) adj[e.source].push(e.target); });
  const W = 0, G = 1, B = 2;
  const col = {};
  nodes.forEach(n => { col[n.id] = W; });
  const dfs = u => {
    col[u] = G;
    for (const v of (adj[u] || [])) {
      if (col[v] === G) return true;
      if (col[v] === W && dfs(v)) return true;
    }
    col[u] = B;
    return false;
  };
  return nodes.some(n => col[n.id] === W && dfs(n.id));
};

/* Convert legacy step-based workflow to graph nodes */
const stepsToGraph = (steps) => {
  if (!steps?.length) return { nodes: [], edges: [] };
  const nodes = steps.map((step, i) => ({
    id: uid(),
    agent: step.agent,
    action: step.action || 'process',
    position: { x: 80 + i * 300, y: 120 },
  }));
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ id: edgeId(), source: nodes[i].id, target: nodes[i + 1].id });
  }
  return { nodes, edges };
};

/* ── Toast ── */
const Toast = ({ message, type = 'error', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`wfb-toast ${type}`}>
      <AlertTriangle className="w-5 h-5" />
      <span>{message}</span>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
};

/* ── Agent Selector Dropdown ── */
const AgentSelector = ({ currentAgent, onSelect, nodeId }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = AGENTS.find(a => a.name === currentAgent) || AGENTS[0];

  return (
    <div ref={ref} className="wfb-agent-selector">
      <button className="wfb-agent-btn" onClick={e => { e.stopPropagation(); setOpen(!open); }}>
        <span className="wfb-agent-icon">{current.icon}</span>
        <span className="wfb-agent-label">{current.label}</span>
        <svg className={`wfb-chevron ${open ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
          <path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="wfb-dropdown">
          {AGENTS.map(a => (
            <button
              key={a.name}
              className={`wfb-dropdown-item ${a.name === currentAgent ? 'active' : ''}`}
              onClick={e => { e.stopPropagation(); onSelect(nodeId, a.name); setOpen(false); }}
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Trigger Config Panel ── */
const TriggerConfigPanel = ({ trigger, onChange, readOnly }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="wfb-trigger-panel">
      <button className="wfb-trigger-toggle" onClick={() => setExpanded(!expanded)}>
        <Settings2 className="w-4 h-4" />
        <span>Trigger: <strong>{TRIGGER_TYPES.find(t => t.value === trigger.type)?.label || 'Manual'}</strong></span>
        <svg className={`wfb-chevron ${expanded ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
          <path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {expanded && (
        <div className="wfb-trigger-body">
          <div className="wfb-trigger-types">
            {TRIGGER_TYPES.map(t => (
              <button
                key={t.value}
                className={`wfb-trigger-type-btn ${trigger.type === t.value ? 'active' : ''}`}
                onClick={() => !readOnly && onChange({ ...trigger, type: t.value })}
                disabled={readOnly}
              >
                <span className="wfb-trigger-type-icon">{t.icon}</span>
                <div>
                  <div className="wfb-trigger-type-label">{t.label}</div>
                  <div className="wfb-trigger-type-desc">{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
          {trigger.type === 'scheduled' && (
            <div className="wfb-trigger-input-group">
              <label><Clock className="w-3.5 h-3.5" /> Cron Schedule</label>
              <input
                className="wfb-trigger-input"
                placeholder="e.g. 0 2 * * * (daily at 2 AM)"
                value={trigger.schedule || ''}
                onChange={e => !readOnly && onChange({ ...trigger, schedule: e.target.value })}
                readOnly={readOnly}
              />
              <span className="wfb-trigger-hint">Standard cron format: minute hour day month weekday</span>
            </div>
          )}
          {trigger.type === 'event' && (
            <div className="wfb-trigger-input-group">
              <label><Zap className="w-3.5 h-3.5" /> Event Name</label>
              <input
                className="wfb-trigger-input"
                placeholder="e.g. incident.created"
                value={trigger.event || ''}
                onChange={e => !readOnly && onChange({ ...trigger, event: e.target.value })}
                readOnly={readOnly}
              />
            </div>
          )}
          {trigger.type === 'condition' && (
            <div className="wfb-trigger-input-group">
              <label><Settings2 className="w-3.5 h-3.5" /> Condition Expression</label>
              <input
                className="wfb-trigger-input"
                placeholder="e.g. cpu_usage > 90"
                value={trigger.condition || ''}
                onChange={e => !readOnly && onChange({ ...trigger, condition: e.target.value })}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ──────── Main Component ──────── */
const WorkflowBuilder = () => {
  const navigate = useNavigate();
  const { id: workflowId } = useParams();
  const isEditRoute = !!workflowId;
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDesc, setWorkflowDesc] = useState('');
  const [workflowType, setWorkflowType] = useState('custom');
  const [trigger, setTrigger] = useState({ type: 'manual', schedule: '', event: '', condition: '' });

  const [readOnly, setReadOnly] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);

  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  /* ── Load existing workflow when editing ── */
  useEffect(() => {
    if (!workflowId) return;
    setLoadingWorkflow(true);
    setReadOnly(true);
    workflowService.getWorkflow(workflowId)
      .then(res => {
        const wf = res.data.workflow;
        setWorkflowName(wf.name || '');
        setWorkflowDesc(wf.description || '');
        setWorkflowType(wf.type || 'custom');
        setTrigger({
          type: wf.trigger?.type || 'manual',
          schedule: wf.trigger?.schedule || '',
          event: wf.trigger?.event || '',
          condition: wf.trigger?.condition || '',
        });
        // Use graph if available, otherwise convert from steps
        if (wf.graph?.nodes?.length) {
          setNodes(wf.graph.nodes.map(n => ({
            id: n.id,
            agent: n.agent,
            action: n.action || 'process',
            position: { x: n.position.x, y: n.position.y },
          })));
          setEdges((wf.graph.edges || []).map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
          })));
        } else if (wf.steps?.length) {
          const g = stepsToGraph(wf.steps);
          setNodes(g.nodes);
          setEdges(g.edges);
        }
      })
      .catch(() => setToast({ message: 'Failed to load workflow', type: 'error' }))
      .finally(() => setLoadingWorkflow(false));
  }, [workflowId]);

  /* Convert screen coords to canvas coords */
  const screenToCanvas = useCallback((sx, sy) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: sx, y: sy };
    return {
      x: (sx - rect.left - pan.x) / zoom,
      y: (sy - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  /* ── Double-click → add node ── */
  const handleDoubleClick = useCallback((e) => {
    if (readOnly) return;
    if (e.target !== svgRef.current && e.target.tagName !== 'rect' && !e.target.classList.contains('wfb-canvas-bg')) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const newNode = {
      id: uid(),
      agent: AGENTS[0].name,
      action: 'process',
      position: { x: x - NODE_W / 2, y: y - NODE_H / 2 },
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode.id);
    setSelectedEdge(null);
  }, [screenToCanvas, readOnly]);

  /* ── Node dragging ── */
  const startDragNode = useCallback((e, nodeId) => {
    if (readOnly) return;
    e.stopPropagation();
    if (e.button !== 0) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragOffset({ x: x - node.position.x, y: y - node.position.y });
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
    setSelectedEdge(null);
  }, [nodes, screenToCanvas, readOnly]);

  /* ── Start connecting edge from output port ── */
  const startConnect = useCallback((e, sourceId) => {
    if (readOnly) return;
    e.stopPropagation();
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setConnecting({ sourceId, x, y });
  }, [screenToCanvas, readOnly]);

  /* ── Finish connecting edge on input port ── */
  const endConnect = useCallback((e, targetId) => {
    e.stopPropagation();
    if (!connecting) return;
    if (connecting.sourceId === targetId) { setConnecting(null); return; }
    const exists = edges.some(ed => ed.source === connecting.sourceId && ed.target === targetId);
    if (exists) { setConnecting(null); return; }
    const newEdge = { id: edgeId(), source: connecting.sourceId, target: targetId };
    const testEdges = [...edges, newEdge];
    if (hasCycle(nodes, testEdges)) {
      setToast({ message: 'Circular dependency detected! This connection would create a cycle.', type: 'error' });
      setConnecting(null);
      return;
    }
    setEdges(prev => [...prev, newEdge]);
    setConnecting(null);
  }, [connecting, edges, nodes]);

  /* ── Mouse move ── */
  const handleMouseMove = useCallback((e) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setMousePos({ x, y });

    if (panning) {
      setPan(prev => ({
        x: prev.x + (e.clientX - panStart.x),
        y: prev.y + (e.clientY - panStart.y),
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (draggingNode) {
      setNodes(prev => prev.map(n =>
        n.id === draggingNode ? { ...n, position: { x: x - dragOffset.x, y: y - dragOffset.y } } : n
      ));
    }
    if (connecting) {
      setConnecting(prev => prev ? { ...prev, x, y } : null);
    }
  }, [draggingNode, connecting, dragOffset, screenToCanvas, panning, panStart]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
    setConnecting(null);
    setPanning(false);
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
    if (e.target === svgRef.current || e.target.classList.contains('wfb-canvas-bg')) {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(2, Math.max(0.3, prev + delta)));
  }, []);

  /* ── Delete selected ── */
  const handleKeyDown = useCallback((e) => {
    if (readOnly) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
      if (selectedNode) {
        setNodes(prev => prev.filter(n => n.id !== selectedNode));
        setEdges(prev => prev.filter(ed => ed.source !== selectedNode && ed.target !== selectedNode));
        setSelectedNode(null);
      }
      if (selectedEdge) {
        setEdges(prev => prev.filter(ed => ed.id !== selectedEdge));
        setSelectedEdge(null);
      }
    }
  }, [selectedNode, selectedEdge, readOnly]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selectAgent = useCallback((nodeId, agentName) => {
    if (readOnly) return;
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, agent: agentName } : n));
  }, [readOnly]);

  const deleteNode = useCallback((nodeId) => {
    if (readOnly) return;
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(ed => ed.source !== nodeId && ed.target !== nodeId));
    setSelectedNode(null);
  }, [readOnly]);

  /* ── Save / Update ── */
  const handleSave = useCallback(async () => {
    if (!workflowName.trim()) {
      setToast({ message: 'Please enter a workflow name', type: 'error' });
      return;
    }
    if (nodes.length === 0) {
      setToast({ message: 'Add at least one agent node to the workflow', type: 'error' });
      return;
    }
    if (hasCycle(nodes, edges)) {
      setToast({ message: 'Cannot save: Circular dependency detected in workflow!', type: 'error' });
      return;
    }

    const payload = {
      name: workflowName.trim(),
      description: workflowDesc.trim(),
      type: workflowType,
      trigger: {
        type: trigger.type,
        ...(trigger.type === 'scheduled' && { schedule: trigger.schedule }),
        ...(trigger.type === 'event' && { event: trigger.event }),
        ...(trigger.type === 'condition' && { condition: trigger.condition }),
      },
      graph: { nodes, edges },
    };

    setSaving(true);
    try {
      if (isEditRoute) {
        await workflowService.updateWorkflow(workflowId, payload);
        setToast({ message: 'Workflow updated successfully!', type: 'success' });
        setReadOnly(true);
      } else {
        await workflowService.createGraphWorkflow(payload);
        navigate('/workflows');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save workflow';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [workflowName, workflowDesc, workflowType, trigger, nodes, edges, navigate, isEditRoute, workflowId]);

  /* ── Edge path helper ── */
  const getEdgePath = useCallback((source, target) => {
    const sx = source.position.x + NODE_W;
    const sy = source.position.y + NODE_H / 2;
    const tx = target.position.x;
    const ty = target.position.y + NODE_H / 2;
    const dx = Math.abs(tx - sx) * 0.5;
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  }, []);

  const getAgentMeta = (name) => AGENTS.find(a => a.name === name) || AGENTS[0];

  if (loadingWorkflow) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="wfb-root">
      {/* ── Top Bar ── */}
      <div className="wfb-topbar">
        <div className="wfb-topbar-left">
          <button className="wfb-back-btn" onClick={() => navigate('/workflows')}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="wfb-separator" />
          <input
            className="wfb-name-input"
            placeholder="Workflow name…"
            value={workflowName}
            onChange={e => setWorkflowName(e.target.value)}
            readOnly={readOnly}
          />
          <input
            className="wfb-desc-input"
            placeholder="Description (optional)"
            value={workflowDesc}
            onChange={e => setWorkflowDesc(e.target.value)}
            readOnly={readOnly}
          />
          <select
            className="wfb-type-select"
            value={workflowType}
            onChange={e => setWorkflowType(e.target.value)}
            disabled={readOnly}
          >
            {WORKFLOW_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="wfb-topbar-right">
          <span className="wfb-node-count">{nodes.length} nodes · {edges.length} edges</span>
          <div className="wfb-zoom-controls">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))}><ZoomOut className="w-4 h-4" /></button>
            <span className="wfb-zoom-label">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.15))}><ZoomIn className="w-4 h-4" /></button>
          </div>
          {isEditRoute && readOnly ? (
            <button className="wfb-edit-btn" onClick={() => setReadOnly(false)}>
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          ) : (
            <button className="wfb-save-btn" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : isEditRoute ? 'Update Workflow' : 'Save Workflow'}
            </button>
          )}
        </div>
      </div>

      {/* ── Trigger Config ── */}
      <TriggerConfigPanel trigger={trigger} onChange={setTrigger} readOnly={readOnly} />

      {/* ── Hint bar ── */}
      {!readOnly && (
        <div className="wfb-hint">
          <MousePointer2 className="w-3.5 h-3.5" />
          <span>Double-click to add node</span>
          <span className="wfb-hint-sep">·</span>
          <span>Drag from ● to connect</span>
          <span className="wfb-hint-sep">·</span>
          <span>Delete/Backspace to remove selected</span>
          <span className="wfb-hint-sep">·</span>
          <span>Alt+Drag to pan · Scroll to zoom</span>
        </div>
      )}
      {readOnly && (
        <div className="wfb-hint wfb-hint-readonly">
          <span>🔒 Read-only mode — Click <strong>Edit</strong> to make changes</span>
        </div>
      )}

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="wfb-canvas-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
      >
        <svg ref={svgRef} className="wfb-svg" width="100%" height="100%">
          <defs>
            <pattern id="wfb-grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={0.8} fill="#1e293b" />
            </pattern>
          </defs>
          <rect className="wfb-canvas-bg" width="100%" height="100%" fill="url(#wfb-grid)" />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* ── Edges ── */}
            {edges.map(edge => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;
              const path = getEdgePath(source, target);
              const sourceAgent = getAgentMeta(source.agent);
              return (
                <g key={edge.id}>
                  <path d={path} fill="none" stroke="transparent" strokeWidth={12} className="cursor-pointer"
                    onClick={e => { e.stopPropagation(); setSelectedEdge(edge.id); setSelectedNode(null); }} />
                  <path d={path} fill="none"
                    stroke={selectedEdge === edge.id ? '#f43f5e' : sourceAgent.color}
                    strokeWidth={selectedEdge === edge.id ? 3 : 2}
                    strokeOpacity={0.7} className="wfb-edge-path" />
                  <circle cx={target.position.x} cy={target.position.y + NODE_H / 2} r={4}
                    fill={selectedEdge === edge.id ? '#f43f5e' : sourceAgent.color} fillOpacity={0.8} />
                </g>
              );
            })}

            {/* ── Temp connecting line ── */}
            {connecting && (
              <line
                x1={nodes.find(n => n.id === connecting.sourceId)?.position.x + NODE_W || 0}
                y1={(nodes.find(n => n.id === connecting.sourceId)?.position.y || 0) + NODE_H / 2}
                x2={mousePos.x} y2={mousePos.y}
                stroke="#0ea5e9" strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.8} />
            )}

            {/* ── Nodes ── */}
            {nodes.map(node => {
              const agent = getAgentMeta(node.agent);
              const isSelected = selectedNode === node.id;
              return (
                <g key={node.id} transform={`translate(${node.position.x}, ${node.position.y})`}>
                  {isSelected && (
                    <rect x={-4} y={-4} width={NODE_W + 8} height={NODE_H + 8} rx={16} ry={16}
                      fill="none" stroke={agent.color} strokeWidth={2} strokeOpacity={0.4} className="wfb-node-glow" />
                  )}
                  <rect x={0} y={0} width={NODE_W} height={NODE_H} rx={12} ry={12}
                    fill="#0f172a" stroke={isSelected ? agent.color : '#334155'}
                    strokeWidth={isSelected ? 2 : 1} className="wfb-node-card"
                    onMouseDown={e => startDragNode(e, node.id)}
                    onClick={e => { e.stopPropagation(); setSelectedNode(node.id); setSelectedEdge(null); }}
                  />
                  <rect x={0} y={0} width={5} height={NODE_H} rx={12} ry={0}
                    fill={agent.color} opacity={0.8} clipPath="inset(0 0 0 0 round 12px 0 0 12px)" />
                  <text x={18} y={30} className="wfb-node-icon" fontSize="20">{agent.icon}</text>
                  <text x={44} y={30} className="wfb-node-label" fill="white" fontSize="13" fontWeight="600">{agent.label}</text>
                  <text x={44} y={50} className="wfb-node-sub" fill="#64748b" fontSize="10">{node.action}</text>

                  {isSelected && !readOnly && (
                    <g className="wfb-delete-btn" transform={`translate(${NODE_W - 22}, 6)`}
                      onClick={e => { e.stopPropagation(); deleteNode(node.id); }}>
                      <circle cx={8} cy={8} r={10} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                      <line x1={5} y1={5} x2={11} y2={11} stroke="#ef4444" strokeWidth={1.5} strokeLinecap="round" />
                      <line x1={11} y1={5} x2={5} y2={11} stroke="#ef4444" strokeWidth={1.5} strokeLinecap="round" />
                    </g>
                  )}

                  {/* Input port */}
                  <circle cx={0} cy={NODE_H / 2} r={PORT_R}
                    className="wfb-port wfb-port-in" fill="#1e293b" stroke="#475569" strokeWidth={2}
                    onMouseUp={e => endConnect(e, node.id)} />
                  {/* Output port */}
                  <circle cx={NODE_W} cy={NODE_H / 2} r={PORT_R}
                    className="wfb-port wfb-port-out" fill="#1e293b" stroke={agent.color} strokeWidth={2}
                    onMouseDown={e => startConnect(e, node.id)} />
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Agent selector overlays ── */}
        {!readOnly && nodes.map(node => {
          if (selectedNode !== node.id) return null;
          const screenX = node.position.x * zoom + pan.x;
          const screenY = node.position.y * zoom + pan.y + NODE_H * zoom + 4;
          return (
            <div key={`sel-${node.id}`} className="wfb-agent-selector-overlay"
              style={{ left: screenX, top: screenY, transform: `scale(${Math.min(zoom, 1)})`, transformOrigin: 'top left' }}>
              <AgentSelector currentAgent={node.agent} onSelect={selectAgent} nodeId={node.id} />
            </div>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {nodes.length === 0 && !readOnly && (
        <div className="wfb-empty-state">
          <div className="wfb-empty-icon">🔗</div>
          <h3>Start building your workflow</h3>
          <p>Double-click anywhere on the canvas to add your first agent node</p>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default WorkflowBuilder;
