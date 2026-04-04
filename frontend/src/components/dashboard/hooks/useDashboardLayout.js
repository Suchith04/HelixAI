/**
 * useDashboardLayout — persistence hook
 *
 * Loads/saves the dashboard layout and enabled widget list.
 * Storage: localStorage (immediate, no network) — expandable to backend later.
 *
 * Keys:
 *  - helix_dash_layout    → JSON array of RGL layout items
 *  - helix_dash_enabled   → JSON array of enabled widget IDs
 */

import { useState, useCallback } from 'react';
import { DEFAULT_LAYOUT, DEFAULT_ENABLED } from '../widgetRegistry';

const LAYOUT_KEY   = 'helix_dash_layout';
const ENABLED_KEY  = 'helix_dash_enabled';

function loadFromStorage() {
  try {
    const layout  = JSON.parse(localStorage.getItem(LAYOUT_KEY));
    const enabled = JSON.parse(localStorage.getItem(ENABLED_KEY));
    return {
      layout:  Array.isArray(layout)  ? layout  : null,
      enabled: Array.isArray(enabled) ? enabled : null,
    };
  } catch {
    return { layout: null, enabled: null };
  }
}

export function useDashboardLayout() {
  const saved = loadFromStorage();

  const [layout, setLayout]   = useState(saved.layout  || DEFAULT_LAYOUT);
  const [enabled, setEnabled] = useState(saved.enabled || DEFAULT_ENABLED);

  const saveLayout = useCallback((newLayout) => {
    setLayout(newLayout);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(newLayout));
  }, []);

  const saveEnabled = useCallback((newEnabled) => {
    setEnabled(newEnabled);
    localStorage.setItem(ENABLED_KEY, JSON.stringify(newEnabled));

    // Add missing widget positions for newly enabled widgets
    setLayout(prev => {
      const existing = new Set(prev.map(l => l.i));
      const additions = newEnabled
        .filter(id => !existing.has(id))
        .map((id, idx) => ({
          i: id, x: (idx * 4) % 12, y: Infinity, w: 4, h: 4,
        }));
      if (additions.length === 0) return prev;
      const merged = [...prev, ...additions];
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
    setEnabled(DEFAULT_ENABLED);
    localStorage.removeItem(LAYOUT_KEY);
    localStorage.removeItem(ENABLED_KEY);
  }, []);

  const toggleWidget = useCallback((id) => {
    setEnabled(prev => {
      const next = prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id];
      localStorage.setItem(ENABLED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { layout, enabled, saveLayout, saveEnabled, resetToDefault, toggleWidget };
}
