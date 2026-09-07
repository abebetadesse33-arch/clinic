"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useClinic } from "@/context/ClinicContext";
import {
  WIDGET_REGISTRY,
  WIDGET_COMPONENT_MAP,
  ROLE_DEFAULT_WIDGET_ORDER,
  WidgetShell,
} from "./WidgetRegistry";
import type { DashboardWidgetConfig, WidgetId } from "@/lib/types/clinical";
import DashboardLayoutCustomizer from "./DashboardLayoutCustomizer";
import { Settings, LayoutGrid, RefreshCw } from "lucide-react";

// ==========================================
// ACTIVE WIDGET CONFIG = registry config + layout overrides
// ==========================================
interface ActiveWidgetConfig extends DashboardWidgetConfig {
  isEnabled: boolean;
  displayOrder: number;
  colSpan: 1 | 2 | 3;
  rowSpan: 1 | 2;
  refreshIntervalSeconds: number;
}

export default function DynamicDashboardGrid() {
  const { currentRole, currentUser } = useClinic();
  const [activeWidgets, setActiveWidgets] = useState<ActiveWidgetConfig[]>([]);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Build widget list for the current role
  const buildWidgetList = useCallback((): ActiveWidgetConfig[] => {
    const orderedIds = ROLE_DEFAULT_WIDGET_ORDER[currentRole] ?? ["my_patients"];

    return orderedIds.map((wid: WidgetId, idx: number) => {
      const config = WIDGET_REGISTRY.find((w) => w.widgetId === wid);
      if (!config) return null;
      return {
        ...config,
        isEnabled: true,
        displayOrder: idx,
        colSpan: config.defaultColSpan,
        rowSpan: config.defaultRowSpan,
        refreshIntervalSeconds: config.refreshIntervalSeconds,
      } as ActiveWidgetConfig;
    }).filter(Boolean) as ActiveWidgetConfig[];
  }, [currentRole]);

  useEffect(() => {
    setActiveWidgets(buildWidgetList());
    setLastRefresh(new Date());
  }, [currentRole, buildWidgetList]);

  const handleLayoutChange = (updated: ActiveWidgetConfig[]) => {
    setActiveWidgets(updated);
    setCustomizerOpen(false);
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
    // Force re-render of widgets by rebuilding list
    setActiveWidgets([...buildWidgetList()]);
  };

  const isAdmin = currentRole === "tenant_admin" || currentRole === "system_admin";

  return (
    <div className="dynamic-dashboard">
      {/* Dashboard Toolbar */}
      <div className="dashboard-toolbar">
        <div className="dashboard-title">
          <LayoutGrid size={18} className="text-emerald-400" />
          <span className="text-sm font-medium text-white/70">
            {currentUser?.fullName ?? "Dashboard"} — Live View
          </span>
          <span className="dashboard-badge">{currentRole.replace(/_/g, " ").toUpperCase()}</span>
        </div>
        <div className="dashboard-actions">
          <span className="text-xs text-white/40">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            className="toolbar-btn"
            title="Refresh dashboard"
          >
            <RefreshCw size={14} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setCustomizerOpen(true)}
              className="toolbar-btn toolbar-btn-primary"
              title="Customize layout"
            >
              <Settings size={14} />
              <span>Customize</span>
            </button>
          )}
        </div>
      </div>

      {/* Widget Grid */}
      <div className="widget-grid">
        {activeWidgets
          .filter((w) => w.isEnabled)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((widget) => (
            <WidgetShell key={`${widget.widgetId}-${lastRefresh.getTime()}`} config={widget} />
          ))}
      </div>

      {/* Layout Customizer Drawer (Admin only) */}
      {customizerOpen && isAdmin && (
        <DashboardLayoutCustomizer
          role={currentRole}
          currentWidgets={activeWidgets}
          allWidgets={WIDGET_REGISTRY}
          onSave={handleLayoutChange}
          onClose={() => setCustomizerOpen(false)}
        />
      )}
    </div>
  );
}
