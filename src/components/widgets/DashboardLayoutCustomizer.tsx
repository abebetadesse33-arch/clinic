"use client";

import React, { useState } from "react";
import type { DashboardWidgetConfig, WidgetId, Role } from "@/lib/types/clinical";
import { X, GripVertical, Eye, EyeOff, Save, RotateCcw } from "lucide-react";

interface ActiveWidgetConfig extends DashboardWidgetConfig {
  isEnabled: boolean;
  displayOrder: number;
  colSpan: 1 | 2 | 3;
  rowSpan: 1 | 2;
  refreshIntervalSeconds: number;
}

interface DashboardLayoutCustomizerProps {
  role: Role;
  currentWidgets: ActiveWidgetConfig[];
  allWidgets: DashboardWidgetConfig[];
  onSave: (updated: ActiveWidgetConfig[]) => void;
  onClose: () => void;
}

export default function DashboardLayoutCustomizer({
  role,
  currentWidgets,
  allWidgets,
  onSave,
  onClose,
}: DashboardLayoutCustomizerProps) {
  const [localWidgets, setLocalWidgets] = useState<ActiveWidgetConfig[]>(
    // Merge current with all widgets that are allowed for this role
    allWidgets
      .filter((w) => w.allowedRoles.includes(role))
      .map((w, idx) => {
        const existing = currentWidgets.find((cw) => cw.widgetId === w.widgetId);
        return {
          ...w,
          isEnabled: existing?.isEnabled ?? false,
          displayOrder: existing?.displayOrder ?? idx + 100,
          colSpan: existing?.colSpan ?? w.defaultColSpan,
          rowSpan: existing?.rowSpan ?? w.defaultRowSpan,
          refreshIntervalSeconds: existing?.refreshIntervalSeconds ?? w.refreshIntervalSeconds,
        } as ActiveWidgetConfig;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder)
  );

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);

  const toggleWidget = (widgetId: WidgetId) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.widgetId === widgetId ? { ...w, isEnabled: !w.isEnabled } : w))
    );
  };

  const updateRefreshInterval = (widgetId: WidgetId, value: number) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.widgetId === widgetId ? { ...w, refreshIntervalSeconds: value } : w))
    );
  };

  const updateColSpan = (widgetId: WidgetId, value: 1 | 2 | 3) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.widgetId === widgetId ? { ...w, colSpan: value } : w))
    );
  };

  const handleDragStart = (idx: number) => setDragSourceIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (targetIdx: number) => {
    if (dragSourceIdx === null || dragSourceIdx === targetIdx) return;
    const reordered = [...localWidgets];
    const [moved] = reordered.splice(dragSourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    setLocalWidgets(
      reordered.map((w, i) => ({ ...w, displayOrder: i }))
    );
    setDragSourceIdx(null);
    setDragOverIdx(null);
  };

  const handleReset = () => {
    setLocalWidgets((prev) =>
      prev.map((w, idx) => ({
        ...w,
        isEnabled: currentWidgets.some((cw) => cw.widgetId === w.widgetId),
        displayOrder: idx,
        colSpan: w.defaultColSpan,
        rowSpan: w.defaultRowSpan,
        refreshIntervalSeconds: w.refreshIntervalSeconds,
      }))
    );
  };

  const enabledCount = localWidgets.filter((w) => w.isEnabled).length;

  const CATEGORY_COLORS: Record<string, string> = {
    clinical: "bg-blue-500/20 text-blue-300",
    pharmacy: "bg-purple-500/20 text-purple-300",
    therapy: "bg-green-500/20 text-green-300",
    diagnostics: "bg-amber-500/20 text-amber-300",
    social: "bg-pink-500/20 text-pink-300",
    admin: "bg-red-500/20 text-red-300",
    patient: "bg-cyan-500/20 text-cyan-300",
  };

  return (
    <div className="customizer-overlay" onClick={onClose}>
      <div
        className="customizer-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="customizer-header">
          <div>
            <h2 className="text-lg font-bold text-white">Layout Customizer</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {role.replace(/_/g, " ").toUpperCase()} — {enabledCount} active widgets
            </p>
          </div>
          <button onClick={onClose} className="toolbar-btn">
            <X size={18} />
          </button>
        </div>

        {/* Instructions */}
        <div className="customizer-hint">
          <span className="text-xs text-white/50">
            Drag to reorder · Toggle visibility · Adjust column width and refresh rate
          </span>
        </div>

        {/* Widget List */}
        <div className="customizer-list">
          {localWidgets.map((widget, idx) => (
            <div
              key={widget.widgetId}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              className={`customizer-item ${dragOverIdx === idx ? "customizer-item-drag-over" : ""} ${
                !widget.isEnabled ? "customizer-item-disabled" : ""
              }`}
            >
              {/* Drag Handle */}
              <GripVertical size={16} className="text-white/30 cursor-grab flex-shrink-0" />

              {/* Widget Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white truncate">{widget.displayName}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[widget.category] ?? "bg-white/10 text-white/50"}`}>
                    {widget.category}
                  </span>
                  {widget.isSystemWidget && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">system</span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-0.5 truncate">{widget.description}</p>

                {/* Controls */}
                {widget.isEnabled && (
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <label className="text-xs text-white/50 flex items-center gap-1">
                      Cols:
                      <select
                        value={widget.colSpan}
                        onChange={(e) => updateColSpan(widget.widgetId, parseInt(e.target.value) as 1 | 2 | 3)}
                        className="customizer-select"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </label>
                    <label className="text-xs text-white/50 flex items-center gap-1">
                      Refresh:
                      <select
                        value={widget.refreshIntervalSeconds}
                        onChange={(e) => updateRefreshInterval(widget.widgetId, parseInt(e.target.value))}
                        className="customizer-select"
                      >
                        <option value={10}>10s</option>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                        <option value={120}>2m</option>
                        <option value={300}>5m</option>
                        <option value={600}>10m</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleWidget(widget.widgetId)}
                className={`customizer-toggle ${widget.isEnabled ? "text-emerald-400" : "text-white/25"}`}
                title={widget.isEnabled ? "Disable widget" : "Enable widget"}
              >
                {widget.isEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="customizer-footer">
          <button onClick={handleReset} className="btn-ghost flex items-center gap-2">
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={() => onSave(localWidgets.filter((w) => w.isEnabled))}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={14} />
            Apply Layout
          </button>
        </div>
      </div>
    </div>
  );
}
