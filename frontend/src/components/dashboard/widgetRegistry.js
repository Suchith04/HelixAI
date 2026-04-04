/**
 * WIDGET REGISTRY
 * Central registry of all available dashboard widgets.
 * Each entry declares: id, label, description, category, defaultLayout, component key.
 *
 * Companies can toggle widgets on/off via the Widget Selector panel.
 * New widgets can be added here and they automatically appear as options.
 */

export const WIDGET_REGISTRY = [
  {
    id: 'kpi_agents',
    label: 'Active Agents',
    description: 'Shows number of active vs total agents',
    category: 'kpi',
    icon: '🤖',
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2 },
  },
  {
    id: 'kpi_incidents',
    label: 'Open Incidents',
    description: 'Total open incidents with today count',
    category: 'kpi',
    icon: '⚠️',
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2 },
  },
  {
    id: 'kpi_critical',
    label: 'Critical Issues',
    description: 'Number of critical severity issues',
    category: 'kpi',
    icon: '🔴',
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2 },
  },
  {
    id: 'kpi_resources',
    label: 'Resource Health',
    description: 'Healthy vs total monitored resources',
    category: 'kpi',
    icon: '🖥️',
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2 },
  },
  {
    id: 'kpi_cost',
    label: 'Monthly Cost',
    description: 'Estimated monthly infrastructure cost',
    category: 'kpi',
    icon: '💰',
    defaultLayout: { w: 2, h: 2, minW: 2, minH: 2 },
  },
  {
    id: 'chart_incident_trend',
    label: 'Incident Trend',
    description: 'Area chart of incident counts over time',
    category: 'chart',
    icon: '📈',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'chart_anomaly_trend',
    label: 'Anomaly Trend',
    description: 'Area chart of anomalies detected over time',
    category: 'chart',
    icon: '📉',
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'chart_agent_perf',
    label: 'Agent Performance',
    description: 'Horizontal bar chart of agent task metrics',
    category: 'chart',
    icon: '🏎️',
    defaultLayout: { w: 8, h: 5, minW: 5, minH: 3 },
  },
  {
    id: 'chart_severity',
    label: 'Severity Breakdown',
    description: 'Donut chart showing incident severity distribution',
    category: 'chart',
    icon: '🥧',
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 4 },
  },
  {
    id: 'chart_cost',
    label: 'Cost by Resource',
    description: 'Donut chart of infrastructure costs by resource type',
    category: 'chart',
    icon: '💹',
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 4 },
  },
  {
    id: 'panel_system_health',
    label: 'System Health',
    description: 'Resource health status badges and score',
    category: 'panel',
    icon: '💪',
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 3 },
  },
  {
    id: 'panel_activity',
    label: 'Recent Activity',
    description: 'Latest workflow execution history',
    category: 'panel',
    icon: '⚡',
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 3 },
  },
  {
    id: 'chart_category',
    label: 'Incidents by Category',
    description: 'Bar chart of incidents grouped by category',
    category: 'chart',
    icon: '📊',
    defaultLayout: { w: 12, h: 4, minW: 6, minH: 3 },
  },
];

/**
 * Default layout — the initial grid positions for a fresh user.
 * Coordinates are (x, y) in column units (12-column grid).
 */
export const DEFAULT_LAYOUT = [
  { i: 'kpi_agents',           x: 0,  y: 0, w: 2, h: 2 },
  { i: 'kpi_incidents',        x: 2,  y: 0, w: 2, h: 2 },
  { i: 'kpi_critical',         x: 4,  y: 0, w: 2, h: 2 },
  { i: 'kpi_resources',        x: 6,  y: 0, w: 2, h: 2 },
  { i: 'kpi_cost',             x: 8,  y: 0, w: 2, h: 2 },
  { i: 'chart_incident_trend', x: 0,  y: 2, w: 6, h: 4 },
  { i: 'chart_anomaly_trend',  x: 6,  y: 2, w: 6, h: 4 },
  { i: 'chart_agent_perf',     x: 0,  y: 6, w: 8, h: 5 },
  { i: 'chart_severity',       x: 8,  y: 6, w: 4, h: 5 },
  { i: 'panel_system_health',  x: 0,  y: 11, w: 4, h: 5 },
  { i: 'chart_cost',           x: 4,  y: 11, w: 4, h: 5 },
  { i: 'panel_activity',       x: 8,  y: 11, w: 4, h: 5 },
  { i: 'chart_category',       x: 0,  y: 16, w: 12, h: 4 },
];

/** Default enabled widget IDs — all widgets on by default */
export const DEFAULT_ENABLED = DEFAULT_LAYOUT.map(l => l.i);

/** Merge registry defaults with a stored layout (user's saved positions) */
export function mergeLayout(storedLayout, enabledIds) {
  return storedLayout.filter(l => enabledIds.includes(l.i));
}

/** Get widget metadata from registry by id */
export function getWidgetMeta(id) {
  return WIDGET_REGISTRY.find(w => w.id === id) || null;
}

/** Category labels */
export const CATEGORIES = {
  kpi: 'KPI Cards',
  chart: 'Charts',
  panel: 'Information Panels',
};
