"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Star,
  Globe,
  Pill,
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Youtube,
  Sparkles,
  Loader2,
  BookOpen,
  Heart,
  Activity,
} from "lucide-react";

interface VideoScene {
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  narrationText: string;
  visualGraphicType: string;
  keyBulletPoints: string[];
  calloutBadge?: string;
  svgMarkup?: string;
  backgroundGradient?: string;
  accentColor?: string;
}

interface EducationVideo {
  id: string;
  title: string;
  description?: string;
  language: string;
  icd10Codes?: string[];
  relatedMedications?: string[];
  scriptContent?: string;
  animationData?: string;
  status: string;
  createdAt?: string;
}

interface CuratedVideo {
  video: {
    id: string;
    title: string;
    channelName: string;
    url: string;
    thumbnailUrl: string;
    durationSeconds: number;
    language: string;
    qualityScore: number;
    tags: string[];
    patientRatingAvg?: number;
    externalId: string;
  };
  relevanceScore: number;
  matchedCriteria: string[];
}

interface DrugInteraction {
  drugA: string;
  drugB: string;
  severity: string;
  plainLanguage: string;
  managementRecommendation: string;
}

interface SideEffect {
  effectName: string;
  frequency: string;
  severity: string;
  plainLanguage: string;
  onsetTypical: string;
  managementTip: string;
  requiresImmediateAttention: boolean;
}

interface MedReview {
  overallRiskScore: "high" | "moderate" | "low";
  plainLanguageSummary: string;
  priorityWarnings: string[];
  interactions: DrugInteraction[];
  foodInteractions: { drug: string; food: string; severity: string; plainLanguage: string }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  contraindicated: "bg-red-900/40 border-red-700 text-red-300",
  major: "bg-orange-900/40 border-orange-700 text-orange-300",
  moderate: "bg-yellow-900/40 border-yellow-700 text-yellow-300",
  minor: "bg-blue-900/40 border-blue-700 text-blue-300",
};

