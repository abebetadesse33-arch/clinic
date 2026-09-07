"use client";

import React, { useState } from "react";
import { MediaAssetRecord } from "../lib/types/clinical";
import {
  Activity,
  AudioWaveform,
  CheckCircle2,
  Dna,
  Eye,
  FileText,
  Film,
  HeartPulse,
  Layers,
  Maximize2,
  Mic,
  Music,
  Play,
  Pause,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Volume2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface MultimodalMediaViewerProps {
  assets: MediaAssetRecord[];
  onUploadClick?: () => void;
}

export default function MultimodalMediaViewer({ assets, onUploadClick }: MultimodalMediaViewerProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || "");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedLead, setSelectedLead] = useState<"II" | "V1" | "V5">("II");

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  if (!selectedAsset) {
    return (
      <div className="glass-card p-12 text-center rounded-2xl border border-slate-800">
        <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white">No Multimodal Media Assets Found</h3>
        <p className="text-xs text-slate-400 mt-1">Upload an image, audio auscultation, ECG signal, or genomic VCF file.</p>
        {onUploadClick && (
          <button
            onClick={onUploadClick}
            className="mt-4 px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
          >
            Upload Media Asset
          </button>
        )}
      </div>
    );
  }

  const getModalityBadge = (modality: string) => {
    switch (modality) {
      case "xray":
      case "ct":
      case "mri":
      case "dermatology_photo":
        return { label: "Radiology / Imaging", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" };
      case "auscultation_heart":
      case "auscultation_lung":
      case "speech_audio":
        return { label: "Acoustic / Audio", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" };
      case "ecg_signal":
      case "eeg_signal":
      case "wearable_timeseries":
        return { label: "Bioelectric Signal", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
      case "vcf_genomic":
        return { label: "Genomic VCF", color: "bg-teal-500/20 text-teal-300 border-teal-500/40" };
      case "gait_video":
      case "movement_video":
        return { label: "Video Kinematics", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
      default:
        return { label: "Clinical Document", color: "bg-slate-500/20 text-slate-300 border-slate-500/40" };
    }
  };

  const badge = getModalityBadge(selectedAsset.modality);

  return (
    <div className="space-y-4">
      {/* Top Assets Selector Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {assets.map((asset) => {
          const isSelected = asset.id === selectedAssetId;
          const b = getModalityBadge(asset.modality);
          return (
            <button
              key={asset.id}
              onClick={() => {
                setSelectedAssetId(asset.id);
                setIsPlayingAudio(false);
                setZoomLevel(100);
              }}
              className={`p-3 rounded-xl border text-left min-w-[200px] max-w-[240px] transition-all flex-shrink-0 ${
                isSelected
                  ? "bg-teal-500/20 border-teal-500 text-white shadow-lg shadow-teal-900/30"
                  : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className={`px-2 py-0.5 rounded-full border font-bold uppercase ${b.color}`}>
                  {asset.type}
                </span>
                <span className="text-slate-500">{new Date(asset.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className="text-xs font-bold text-white truncate">{asset.title}</h4>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{asset.modality.replace("_", " ")}</p>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Modality Inspector Canvas */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        {/* Title and Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                {badge.label}
              </span>
              <h3 className="text-sm font-bold text-white">{selectedAsset.title}</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              MIME: <span className="font-mono text-slate-300">{selectedAsset.mimeType}</span> • Size: {selectedAsset.fileSizeKb || 240} KB • Modality: {selectedAsset.modality}
            </p>
          </div>

          {selectedAsset.confidenceScore && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Specialized AI Extractor: {selectedAsset.confidenceScore}% Confidence
            </div>
          )}
        </div>

        {/* MODALITY 1: IMAGING (X-RAY / DERMATOLOGY / CT) */}
        {selectedAsset.type === "image" && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl bg-black border border-slate-800 flex items-center justify-center min-h-[320px] max-h-[440px]">
              <img
                src={selectedAsset.fileUrl}
                alt={selectedAsset.title}
                style={{ transform: `scale(${zoomLevel / 100})`, transition: "transform 0.2s ease" }}
                className="max-h-[400px] object-contain select-none"
              />

              {/* Floating Image Tools */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono font-bold text-white px-1">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 25, 200))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALITY 2: AUDIO (AUSCULTATION / SPEECH) */}
        {selectedAsset.type === "audio" && (
          <div className="space-y-4 p-4 rounded-xl bg-slate-900/90 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="w-12 h-12 rounded-2xl bg-purple-500 hover:bg-purple-400 text-slate-950 flex items-center justify-center shadow-lg shadow-purple-900/40 transition-all hover:scale-105"
                >
                  {isPlayingAudio ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {selectedAsset.modality === "auscultation_lung"
                      ? "Bilateral Pulmonary Auscultation Acoustic Stream"
                      : "Stethoscope Heart Sound Recording (Phonocardiogram)"}
                  </h4>
                  <span className="text-[10px] text-purple-300 font-mono">
                    {isPlayingAudio ? "PLAYING AUDIO WAVEFORM (44.1 kHz, 16-bit PCM)" : "AUDIO PAUSED • CLICK TO PLAY"}
                  </span>
                </div>
              </div>
              <Volume2 className="w-5 h-5 text-purple-400" />
            </div>

            {/* Simulated Dynamic Audio Waveform Visualizer */}
            <div className="h-20 bg-slate-950 rounded-xl p-3 flex items-center justify-between gap-1 border border-slate-800">
              {Array.from({ length: 48 }).map((_, idx) => {
                const height = isPlayingAudio
                  ? Math.sin(idx * 0.4 + Date.now() * 0.005) * 30 + 35 + (idx % 3) * 10
                  : Math.sin(idx * 0.3) * 15 + 20;
                return (
                  <div
                    key={idx}
                    style={{ height: `${Math.max(6, Math.min(65, height))}px` }}
                    className={`w-1.5 rounded-full transition-all duration-150 ${
                      isPlayingAudio ? "bg-gradient-to-t from-purple-500 to-teal-400" : "bg-slate-700"
                    }`}
                  />
                );
              })}
            </div>

            {/* Acoustic Feature Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Dominant Frequency</span>
                <span className="font-bold text-white font-mono">120 - 450 Hz</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Acoustic Murmur / Crackle</span>
                <span className="font-bold text-rose-400">Fine End-Inspiratory Crackles</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Affect Prosody Index</span>
                <span className="font-bold text-purple-300">Depressed Mood Pitch Flattening</span>
              </div>
            </div>
          </div>
        )}

        {/* MODALITY 3: BIOELECTRIC SIGNAL (12-LEAD ECG STRIP) */}
        {selectedAsset.type === "signal" && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h4 className="text-xs font-bold text-white">12-Lead Diagnostic ECG Rhythm Strip (25 mm/s, 10 mm/mV)</h4>
              </div>
              {/* Lead Selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(["II", "V1", "V5"] as const).map((lead) => (
                  <button
                    key={lead}
                    onClick={() => setSelectedLead(lead)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      selectedLead === lead ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Lead {lead}
                  </button>
                ))}
              </div>
            </div>

            {/* Calibrated Pink ECG Grid with SVG Waveform */}
            <div className="relative h-44 bg-[#140b0d] rounded-xl border border-rose-950 overflow-hidden flex items-center justify-center">
              {/* ECG Grid Background */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #f43f5e 1px, transparent 1px), linear-gradient(to bottom, #f43f5e 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #f43f5e 1px, transparent 1px), linear-gradient(to bottom, #f43f5e 1px, transparent 1px)",
                  backgroundSize: "4px 4px",
                }}
              />

              {/* Vector ECG Waveform */}
              <svg className="w-full h-full relative z-10" viewBox="0 0 800 160" preserveAspectRatio="none">
                <path
                  d="M 0 80 L 40 80 Q 50 72 60 80 L 80 80 L 85 85 L 95 10 L 105 130 L 115 80 L 140 80 Q 160 60 180 80 L 240 80 Q 250 72 260 80 L 280 80 L 285 85 L 295 10 L 305 130 L 315 80 L 340 80 Q 360 60 380 80 L 440 80 Q 450 72 460 80 L 480 80 L 485 85 L 495 10 L 505 130 L 515 80 L 540 80 Q 560 60 580 80 L 640 80 Q 650 72 660 80 L 680 80 L 685 85 L 695 10 L 705 130 L 715 80 L 740 80 Q 760 60 780 80 L 800 80"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute top-2 left-3 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-sky-400">
                Lead {selectedLead} • HR: 78 bpm • PR: 168 ms • QRS: 92 ms • QTc: 435 ms
              </div>
            </div>

            {/* Bioelectric Interpretation Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Rhythm</span>
                <span className="font-bold text-white">Normal Sinus Rhythm</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Voltage Criteria</span>
                <span className="font-bold text-amber-400">Sokolow-Lyon LVH Positive</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ST-T Wave Changes</span>
                <span className="font-bold text-emerald-300">No Acute Elevation</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">QTc Interval</span>
                <span className="font-bold text-white font-mono">435 ms (Normal &lt;450)</span>
              </div>
            </div>
          </div>
        )}

        {/* MODALITY 4: GENOMIC VCF (PHARMACOGENOMICS) */}
        {selectedAsset.type === "genomic" && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/90 border border-teal-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dna className="w-5 h-5 text-teal-400" />
                <h4 className="text-xs font-bold text-white">Targeted Pharmacogenomic VCF Variant Panel</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono font-bold">
                CPIC Level 1A Actionable
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="pb-2">Gene</th>
                    <th className="pb-2">Variant (Allele)</th>
                    <th className="pb-2">Metabolizer Phenotype</th>
                    <th className="pb-2">Clinical Action & Guideline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-mono font-bold text-teal-300">CYP2C19</td>
                    <td className="py-2.5 font-mono text-white">*2/*2 (c.681G&gt;A)</td>
                    <td className="py-2.5 font-bold text-rose-400">Poor Metabolizer (Loss of Function)</td>
                    <td className="py-2.5 text-slate-300 text-[11px]">
                      Avoid Clopidogrel (Plavix); switch to Prasugrel or Ticagrelor (CPIC Level 1A).
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-mono font-bold text-teal-300">SLCO1B1</td>
                    <td className="py-2.5 font-mono text-white">*5/*1 (c.521T&gt;C)</td>
                    <td className="py-2.5 font-semibold text-amber-300">Intermediate Transporter Function</td>
                    <td className="py-2.5 text-slate-300 text-[11px]">
                      Increased simvastatin myopathy risk; cap simvastatin at 20mg or switch to rosuvastatin.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODALITY 5: VIDEO KINEMATICS (GAIT & MOVEMENT) */}
        {selectedAsset.type === "video" && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-amber-400" />
                <h4 className="text-xs font-bold text-white">Clinical Video Gait & Movement Kinematics</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                Automated Pose Kinematics
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
              <div className="text-center p-6 space-y-2">
                <Film className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
                <h5 className="text-xs font-bold text-white">30-Second Timed Up and Go (TUG) Video Recording</h5>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  Pose tracking model detected symmetric stride length (0.62 m), step cadence 96 steps/min, and no freezing of gait.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pre-processed Feature Summary Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <strong className="text-teal-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Pre-Processed Feature Extraction for Gemini Orchestrator:
            </strong>
            <span className="text-[10px] text-slate-500">Asset ID: {selectedAsset.id}</span>
          </div>
          <p className="text-slate-200 leading-relaxed">{selectedAsset.preprocessedSummary || "Standard clinical data capture."}</p>
        </div>
      </div>
    </div>
  );
}
