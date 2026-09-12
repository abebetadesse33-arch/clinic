/**
 * HudTab — Tab bar with sliding neon indicator
 * The indicator position is computed from the active tab's DOM position.
 */
"use client";

import React, { useState, useRef, useEffect, type ReactNode } from "react";
import { clsx } from "clsx";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface HudTabProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function HudTab({ tabs, activeTab, onChange, className }: HudTabProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!barRef.current) return;
    const activeEl = barRef.current.querySelector<HTMLButtonElement>(
      `[data-tab-id="${activeTab}"]`
    );
    if (activeEl) {
      const barRect = barRef.current.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      setIndicator({
        left: elRect.left - barRect.left,
        width: elRect.width,
      });
    }
  }, [activeTab, tabs]);

  return (
    <div
      ref={barRef}
      className={clsx("hud-tab-bar", className)}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          data-tab-id={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={clsx("hud-tab", activeTab === tab.id && "active")}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}

      {/* Sliding neon indicator */}
      <div
        className="hud-tab-indicator"
        aria-hidden="true"
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />
    </div>
  );
}

export default HudTab;