const FREQ_BADGE: Record<string, string> = {
  very_common: "bg-red-500/20 text-red-300",
  common: "bg-orange-500/20 text-orange-300",
  uncommon: "bg-yellow-500/20 text-yellow-300",
  rare: "bg-blue-500/20 text-blue-300",
  very_rare: "bg-purple-500/20 text-purple-300",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── AI Video Player ──────────────────────────────────────────────────────────
function AIVideoPlayer({ script, animationScenes }: { script: { scenes: VideoScene[]; title: string }; animationScenes: VideoScene[] }) {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const scene = animationScenes[currentScene] || script.scenes[currentScene];
  const totalScenes = Math.max(animationScenes.length, script.scenes.length);

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setElapsed(0);
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        const duration = scene?.durationSeconds || 30;
        if (e >= duration) {
          if (currentScene < totalScenes - 1) {
            setCurrentScene((c) => c + 1);
            return 0;
          } else {
            setIsPlaying(false);
            return duration;
          }
        }
        return e + 0.5;
      });
    }, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, currentScene, scene, totalScenes]);

  const progress = scene ? (elapsed / scene.durationSeconds) * 100 : 0;
  const bg = scene?.backgroundGradient || "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";
  const accent = scene?.accentColor || "#3498db";

  return (
    <div className="rounded-2xl overflow-hidden border border-[#2d2d4e] shadow-2xl">
      {/* Video canvas */}
      <div
        className="relative aspect-video flex items-center justify-center"
        style={{ background: bg }}
      >
        {/* SVG Graphic */}
        <div className="w-1/2 h-full flex items-center justify-center p-6">
          {scene?.svgMarkup ? (
            <div dangerouslySetInnerHTML={{ __html: scene.svgMarkup }} className="w-full h-full" />
          ) : (
            <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: `${accent}30` }}>
              <Activity className="w-16 h-16" style={{ color: accent }} />
            </div>
          )}
        </div>

        {/* Text overlay */}
        <div className="w-1/2 p-6">
          <div
            className="inline-block text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md mb-3"
            style={{ background: `${accent}30`, color: accent }}
          >
            {scene?.calloutBadge || `Scene ${(scene?.sceneNumber || currentScene + 1)}`}
          </div>
          <h3 className="text-white font-bold text-lg mb-3 leading-snug">{scene?.title}</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">
            {scene?.narrationText?.slice(0, 200)}
            {(scene?.narrationText?.length || 0) > 200 && "…"}
          </p>
          <ul className="space-y-1.5">
            {(scene?.keyBulletPoints || []).map((bp, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accent }} />
                {bp}
              </li>
            ))}
          </ul>
        </div>

        {/* Scene number badge */}
        <div className="absolute top-3 left-3 text-xs text-gray-500">
          Scene {currentScene + 1} of {totalScenes}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#2d2d4e]">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, background: accent }}
        />
      </div>

      {/* Controls */}
      <div className="bg-[#1a1a2e] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setCurrentScene((c) => Math.max(0, c - 1))}
          disabled={currentScene === 0}
          className="p-1.5 rounded-lg bg-[#2d2d4e] disabled:opacity-30 text-white hover:bg-[#3d3d5e] transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all"
          style={{ background: accent }}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          onClick={() => setCurrentScene((c) => Math.min(totalScenes - 1, c + 1))}
          disabled={currentScene === totalScenes - 1}
          className="p-1.5 rounded-lg bg-[#2d2d4e] disabled:opacity-30 text-white hover:bg-[#3d3d5e] transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 rounded-lg bg-[#2d2d4e] text-white hover:bg-[#3d3d5e] transition-all ml-auto">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Scene dots */}
        <div className="flex gap-1.5 mx-auto">
          {Array.from({ length: totalScenes }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentScene(i); setElapsed(0); }}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === currentScene ? accent : "#2d2d4e" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PatientEducationPage() {
  const [tab, setTab] = useState<"videos" | "medications" | "curated">("videos");
  const [language, setLanguage] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<{ scenes: VideoScene[]; title: string } | null>(null);
  const [animationScenes, setAnimationScenes] = useState<VideoScene[]>([]);
  const [medReview, setMedReview] = useState<MedReview | null>(null);
  const [sideEffects, setSideEffects] = useState<Record<string, SideEffect[]>>({});
  const [curatedVideos, setCuratedVideos] = useState<CuratedVideo[]>([]);
  const [isLoadingCurated, setIsLoadingCurated] = useState(false);
  const [isLoadingMeds, setIsLoadingMeds] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    diagnosis: "",
    icd10: "",
    medications: "",
    patientName: "Patient",
    age: 45,
  });

  const loadCuratedVideos = async () => {
    setIsLoadingCurated(true);
    try {
      const params = new URLSearchParams({ language, maxResults: "6", minQuality: "75" });
      if (generateForm.icd10) params.set("icd10", generateForm.icd10);
      if (generateForm.medications) params.set("medications", generateForm.medications);
      const res = await fetch(`/api/v1/video-recommendations?${params}`);
      const data = await res.json();
      setCuratedVideos(data.recommendations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCurated(false);
    }
  };

  const generateScript = async () => {
    if (!generateForm.diagnosis) return;
    setIsGenerating(true);
    try {
      const meds = generateForm.medications
        ? generateForm.medications.split(",").map((m) => ({ name: m.trim(), dosage: "", frequency: "" }))
        : [];
      const res = await fetch("/api/v1/patients/demo-patient/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...generateForm,
          medications: meds,
          language,
          tenantId: "00000000-0000-0000-0000-000000000001",
        }),
      });
      const data = await res.json();
      if (data.script) {
        setGeneratedScript(data.script);
        setAnimationScenes(data.animationScenes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const runMedReview = async () => {
    if (!generateForm.medications) return;
    setIsLoadingMeds(true);
    try {
      const meds = generateForm.medications.split(",").map((m) => m.trim());
      const res = await fetch("/api/v1/medications/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medications: meds }),
      });
      const data = await res.json();
      setMedReview(data.review || null);
      setSideEffects(data.sideEffectsByDrug || {});
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMeds(false);
    }
  };

  useEffect(() => {
    if (tab === "curated") loadCuratedVideos();
  }, [tab, language]);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#12122a] border-b border-[#2d2d4e] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Patient Education Center</h1>
                <p className="text-gray-400 text-xs">AI-powered health videos & medication counseling</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-[#2d2d4e] border border-[#3d3d5e] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              >
                <option value="en">English</option>
                <option value="am">አማርኛ</option>
                <option value="om">Afaan Oromoo</option>
                <option value="ti">ትግርኛ</option>
                <option value="so">Af-Soomaali</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { id: "videos" as const, label: "AI Video Explainer", icon: Sparkles },
              { id: "medications" as const, label: "Medication Interactions", icon: Pill },
              { id: "curated" as const, label: "Health Video Library", icon: Youtube },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#2d2d4e]"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* ── AI Video Generator Tab ── */}
        {tab === "videos" && (
          <div className="space-y-6">
            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Generate AI Patient Education Video
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Primary Diagnosis *</label>
                  <input
                    value={generateForm.diagnosis}
                    onChange={(e) => setGenerateForm((f) => ({ ...f, diagnosis: e.target.value }))}
                    placeholder="e.g. Type 2 Diabetes Mellitus"
                    className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">ICD-10 Code</label>
                  <input
                    value={generateForm.icd10}
                    onChange={(e) => setGenerateForm((f) => ({ ...f, icd10: e.target.value }))}
                    placeholder="e.g. E11.9"
                    className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Medications (comma-separated)</label>
                  <input
                    value={generateForm.medications}
                    onChange={(e) => setGenerateForm((f) => ({ ...f, medications: e.target.value }))}
                    placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
                    className="w-full bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={generateScript}
                disabled={isGenerating || !generateForm.diagnosis}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generating Script with Gemini AI…</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Generate 4-Scene Video</>
                )}
              </button>
            </div>

            {generatedScript && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-white">{generatedScript.title}</h2>
                <AIVideoPlayer
                  script={generatedScript}
                  animationScenes={animationScenes.length > 0 ? animationScenes : generatedScript.scenes}
                />
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {generatedScript.scenes.map((scene) => (
                    <div key={scene.sceneNumber} className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600/30 flex items-center justify-center text-xs font-bold text-blue-300">
                          {scene.sceneNumber}
                        </div>
                        <h4 className="text-sm font-semibold text-white">{scene.title}</h4>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{scene.narrationText.slice(0, 150)}…</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Medication Interactions Tab ── */}
        {tab === "medications" && (
          <div className="space-y-6">
            <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Pill className="w-5 h-5 text-green-400" />
                Multi-Vector Medication Safety Check
              </h2>
              <div className="flex gap-3">
                <input
                  value={generateForm.medications}
                  onChange={(e) => setGenerateForm((f) => ({ ...f, medications: e.target.value }))}
                  placeholder="Enter medications separated by commas (e.g. warfarin, aspirin)"
                  className="flex-1 bg-[#12122a] border border-[#2d2d4e] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={runMedReview}
                  disabled={isLoadingMeds || !generateForm.medications}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  {isLoadingMeds ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Check
                </button>
              </div>
            </div>

            {medReview && (
              <>
                {/* Risk Score Banner */}
                <div className={`rounded-2xl p-5 border ${
                  medReview.overallRiskScore === "high"
                    ? "bg-red-900/20 border-red-700"
                    : medReview.overallRiskScore === "moderate"
                    ? "bg-yellow-900/20 border-yellow-700"
                    : "bg-green-900/20 border-green-700"
                }`}>
                  <div className="flex items-start gap-3">
                    {medReview.overallRiskScore === "high" ? (
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                    ) : medReview.overallRiskScore === "moderate" ? (
                      <Info className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className={`font-bold text-sm mb-1 ${
                        medReview.overallRiskScore === "high" ? "text-red-300" : medReview.overallRiskScore === "moderate" ? "text-yellow-300" : "text-green-300"
                      }`}>
                        Overall Risk: {medReview.overallRiskScore.toUpperCase()}
                      </div>
                      <p className="text-gray-300 text-sm">{medReview.plainLanguageSummary}</p>
                    </div>
                  </div>
                  {medReview.priorityWarnings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {medReview.priorityWarnings.map((w, i) => (
                        <div key={i} className="text-sm text-gray-200 bg-black/20 rounded-lg px-3 py-2">{w}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DDI List */}
                {medReview.interactions.length > 0 && (
                  <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 text-white">Drug-Drug Interactions</h3>
                    <div className="space-y-3">
                      {medReview.interactions.map((int, i) => (
                        <div key={i} className={`rounded-xl p-4 border ${SEVERITY_COLORS[int.severity] || "bg-gray-900/40 border-gray-700 text-gray-300"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">{int.drugA}</span>
                            <span className="text-gray-500">+</span>
                            <span className="font-bold text-sm">{int.drugB}</span>
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold uppercase ${SEVERITY_COLORS[int.severity]}`}>
                              {int.severity}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{int.plainLanguage}</p>
                          <div className="text-xs opacity-75">
                            <span className="font-semibold">Management: </span>{int.managementRecommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Food Interactions */}
                {medReview.foodInteractions.length > 0 && (
                  <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 text-white">Drug-Food Interactions</h3>
                    <div className="space-y-3">
                      {medReview.foodInteractions.map((fi, i) => (
                        <div key={i} className={`rounded-xl p-4 border ${SEVERITY_COLORS[fi.severity] || "bg-gray-900/40 border-gray-700 text-gray-300"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">{fi.drug}</span>
                            <span className="text-gray-500">+</span>
                            <span className="text-sm">{fi.food}</span>
                          </div>
                          <p className="text-sm">{fi.plainLanguage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Side Effects */}
                {Object.entries(sideEffects).length > 0 && (
                  <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 text-white">Side Effect Profiles</h3>
                    {Object.entries(sideEffects).map(([drug, effects]) => (
                      <div key={drug} className="mb-6">
                        <h4 className="text-blue-300 font-medium text-sm mb-3 capitalize">{drug}</h4>
                        <div className="space-y-2">
                          {effects.map((se, i) => (
                            <div key={i} className={`rounded-lg p-3 ${se.requiresImmediateAttention ? "border border-red-700 bg-red-900/20" : "bg-[#12122a]"}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white">{se.effectName}</span>
                                {se.requiresImmediateAttention && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${FREQ_BADGE[se.frequency] || "bg-gray-500/20 text-gray-300"}`}>
                                  {se.frequency.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mb-1">{se.plainLanguage}</p>
                              <p className="text-xs text-blue-400">💡 {se.managementTip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Curated Videos Tab ── */}
        {tab === "curated" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-400" />
                Clinician-Approved Health Videos
              </h2>
              <button
                onClick={loadCuratedVideos}
                className="px-4 py-2 bg-[#2d2d4e] hover:bg-[#3d3d5e] text-white rounded-lg text-sm transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {isLoadingCurated ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {curatedVideos.map(({ video, relevanceScore, matchedCriteria }) => (
                  <div
                    key={video.id}
                    className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-2xl overflow-hidden hover:border-[#4d4d6e] transition-all group"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/480x270/1a1a2e/3d3d5e?text=${encodeURIComponent(video.channelName)}`;
                        }}
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                        {formatDuration(video.durationSeconds)}
                      </div>
                      <div className="absolute top-2 left-2 bg-green-600/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                        ✓ Approved
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2 leading-snug">{video.title}</h3>
                      <p className="text-xs text-gray-500 mb-3">{video.channelName}</p>

                      <div className="flex items-center gap-2 mb-3">
                        {video.patientRatingAvg && (
                          <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <Star className="w-3 h-3 fill-yellow-400" />
                            {video.patientRatingAvg.toFixed(1)}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-blue-400 ml-auto">
                          <Activity className="w-3 h-3" />
                          {Math.round(relevanceScore)}% match
                        </div>
                      </div>

                      {matchedCriteria.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {matchedCriteria.slice(0, 3).map((c, i) => (
                            <span key={i} className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-all"
                      >
                        <Youtube className="w-4 h-4" />
                        Watch on YouTube
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}

                {curatedVideos.length === 0 && (
                  <div className="col-span-3 text-center py-16 text-gray-500">
                    <Youtube className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Enter a diagnosis or medications to find relevant health videos</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
