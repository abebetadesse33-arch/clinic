"use client";

import React from "react";
import { useDynamicResource } from "@/hooks/useDynamicResource";

export interface PageContentRecord {
  id: string;
  pageKey: string;
  sectionKey: string;
  contentType: "text" | "html" | "markdown" | "json";
  content: any;
  language: string;
  version: number;
}

export interface DynamicContentProps {
  pageKey: string;
  sectionKey: string;
  language?: string;
  fallback?: React.ReactNode;
  className?: string;
}

export function DynamicContent({
  pageKey,
  sectionKey,
  language = "en",
  fallback,
  className = "",
}: DynamicContentProps) {
  const { data: contentRecord, isLoading, error } = useDynamicResource<PageContentRecord | null>(
    "content",
    {
      page: pageKey,
      section: sectionKey,
      language,
    }
  );

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-2 py-4 ${className}`}>
        <div className="h-4 bg-slate-800/80 rounded w-3/4" />
        <div className="h-4 bg-slate-800/60 rounded w-1/2" />
      </div>
    );
  }

  if (error || !contentRecord || !contentRecord.content) {
    return <>{fallback || null}</>;
  }

  const { contentType, content } = contentRecord;

  if (contentType === "html") {
    const rawHtml = typeof content === "string" ? content : content.html || "";
    return (
      <div
        className={`prose prose-invert max-w-none text-slate-300 text-xs leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
    );
  }

  if (contentType === "markdown" || contentType === "text") {
    const textContent = typeof content === "string" ? content : content.text || JSON.stringify(content);
    return (
      <div className={`text-xs text-slate-300 whitespace-pre-wrap leading-relaxed ${className}`}>
        {textContent}
      </div>
    );
  }

  // JSON or structured object
  if (typeof content === "object") {
    if (content.title || content.body) {
      return (
        <div className={`space-y-1.5 ${className}`}>
          {content.title && <h4 className="text-sm font-bold text-white">{content.title}</h4>}
          {content.subtitle && <p className="text-xs text-teal-400 font-medium">{content.subtitle}</p>}
          {content.body && <p className="text-xs text-slate-300 leading-relaxed">{content.body}</p>}
        </div>
      );
    }
  }

  return (
    <div className={`text-xs text-slate-300 ${className}`}>
      {typeof content === "string" ? content : JSON.stringify(content)}
    </div>
  );
}
