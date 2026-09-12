"use client";

import React, { useState, useEffect, useRef } from "react";

export interface DataStreamProps {
  lines: string[];
  speed?: number; // ms per character
  delay?: number; // ms before starting
  className?: string;
  onComplete?: () => void;
  loop?: boolean;
}

export function DataStream({
  lines,
  speed = 28,
  delay = 300,
  className = "",
  onComplete,
  loop = false,
}: DataStreamProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if reduced motion is requested
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setDisplayedLines(lines);
      setIsDone(true);
      onComplete?.();
      return;
    }

    const startTimer = setTimeout(() => {
      typeNextChar();
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lines, delay]);

  const typeNextChar = () => {
    if (currentLineIndex >= lines.length) {
      setIsDone(true);
      onComplete?.();
      if (loop) {
        timerRef.current = setTimeout(() => {
          setDisplayedLines([]);
          setCurrentLineIndex(0);
          setCurrentCharIndex(0);
          setIsDone(false);
          typeNextChar();
        }, 3000);
      }
      return;
    }

    const currentLine = lines[currentLineIndex];
    if (currentCharIndex < currentLine.length) {
      const char = currentLine[currentCharIndex];
      setDisplayedLines((prev) => {
        const next = [...prev];
        if (!next[currentLineIndex]) next[currentLineIndex] = "";
        next[currentLineIndex] += char;
        return next;
      });
      setCurrentCharIndex((c) => c + 1);
      timerRef.current = setTimeout(typeNextChar, speed);
    } else {
      // Move to next line
      setCurrentLineIndex((l) => l + 1);
      setCurrentCharIndex(0);
      timerRef.current = setTimeout(typeNextChar, speed * 4);
    }
  };

  return (
    <div
      className={`font-mono text-xs leading-relaxed text-cyan-400 select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="sr-only">{lines.join(" ")}</div>
      <div aria-hidden="true" className="space-y-0.5">
        {displayedLines.map((line, idx) => (
          <div key={idx} className="flex items-center">
            <span className="opacity-60 text-cyan-600 mr-1.5">&gt;</span>
            <span>{line}</span>
            {idx === currentLineIndex && !isDone && (
              <span className="inline-block w-2 h-3.5 bg-cyan-400 ml-1 animate-pulse" />
            )}
          </div>
        ))}
        {!isDone && displayedLines.length === 0 && (
          <div className="flex items-center">
            <span className="opacity-60 text-cyan-600 mr-1.5">&gt;</span>
            <span className="inline-block w-2 h-3.5 bg-cyan-400 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

export default DataStream;
