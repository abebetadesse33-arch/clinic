"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDynamicResource } from "@/hooks/useDynamicResource";
import { DynamicIcon } from "./DynamicIcon";
import { useRouter } from "next/navigation";

export interface ActionConfig {
  id: string;
  pageKey: string;
  actionKey: string;
  label: string;
  icon?: string | null;
  actionType: "link" | "api_call" | "modal" | "download" | "webhook";
  href?: string | null;
  apiEndpoint?: string | null;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "accent";
  requiredPermission?: string | null;
}

export interface DynamicActionButtonProps {
  pageKey: string;
  actionKey: string;
  action?: ActionConfig; // optional preloaded
  onActionComplete?: (result: any) => void;
  onOpenModal?: (actionKey: string) => void;
  className?: string;
}

export function DynamicActionButton({
  pageKey,
  actionKey,
  action: preloadedAction,
  onActionComplete,
  onOpenModal,
  className = "",
}: DynamicActionButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { data: fetchedAction, isLoading: isResourceLoading } = useDynamicResource<ActionConfig>(
    "actions",
    { page: pageKey, action: actionKey },
    { enabled: !preloadedAction }
  );

  const action = preloadedAction || fetchedAction;

  if (isResourceLoading && !preloadedAction) {
    return <div className="h-9 w-24 rounded-xl bg-slate-800/60 animate-pulse" />;
  }

  if (!action) return null;

  const handleClick = async () => {
    switch (action.actionType) {
      case "link":
        if (action.href) {
          if (action.href.startsWith("http")) {
            window.open(action.href, "_blank");
          } else {
            router.push(action.href);
          }
        }
        break;

      case "download":
        if (action.href) {
          const a = document.createElement("a");
          a.href = action.href;
          a.download = "";
          a.click();
        }
        break;

      case "modal":
        onOpenModal?.(action.actionKey);
        break;

      case "api_call":
      case "webhook":
        if (!action.apiEndpoint) return;
        try {
          setIsLoading(true);
          const res = await fetch(action.apiEndpoint, {
            method: action.method || "POST",
            headers: { "Content-Type": "application/json" },
          });
          const json = await res.json();
          onActionComplete?.(json);
        } catch (err) {
          console.error(`[DynamicActionButton] API error on ${action.apiEndpoint}:`, err);
        } finally {
          setIsLoading(false);
        }
        break;
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={action.variant || "default"}
      isLoading={isLoading}
      className={`space-x-2 ${className}`}
    >
      {action.icon && <DynamicIcon name={action.icon} className="w-3.5 h-3.5" />}
      <span>{action.label}</span>
    </Button>
  );
}
